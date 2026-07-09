// One Content Studio project: the gated step-by-step flow from topic to
// critiqued script. Topic → Relevance → Research → Titles → Thumbnail →
// Outline → Script → Critique → Feedback. The user always sees which step
// they're on; each step generates, the human reacts and selects, then the
// pipeline advances. Nothing downstream runs before its inputs exist.

import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  Check,
  CheckCircle2,
  Clapperboard,
  Copy,
  Image as ImageIcon,
  Palette,
  RefreshCw,
  Sparkles,
  Star,
  Upload,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAutoStageTasks } from "@/features/tasks/autoTasks";
import {
  useAddFeedbackRule,
  useChannels,
  useContentProject,
  useCreateProduction,
  useGenerateThumbnailImage,
  useRunStudioStep,
  useSaveThumbnailVariant,
  useSubmitStudioFeedback,
  useUpdateContentProject,
  useUpdateProduction,
} from "@/hooks/queries";
import { usePersistedState } from "@/hooks/usePersistedState";
import { compressImage } from "@/lib/image";
import { withThumbnail } from "@/features/production/thumbnail";
import { cn } from "@/lib/utils";
import {
  STUDIO_STEPS,
  type FactCheckItem,
  type Production,
  type StudioStatus,
  type StudioStep,
  type ThumbnailConcept,
  type TitleVariant,
} from "@/types";
import { pendingFactChecks } from "./factChecks";
import { STEP_LABELS, WORD_RANGES } from "./personas";

const wordCount = (t?: string) => (t?.trim() ? t.trim().split(/\s+/).length : 0);

function Score({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-md border px-2 py-1 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          "font-semibold tabular-nums",
          value >= 7 ? "text-success" : value >= 5 ? "text-warning" : "text-destructive",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function KV({ k, v }: { k: string; v?: string }) {
  if (!v) return null;
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{k}</div>
      <p className="text-sm">{v}</p>
    </div>
  );
}

function ListBlock({ k, items }: { k: string; items?: string[] }) {
  if (!items?.length) return null;
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{k}</div>
      <ul className="mt-0.5 space-y-0.5 text-sm">
        {items.map((it, i) => (
          <li key={i} className="flex gap-1.5">
            <span className="text-primary">•</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FactCheckRow({
  item,
  onChange,
}: {
  item: FactCheckItem;
  onChange: (next: FactCheckItem) => void;
}) {
  const [mode, setMode] = useState<"idle" | "verify" | "waive">("idle");
  const [text, setText] = useState("");
  return (
    <div className="rounded-md border p-2.5">
      <div className="flex items-start gap-2">
        <Badge
          variant={
            item.status === "verified"
              ? "success"
              : item.status === "waived"
                ? "secondary"
                : "warning"
          }
          className="mt-0.5 shrink-0"
        >
          {item.status}
        </Badge>
        <div className="min-w-0 flex-1">
          <p className="text-sm">{item.claim}</p>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            from {item.origin}
          </p>
          {item.status === "verified" && item.sourceUrl && (
            <a
              href={item.sourceUrl.startsWith("http") ? item.sourceUrl : undefined}
              target="_blank"
              rel="noreferrer"
              className="break-all text-xs text-primary underline-offset-2 hover:underline"
            >
              {item.sourceUrl}
            </a>
          )}
          {item.status === "waived" && item.note && (
            <p className="text-xs text-muted-foreground">waived: {item.note}</p>
          )}
        </div>
      </div>
      {item.status === "pending" && mode === "idle" && (
        <div className="mt-2 flex gap-1.5">
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setMode("verify")}>
            <Check className="h-3 w-3" /> Verified
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setMode("waive")}>
            Waive
          </Button>
        </div>
      )}
      {mode !== "idle" && (
        <div className="mt-2 space-y-1.5">
          <Textarea
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              mode === "verify"
                ? "Source URL or citation (where you verified it)"
                : "Why is this OK to skip? (cut from script, framed as a question…)"
            }
            className="text-xs"
          />
          <div className="flex justify-end gap-1.5">
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setMode("idle")}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs"
              disabled={!text.trim()}
              onClick={() => {
                onChange(
                  mode === "verify"
                    ? { ...item, status: "verified", sourceUrl: text.trim() }
                    : { ...item, status: "waived", note: text.trim() },
                );
                setMode("idle");
                setText("");
              }}
            >
              Save
            </Button>
          </div>
        </div>
      )}
      {item.status !== "pending" && (
        <div className="mt-1.5 flex justify-end">
          <button
            className="text-[11px] text-muted-foreground underline-offset-2 hover:underline"
            onClick={() => onChange({ ...item, status: "pending", sourceUrl: undefined, note: undefined })}
          >
            Reopen
          </button>
        </div>
      )}
    </div>
  );
}

export function StudioProjectPage() {
  const { id = "" } = useParams();
  const { data: project, isLoading } = useContentProject(id);
  const update = useUpdateContentProject();
  const run = useRunStudioStep();
  const submitFeedback = useSubmitStudioFeedback();
  const addRule = useAddFeedbackRule();
  const genImage = useGenerateThumbnailImage();
  const saveVariant = useSaveThumbnailVariant();
  const { data: channels } = useChannels();
  const createProduction = useCreateProduction();
  const updateProduction = useUpdateProduction();
  const autoStageTasks = useAutoStageTasks();
  const navigate = useNavigate();

  const [view, setView] = useState<StudioStatus | null>(null);
  const [titleExpanded, setTitleExpanded] = useState(false);
  const [scriptDraft, setScriptDraft] = useState<string | null>(null);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [notes, setNotes, clearNotes] = usePersistedState(`draft.studio.feedback.${id}`, "");
  const uploadRef = useRef<HTMLInputElement>(null);
  const viewedId = useRef<string>();

  useEffect(() => {
    if (project && viewedId.current !== project.id) {
      viewedId.current = project.id;
      setView(project.status);
      // Restore unsaved script edits — leaving the page mid-edit (or iOS
      // killing the backgrounded PWA) must never lose work.
      try {
        const saved = localStorage.getItem(`draft.studio.script.${project.id}`);
        setScriptDraft(saved != null ? (JSON.parse(saved) as string) : null);
      } catch {
        setScriptDraft(null);
      }
    }
  }, [project]);

  // Mirror in-progress script edits to localStorage; drop the copy once the
  // draft is saved (or reverted to match the stored script).
  useEffect(() => {
    if (!project) return;
    const key = `draft.studio.script.${project.id}`;
    try {
      if (scriptDraft === null || scriptDraft === project.script) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, JSON.stringify(scriptDraft));
      }
    } catch {
      /* storage full/blocked — editing still works for this session */
    }
  }, [scriptDraft, project]);

  // The video is on the Production board from the moment work starts: if the
  // linked doc doesn't exist yet (e.g. dashboard created the project before
  // channels loaded), create it as soon as both are available.
  const ensuredDocFor = useRef<string>();
  useEffect(() => {
    if (!project || project.linkedProductionId || project.status === "done") return;
    const channelId = project.channelId ?? channels?.[0]?.id;
    if (!channelId || ensuredDocFor.current === project.id) return;
    ensuredDocFor.current = project.id;
    (async () => {
      try {
        const doc = await createProduction.mutateAsync({
          title: project.selectedTitle ?? project.topic,
          channelId,
          topic: project.topic,
        });
        await updateProduction.mutateAsync({
          id: doc.id,
          patch: { notes: `Being written in Content Studio — project: ${project.topic}` },
        });
        await update.mutateAsync({ id: project.id, patch: { linkedProductionId: doc.id } });
      } catch {
        // Non-fatal — the doc is created at the next sync milestone instead.
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project, channels]);

  if (isLoading || !project) return <Skeleton className="h-96" />;

  const current = view ?? project.status;
  const statusIdx = STUDIO_STEPS.indexOf(project.status);

  const runStep = async (step: StudioStep) => {
    try {
      await run.mutateAsync({ projectId: project.id, step });
      toast.success("Done — react to it, then continue.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const advance = (to: StudioStatus) => {
    update.mutate(
      { id: project.id, patch: { status: to } },
      { onError: (err) => toast.error(err instanceof Error ? err.message : String(err)) },
    );
    setView(to);
    // Keep the linked production doc current as milestones pass.
    if (to === "critique" || to === "feedback") void syncToProduction(false);
  };

  const RunButton = ({ step, has, label }: { step: StudioStep; has: boolean; label: string }) => (
    <Button size="sm" variant={has ? "outline" : "default"} onClick={() => runStep(step)} disabled={run.isPending}>
      {has ? <RefreshCw className={run.isPending ? "animate-spin" : ""} /> : <Wand2 className={run.isPending ? "animate-pulse" : ""} />}
      {run.isPending ? "Working…" : has ? `Re-run ${label}` : label}
    </Button>
  );

  const ContinueButton = ({ to, disabled, hint }: { to: StudioStatus; disabled?: boolean; hint?: string }) => (
    <div className="flex items-center justify-end gap-2 pt-1">
      {disabled && hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      <Button size="sm" disabled={disabled} onClick={() => advance(to)}>
        Continue to {STEP_LABELS[to]} <ArrowRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  );

  const selectTitle = (v: TitleVariant) => {
    update.mutate({ id: project.id, patch: { selectedTitle: v.title } });
    // The linked production doc follows the chosen title.
    if (project.linkedProductionId) {
      updateProduction.mutate({ id: project.linkedProductionId, patch: { title: v.title } });
    }
  };

  const selectConcept = (c: ThumbnailConcept) =>
    update.mutate({ id: project.id, patch: { selectedThumbnail: c } });

  const pendingFacts = pendingFactChecks(project);
  const setFactCheck = (next: FactCheckItem) =>
    update.mutate({
      id: project.id,
      patch: {
        factChecks: (project.factChecks ?? []).map((f) => (f.id === next.id ? next : f)),
      },
    });

  const FactCheckPanel = () =>
    (project.factChecks ?? []).length === 0 ? null : (
      <Card className={cn(pendingFacts > 0 && "border-warning/50")}>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-sm">
            <AlertTriangle className={cn("h-4 w-4", pendingFacts ? "text-warning" : "text-success")} />
            Fact checks
            <Badge variant={pendingFacts ? "warning" : "success"}>
              {pendingFacts ? `${pendingFacts} pending` : "all resolved"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Every claim below must be verified with a source or consciously waived before the
            project can finish — this channel is about living people.
          </p>
          {(project.factChecks ?? []).map((f) => (
            <FactCheckRow key={f.id} item={f} onChange={setFactCheck} />
          ))}
        </CardContent>
      </Card>
    );

  const copyText = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${what} copied`);
    } catch {
      toast.error("Clipboard blocked — long-press to copy manually");
    }
  };

  const onUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) return toast.error("Pick an image file");
    try {
      const url = await compressImage(file);
      await saveVariant.mutateAsync({
        projectId: project.id,
        variant: {
          provider: "upload",
          conceptName: project.selectedThumbnail?.conceptName ?? "Manual",
          imageUrl: url,
          pairedTitle: project.selectedTitle,
          selected: project.thumbnailVariants.length === 0,
        },
      });
      toast.success("Thumbnail saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const selectVariant = (variantId: string) =>
    update.mutate({
      id: project.id,
      patch: {
        thumbnailVariants: project.thumbnailVariants.map((v) => ({
          ...v,
          selected: v.id === variantId,
        })),
      },
    });

  /**
   * The production doc is created the moment a Studio project starts, and
   * kept in sync as steps complete. `finalize` moves it to Editing with the
   * script, title candidates, and picked thumbnail — the finished handoff.
   */
  const syncToProduction = async (finalize: boolean) => {
    const channelId = project.channelId ?? channels?.[0]?.id;
    if (!channelId) {
      if (finalize) toast.error("Add a channel first (Channels page)");
      return;
    }
    try {
      let docId = project.linkedProductionId;
      if (!docId) {
        const doc = await createProduction.mutateAsync({
          title: project.selectedTitle ?? project.topic,
          channelId,
          topic: project.topic,
        });
        docId = doc.id;
        await update.mutateAsync({ id: project.id, patch: { linkedProductionId: docId } });
      }
      const pickedThumb = project.thumbnailVariants.find((v) => v.selected)?.imageUrl;
      await updateProduction.mutateAsync({
        id: docId,
        patch: {
          title: project.selectedTitle ?? project.topic,
          ...(project.script ? { scriptBody: project.script } : {}),
          ...(project.titleLab
            ? {
                titleCandidates: (project.titleLab.strongest ?? []).map((t) => ({
                  text: t,
                  starred: t === project.selectedTitle,
                })),
              }
            : {}),
          thumbnailConcept: project.selectedThumbnail
            ? `${project.selectedThumbnail.conceptName}: ${project.selectedThumbnail.visualDescription}`
            : undefined,
          ...(pickedThumb ? { assetLinks: withThumbnail([], pickedThumb) } : {}),
          notes: finalize
            ? `Written in Content Studio — project: ${project.topic}`
            : `Being written in Content Studio — project: ${project.topic}`,
          // Script done and reviewed → the team takes over in Editing.
          ...(finalize ? { stage: "editing" as const } : {}),
        },
      });
      if (finalize) {
        toast.success("Production doc moved to Editing — script and thumbnail inside");
        void autoStageTasks(
          { title: project.selectedTitle ?? project.topic } as Production,
          "editing",
        );
      }
      return docId;
    } catch (err) {
      if (finalize) toast.error(err instanceof Error ? err.message : String(err));
      return undefined;
    }
  };

  const scriptWords = wordCount(scriptDraft ?? project.script);
  const [wLo, wHi] = WORD_RANGES[project.videoLengthMinutes];

  return (
    <div className="animate-fade-in">
      <Button variant="ghost" size="sm" className="-ml-2 mb-3" asChild>
        <Link to="/studio">
          <ArrowLeft /> Studio
        </Link>
      </Button>

      <div className="mb-3">
        <button
          className="block text-left"
          onClick={() => setTitleExpanded((v) => !v)}
          aria-expanded={titleExpanded}
        >
          <h1
            className={cn(
              "text-lg font-semibold leading-snug",
              !titleExpanded && "line-clamp-2",
            )}
          >
            {project.selectedTitle ?? project.topic}
          </h1>
          {!titleExpanded && (project.selectedTitle ?? project.topic).length > 90 && (
            <span className="text-xs text-muted-foreground">tap to expand</span>
          )}
        </button>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <Badge variant="outline">{project.videoLengthMinutes} min</Badge>
          {project.primaryPersona && <Badge variant="secondary">{project.primaryPersona}</Badge>}
          {project.secondaryPersona && (
            <Badge variant="secondary" className="opacity-70">
              + {project.secondaryPersona}
            </Badge>
          )}
          {project.relevance && (
            <Badge variant={project.relevance.score >= 7 ? "success" : project.relevance.score >= 5 ? "warning" : "destructive"}>
              relevance {project.relevance.score}/10
            </Badge>
          )}
          {pendingFacts > 0 && (
            <Badge variant="warning">{pendingFacts} fact-check{pendingFacts > 1 ? "s" : ""}</Badge>
          )}
        </div>
      </div>

      {/* Step chips — always visible; tap any reached step to review it. */}
      <div className="mb-4 flex items-center gap-1 overflow-x-auto pb-1" data-overflow-ok>
        {STUDIO_STEPS.map((step, i) => {
          const reachable = i <= statusIdx;
          const isCurrent = step === current;
          return (
            <button
              key={step}
              disabled={!reachable}
              onClick={() => setView(step)}
              className={cn(
                "flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                isCurrent
                  ? "border-primary bg-primary/15 text-primary"
                  : i < statusIdx || project.status === "done"
                    ? "border-transparent bg-muted text-muted-foreground"
                    : "border-border text-muted-foreground",
                !reachable && "opacity-40",
              )}
            >
              {i < statusIdx && <CheckCircle2 className="h-3 w-3 text-success" />}
              {STEP_LABELS[step]}
            </button>
          );
        })}
      </div>

      {/* Visible progress while any step generates — the runs take a while. */}
      {run.isPending && (
        <Card className="mb-4 border-primary/30">
          <CardContent className="space-y-2.5 p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Wand2 className="h-4 w-4 animate-pulse text-primary" />
              Generating {STEP_LABELS[current]?.toLowerCase()}…
            </div>
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
          </CardContent>
        </Card>
      )}

      {/* ------------------------------------------------ Relevance */}
      {current === "relevance" && (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Relevance gate</CardTitle>
            <RunButton step="relevance" has={!!project.relevance} label="Check relevance" />
          </CardHeader>
          <CardContent className="space-y-3">
            {!project.relevance ? (
              <p className="text-sm text-muted-foreground">
                Before anything is generated, the gate judges whether this topic can carry a
                Modern Ambition documentary — and how.
              </p>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge
                    variant={
                      project.relevance.relevant === "yes"
                        ? "success"
                        : project.relevance.relevant === "maybe"
                          ? "warning"
                          : "destructive"
                    }
                  >
                    {project.relevance.relevant}
                  </Badge>
                  <Badge variant="outline">score {project.relevance.score}/10</Badge>
                  <Badge variant="secondary">{project.relevance.bestPersona}</Badge>
                  <Badge variant="outline">{project.relevance.recommendedLengthMinutes} min recommended</Badge>
                </div>
                {project.relevance.relevant !== "yes" && (
                  <div className="flex items-start gap-2 rounded-md border border-warning/50 bg-warning/5 p-2.5 text-sm">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                    <span>{project.relevance.weakness}</span>
                  </div>
                )}
                <KV k="Video promise" v={project.relevance.videoPromise} />
                <KV k="Why this viewer cares" v={project.relevance.whyViewerCares} />
                <div className="grid gap-3 sm:grid-cols-3">
                  <KV k="Emotional hook" v={project.relevance.emotionalHook} />
                  <KV k="Business hook" v={project.relevance.businessHook} />
                  <KV k="Psychology hook" v={project.relevance.psychologyHook} />
                </div>
                {project.relevance.relevant === "yes" && <KV k="Weakness" v={project.relevance.weakness} />}
                <KV k="How to make it more clickable" v={project.relevance.clickabilityFix} />
                <ContinueButton to="research" disabled={!project.relevance} />
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* ------------------------------------------------ Research */}
      {current === "research" && (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Research packet</CardTitle>
            <RunButton step="research" has={!!project.research} label="Build packet" />
          </CardHeader>
          <CardContent className="space-y-3">
            {!project.research ? (
              <p className="text-sm text-muted-foreground">
                Structure before writing: timeline, conflicts, turning points, contexts — with
                anything unverified flagged for human fact-checking.
              </p>
            ) : (
              <>
                {project.research.unverifiedClaims.length > 0 && (
                  <div className="flex items-start gap-2 rounded-md border border-warning/50 bg-warning/5 p-2.5 text-sm">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                    <div>
                      <span className="font-medium">Needs human fact-checking:</span>
                      <ul className="mt-1 list-disc pl-4">
                        {project.research.unverifiedClaims.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
                <KV k="Main subject" v={project.research.mainSubject} />
                <ListBlock k="Timeline" items={project.research.timeline} />
                <ListBlock k="Key events" items={project.research.keyEvents} />
                <ListBlock k="Key conflicts" items={project.research.keyConflicts} />
                <ListBlock k="Turning points" items={project.research.turningPoints} />
                <div className="grid gap-3 sm:grid-cols-3">
                  <KV k="Business context" v={project.research.businessContext} />
                  <KV k="Psychological context" v={project.research.psychologicalContext} />
                  <KV k="Cultural context" v={project.research.culturalContext} />
                </div>
                <ListBlock k="Controversies / risks" items={project.research.controversies} />
                <KV k="Best angle" v={project.research.bestAngle} />
                <KV k="Emotional question" v={project.research.emotionalQuestion} />
                <KV k="Ending idea" v={project.research.endingIdea} />
                <FactCheckPanel />
                <ContinueButton to="titles" />
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* ------------------------------------------------ Title Lab */}
      {current === "titles" && (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Title Lab</CardTitle>
            <RunButton step="titles" has={!!project.titleLab} label="Generate titles" />
          </CardHeader>
          <CardContent className="space-y-3">
            {!project.titleLab ? (
              <p className="text-sm text-muted-foreground">
                20 scored options across 5 angles. Pick the one the whole video must pay off.
              </p>
            ) : (
              <>
                <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
                  <div className="text-[11px] font-medium uppercase tracking-wide text-primary">Recommended</div>
                  <p className="text-sm font-medium">{project.titleLab.recommended}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{project.titleLab.whyRecommended}</p>
                </div>
                <div className="space-y-1.5">
                  {[...project.titleLab.variants]
                    .sort(
                      (a, b) =>
                        b.curiosityScore + b.clickPotentialScore + b.specificityScore -
                        (a.curiosityScore + a.clickPotentialScore + a.specificityScore),
                    )
                    .map((v, i) => {
                      const selected = project.selectedTitle === v.title;
                      return (
                        <button
                          key={i}
                          onClick={() => selectTitle(v)}
                          className={cn(
                            "block w-full rounded-md border p-2.5 text-left transition-colors",
                            selected ? "border-primary bg-primary/10" : "hover:bg-muted",
                          )}
                        >
                          <div className="flex items-start gap-2">
                            <Star
                              className={cn(
                                "mt-0.5 h-3.5 w-3.5 shrink-0",
                                selected ? "fill-warning text-warning" : "text-muted-foreground/40",
                              )}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium">{v.title}</p>
                              <div className="mt-1 flex flex-wrap gap-1 text-[10px] text-muted-foreground">
                                <Badge variant="outline" className="text-[10px]">{v.angle}</Badge>
                                <span>curiosity {v.curiosityScore}</span>
                                <span>· clarity {v.clarityScore}</span>
                                <span>· emotion {v.emotionScore}</span>
                                <span>· specificity {v.specificityScore}</span>
                                <span>· click {v.clickPotentialScore}</span>
                              </div>
                              {selected && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {v.reasoning} — thumbnail: {v.thumbnailMatch}
                                </p>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                </div>
                <ContinueButton
                  to="thumbnail"
                  disabled={!project.selectedTitle}
                  hint="Pick a title first"
                />
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* ------------------------------------------------ Thumbnail Studio */}
      {current === "thumbnail" && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Thumbnail Studio</CardTitle>
              <RunButton step="thumbnails" has={!!project.thumbnailLab} label="Generate concepts" />
            </CardHeader>
            <CardContent className="space-y-3">
              {!project.thumbnailLab ? (
                <p className="text-sm text-muted-foreground">
                  5 concepts that pay off “{project.selectedTitle}” — each with Gemini and Canva
                  prompts. Emotionally clear in under one second, premium, never misleading.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {project.thumbnailLab.concepts.map((c) => {
                    const selected = project.selectedThumbnail?.conceptName === c.conceptName;
                    const recommended = project.thumbnailLab!.recommendedConcept === c.conceptName;
                    return (
                      <div
                        key={c.conceptName}
                        className={cn(
                          "rounded-md border p-3",
                          selected && "border-primary bg-primary/5",
                        )}
                      >
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-sm font-medium">{c.conceptName}</span>
                          {recommended && <Badge variant="success">recommended</Badge>}
                          <Badge variant="outline">mobile {c.mobileReadabilityScore}/10</Badge>
                          <Badge variant="outline">relevance {c.relevanceScore}/10</Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{c.visualDescription}</p>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {c.textOverlayOptions.map((t) => (
                            <Badge key={t} variant="secondary" className="text-[10px]">
                              “{t}”
                            </Badge>
                          ))}
                        </div>
                        <p className="mt-1.5 text-xs text-muted-foreground">
                          <span className="font-medium">Why it works:</span> {c.whyItWorks}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium">Don't:</span> {c.shouldNot}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <Button
                            size="sm"
                            variant={selected ? "default" : "outline"}
                            className="h-7 text-xs"
                            onClick={() => selectConcept(c)}
                          >
                            <Check className="h-3 w-3" /> {selected ? "Selected" : "Select"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            disabled={genImage.isPending}
                            onClick={() =>
                              genImage.mutate(
                                { projectId: project.id, conceptName: c.conceptName },
                                {
                                  onSuccess: () => toast.success("Image generated and saved below"),
                                  onError: (err) =>
                                    toast.error(err instanceof Error ? err.message : String(err)),
                                },
                              )
                            }
                          >
                            <Sparkles className={cn("h-3 w-3", genImage.isPending && "animate-pulse")} />
                            {genImage.isPending ? "Generating…" : "Generate (Gemini)"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => {
                              copyText(c.providerPromptCanva, "Canva brief");
                              window.open("https://www.canva.com/create/youtube-thumbnails/", "_blank", "noopener");
                            }}
                          >
                            <Palette className="h-3 w-3" /> Canva
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => {
                              // Midjourney has no official API — this is the
                              // sanctioned path: MJ-formatted prompt + their
                              // imagine page; the result comes back via Upload.
                              copyText(
                                `${c.providerPromptGemini} --ar 16:9 --style raw`,
                                "Midjourney prompt",
                              );
                              window.open("https://www.midjourney.com/imagine", "_blank", "noopener");
                            }}
                          >
                            <ImageIcon className="h-3 w-3" /> Midjourney
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() => copyText(c.providerPromptGemini, "Image prompt")}
                          >
                            <Copy className="h-3 w-3" /> Copy prompt
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Saved variants + manual upload */}
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm">Saved thumbnails</CardTitle>
              <Button size="sm" variant="outline" onClick={() => uploadRef.current?.click()}>
                <Upload /> Upload
              </Button>
            </CardHeader>
            <CardContent>
              {project.thumbnailVariants.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Generated images, Canva exports, and uploads collect here — tap one to make it
                  the pick for this video.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {project.thumbnailVariants.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => selectVariant(v.id)}
                      className={cn(
                        "relative overflow-hidden rounded-md border text-left",
                        v.selected && "ring-2 ring-primary",
                      )}
                    >
                      {v.imageUrl ? (
                        <img src={v.imageUrl} alt={v.conceptName} className="aspect-video w-full object-cover" />
                      ) : (
                        <div className="flex aspect-video items-center justify-center bg-muted">
                          <ImageIcon className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="p-1.5 text-[10px] text-muted-foreground">
                        {v.provider} · {v.conceptName}
                        {v.selected && <Badge variant="success" className="ml-1 text-[9px]">pick</Badge>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              <input
                ref={uploadRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onUpload(f);
                  e.target.value = "";
                }}
              />
            </CardContent>
          </Card>

          <ContinueButton
            to="outline"
            disabled={!project.selectedThumbnail}
            hint="Select a concept first"
          />
        </div>
      )}

      {/* ------------------------------------------------ Outline */}
      {current === "outline" && (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Outline — {project.videoLengthMinutes} min</CardTitle>
            <RunButton step="outline" has={!!project.outline} label="Build outline" />
          </CardHeader>
          <CardContent className="space-y-3">
            {!project.outline ? (
              <p className="text-sm text-muted-foreground">
                Timestamped emotional arc: cold open → promise → rise → pressure → turning point →
                cost → meaning → final line.
              </p>
            ) : (
              <>
                {project.outline.map((s, i) => (
                  <div key={i} className="rounded-md border p-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="tabular-nums">{s.timestamp}</Badge>
                      <span className="text-sm font-medium">{s.title}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{s.purpose}</p>
                    <ListBlock k="Beats" items={s.beats} />
                    <div className="mt-1.5 grid gap-2 text-xs sm:grid-cols-2">
                      <div>
                        <span className="font-medium">Emotional job:</span>{" "}
                        <span className="text-muted-foreground">{s.emotionalJob}</span>
                      </div>
                      <div>
                        <span className="font-medium">Retention device:</span>{" "}
                        <span className="text-muted-foreground">{s.retentionDevice}</span>
                      </div>
                      <div>
                        <span className="font-medium">B-roll:</span>{" "}
                        <span className="text-muted-foreground">{s.brollIdeas.join("; ")}</span>
                      </div>
                      <div>
                        <span className="font-medium">Transition:</span>{" "}
                        <span className="text-muted-foreground">{s.transition}</span>
                      </div>
                    </div>
                  </div>
                ))}
                <ContinueButton to="script" />
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* ------------------------------------------------ Script */}
      {current === "script" && (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Script</CardTitle>
              <p
                className={cn(
                  "mt-0.5 text-xs tabular-nums",
                  scriptWords >= wLo && scriptWords <= wHi ? "text-success" : "text-muted-foreground",
                )}
              >
                {scriptWords} words · target {wLo}–{wHi}
                {scriptWords > 0 && <> · ≈{Math.round(scriptWords / 150)} min spoken</>}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              {project.script && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyText(scriptDraft ?? project.script ?? "", "Script")}
                >
                  <Copy /> Copy
                </Button>
              )}
              <RunButton step="script" has={!!project.script} label="Write script" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {!project.script ? (
              <p className="text-sm text-muted-foreground">
                Written for voiceover, section by section from the approved outline. Uncertain
                claims arrive marked [FACT-CHECK].
              </p>
            ) : (
              <>
                {(scriptDraft ?? project.script).includes("[FACT-CHECK") && (
                  <div className="flex items-start gap-2 rounded-md border border-warning/50 bg-warning/5 p-2.5 text-sm">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                    This script contains [FACT-CHECK] marks — verify each before recording.
                  </div>
                )}
                <Textarea
                  rows={22}
                  className="font-mono text-xs leading-relaxed"
                  value={scriptDraft ?? project.script}
                  onChange={(e) => setScriptDraft(e.target.value)}
                />
                {scriptDraft !== null && scriptDraft !== project.script && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      update.mutate(
                        { id: project.id, patch: { script: scriptDraft } },
                        { onSuccess: () => toast.success("Script saved") },
                      )
                    }
                  >
                    Save edits
                  </Button>
                )}
                <FactCheckPanel />
                <ContinueButton to="critique" />
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* ------------------------------------------------ Critique */}
      {current === "critique" && (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Critique</CardTitle>
            <RunButton step="critique" has={!!project.critique} label="Critique script" />
          </CardHeader>
          <CardContent className="space-y-3">
            {!project.critique ? (
              <p className="text-sm text-muted-foreground">
                A ruthless retention editor scores the script and points at exactly what to fix.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                  {Object.entries(project.critique.scores).map(([k, v]) => (
                    <Score key={k} label={k.replace(/([A-Z])/g, " $1").toLowerCase()} value={v} />
                  ))}
                </div>
                {project.critique.warnings.length > 0 && (
                  <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-2.5 text-sm">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                    <ul className="space-y-0.5">
                      {project.critique.warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <ListBlock k="Where it gets boring" items={project.critique.boringSections} />
                <ListBlock k="Click-off risks" items={project.critique.clickOffRisks} />
                <ListBlock k="Needs more tension" items={project.critique.needsMoreTension} />
                <ListBlock k="Generic lines" items={project.critique.genericLines} />
                <ListBlock k="Too essay-like" items={project.critique.essayLikeParts} />
                <ListBlock k="Cut" items={project.critique.cut} />
                <ListBlock k="Expand" items={project.critique.expand} />
                <ListBlock k="Fact-check" items={project.critique.factCheck} />
                {project.critique.proposedRules.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Proposed Script Bible rules
                    </div>
                    {project.critique.proposedRules.map((r, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-md border p-2">
                        <Badge variant="outline">{r.category}</Badge>
                        <span className="min-w-0 flex-1 text-sm">{r.rule}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 shrink-0 text-xs"
                          onClick={() =>
                            addRule.mutate(
                              { category: r.category, rule: r.rule, sourceFeedback: "critique" },
                              { onSuccess: () => toast.success("Added to the Script Bible") },
                            )
                          }
                        >
                          <BookOpenText className="h-3 w-3" /> Add
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <FactCheckPanel />
                <ContinueButton to="feedback" />
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* ------------------------------------------------ Feedback */}
      {current === "feedback" && (
        <Card>
          <CardHeader>
            <CardTitle>Your verdict</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FactCheckPanel />
            <p className="text-sm text-muted-foreground">
              Rate the parts, then say what bothered you in plain words — every note becomes a
              reusable rule the next script must follow.
            </p>
            {(["title", "script", "thumbnail", "hook", "ending", "idea"] as const).map((k) => (
              <div key={k} className="space-y-1">
                <Label className="capitalize">{k}</Label>
                <div className="flex gap-1">
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      onClick={() => setRatings({ ...ratings, [k]: n })}
                      className={cn(
                        "h-7 flex-1 rounded border text-xs tabular-nums transition-colors",
                        (ratings[k] ?? 0) >= n
                          ? n >= 7
                            ? "border-success/50 bg-success/15 text-success"
                            : n >= 5
                              ? "border-warning/50 bg-warning/15 text-warning"
                              : "border-destructive/50 bg-destructive/15 text-destructive"
                          : "text-muted-foreground hover:bg-muted",
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className="space-y-1.5">
              <Label>Notes (one thought per line)</Label>
              <Textarea
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={"Too generic in the middle\nHook could be more cinematic\nTitle overpromises slightly"}
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              {pendingFacts > 0 && (
                <span className="text-xs text-warning">
                  Resolve {pendingFacts} fact-check{pendingFacts > 1 ? "s" : ""} first
                </span>
              )}
              <Button
                disabled={submitFeedback.isPending || pendingFacts > 0}
                onClick={() =>
                  submitFeedback.mutate(
                    { projectId: project.id, feedback: { ratings, notes } },
                    {
                      onSuccess: ({ rules }) => {
                        clearNotes();
                        toast.success(
                          rules.length
                            ? `Project finished — ${rules.length} new rule${rules.length > 1 ? "s" : ""} added to the Script Bible`
                            : "Project finished",
                        );
                        setView("done");
                        void syncToProduction(true);
                      },
                      onError: (err) =>
                        toast.error(err instanceof Error ? err.message : String(err)),
                    },
                  )
                }
              >
                {submitFeedback.isPending ? "Distilling rules…" : "Finish project"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ------------------------------------------------ Done */}
      {current === "done" && (
        <Card>
          <CardContent className="space-y-3 pt-6">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CheckCircle2 className="h-4 w-4 text-success" /> Project complete
            </div>
            <p className="text-sm text-muted-foreground">
              “{project.selectedTitle ?? project.topic}” — {project.videoLengthMinutes} min,{" "}
              {wordCount(project.script)} words. Feedback distilled into the Script Bible; the
              next script starts smarter.
            </p>
            {project.linkedProductionId ? (
              <Button size="sm" variant="outline" asChild>
                <Link to={`/production/${project.linkedProductionId}`}>
                  <Clapperboard /> Open production doc (in Editing)
                </Link>
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={async () => {
                  const docId = await syncToProduction(true);
                  if (docId) navigate(`/production/${docId}`);
                }}
                disabled={createProduction.isPending}
              >
                <Clapperboard /> Send to Production board
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ImageIcon,
  Palette,
  Plus,
  Sparkles,
  Star,
  Trash2,
  Upload,
  Wand2,
  X,
  Youtube,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CommentsThread } from "@/components/CommentsThread";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  useChannels,
  useDraftProduction,
  useMe,
  useMembers,
  useProduction,
  useDeleteProduction,
  usePublishProduction,
  usePublishToYouTube,
  useSops,
  useUpdateProduction,
  useVideo,
} from "@/hooks/queries";
import { useRecordRecent } from "@/hooks/useRecents";
import { compactNumber, humanize, percent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { compressImage } from "@/lib/image";
import { getThumbnail, visibleAssetLinks, withThumbnail } from "./thumbnail";
import {
  PRODUCTION_STAGES,
  type Production,
  type ProductionPatch,
  type ProductionStage,
} from "@/types";
import { critique, estimatedRuntime, sopForStage, wordCount } from "./draft";

const STAGE_LABELS: Record<ProductionStage, string> = {
  scripting: "Scripting",
  editing: "Editing",
  packaging: "Packaging",
  scheduled: "Scheduled",
  published: "Published",
};

const VO_STATUSES = ["not_started", "generated", "recorded", "final"];

function GoalScore({ production }: { production: Production }) {
  const { data: video } = useVideo(production.linkedVideoId ?? "");
  if (!production.linkedVideoId || !production.goalMetric || production.goalTarget == null) {
    return null;
  }
  const metrics = video?.metrics;
  const actual =
    production.goalMetric === "ctr" ? metrics?.ctr
    : production.goalMetric === "views" ? metrics?.views
    : production.goalMetric === "avg_percent_viewed" ? metrics?.avgPercentViewed
    : undefined;
  if (actual == null) {
    return (
      <Badge variant="secondary">Goal: waiting for metrics</Badge>
    );
  }
  const met = actual >= production.goalTarget;
  const fmt = (x: number) =>
    production.goalMetric === "views" ? compactNumber(x) : percent(x);
  return (
    <Badge variant={met ? "success" : "warning"}>
      Goal {met ? "met" : "behind"}: {fmt(actual)} vs {fmt(production.goalTarget)}
    </Badge>
  );
}

export function ProductionDetailPage() {
  const { id = "" } = useParams();
  const { data: production, isLoading } = useProduction(id);
  const { data: channels } = useChannels();
  const { data: members } = useMembers();
  const { data: me } = useMe();
  const { data: sops } = useSops();
  const updateProduction = useUpdateProduction();
  const publishProduction = usePublishProduction();
  const deleteProduction = useDeleteProduction();
  const navigate = useNavigate();

  const removeDoc = () => {
    if (!form) return;
    if (!window.confirm(`Delete "${form.title}"? The doc and its checklists are gone for good.`))
      return;
    deleteProduction.mutate(form.id, {
      onSuccess: () => {
        toast.success("Video doc deleted");
        navigate("/production");
      },
      onError: (err) => toast.error(err instanceof Error ? err.message : String(err)),
    });
  };
  const publishToYouTube = usePublishToYouTube();
  const draftProduction = useDraftProduction();

  const [form, setForm] = useState<Production | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimer = useRef<number>();
  const loadedId = useRef<string>();
  const thumbFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (production && production.id !== loadedId.current) {
      loadedId.current = production.id;
      setForm(production);
    }
  }, [production]);

  useRecordRecent(
    production ? { to: `/production/${production.id}`, label: production.title, kind: "video" } : null,
  );

  const myRole = members?.find((m) => m.id === me?.id)?.role;
  const canPost = myRole === "owner" || myRole === "admin";

  if (isLoading || !form) return <Skeleton className="h-96" />;
  if (!production) {
    return <div className="py-20 text-center text-muted-foreground">Video doc not found.</div>;
  }

  const patch = (changes: ProductionPatch) => {
    const next = { ...form, ...changes } as Production;
    setForm(next);
    setSaveState("saving");
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      try {
        await updateProduction.mutateAsync({ id: form.id, patch: changes });
        setSaveState("saved");
      } catch (err) {
        setSaveState("idle");
        toast.error(err instanceof Error ? err.message : String(err));
      }
    }, 800);
  };

  const setStage = async (stage: ProductionStage) => {
    if (stage === form.stage) return;
    if ((stage === "scheduled" || stage === "published") && !canPost) {
      toast.error("Only the owner or an admin can post — ask them to move it.");
      return;
    }
    if (stage === "published") {
      try {
        await publishProduction.mutateAsync(form.id);
        setForm({ ...form, stage: "published" });
        toast.success("Published — a video record was created; metrics will land there.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : String(err));
      }
      return;
    }
    patch({ stage });
  };

  const publishYouTube = async () => {
    try {
      const { videoUrl, simulated } = await publishToYouTube.mutateAsync(form.id);
      setForm({ ...form, stage: "published" });
      toast.success(
        simulated
          ? "Published (demo) — a tracked video was created and it's in the Vault. Connect YouTube to post for real."
          : "Uploaded to YouTube and published — now tracked in the Vault.",
      );
      window.open(videoUrl, "_blank", "noopener");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const runDraft = async () => {
    try {
      const draft = await draftProduction.mutateAsync(form);
      patch({
        hookText: form.hookText?.trim() ? form.hookText : draft.hookText,
        scriptBody: form.scriptBody?.trim() ? form.scriptBody : draft.scriptBody,
        description: form.description?.trim() ? form.description : draft.description,
        titleCandidates: form.titleCandidates.length ? form.titleCandidates : draft.titleCandidates,
      });
      toast.success("Draft laid in — it only filled empty fields. Now make it yours.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const findings = critique(form);
  const runtime = estimatedRuntime(form);
  const stageSop = sopForStage(form.stage, sops ?? []);
  const stageChecks = form.checklists[form.stage] ?? [];
  const channel = channels?.find((c) => c.id === form.channelId);

  const thumb = getThumbnail(form);
  const setThumbnail = (url: string | undefined) =>
    patch({ assetLinks: withThumbnail(visibleAssetLinks(form), url) });

  const onThumbFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Pick an image file for the thumbnail.");
      return;
    }
    try {
      setThumbnail(await compressImage(file));
      toast.success("Thumbnail attached");
    } catch {
      toast.error("Couldn't process that image.");
    }
  };

  const designInCanva = async () => {
    try {
      if (form.thumbnailConcept?.trim()) {
        await navigator.clipboard.writeText(form.thumbnailConcept);
        toast.success("Concept copied — paste it into Canva");
      }
    } catch {
      /* clipboard may be blocked; opening Canva is the main action */
    }
    window.open("https://www.canva.com/create/youtube-thumbnails/", "_blank", "noopener");
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" className="-ml-2 mb-3" asChild>
          <Link to="/production">
            <ArrowLeft /> Production
          </Link>
        </Button>
        <span className="text-xs text-muted-foreground">
          {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : ""}
        </span>
      </div>

      <PageHeader
        title={form.title}
        description={`${channel?.name ?? ""}${form.topic ? ` · ${form.topic}` : ""}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <GoalScore production={form} />
            {canPost && form.stage !== "published" && (
              <Button size="sm" onClick={publishYouTube} disabled={publishToYouTube.isPending}>
                <Youtube className={publishToYouTube.isPending ? "animate-pulse" : ""} />
                {publishToYouTube.isPending ? "Publishing…" : "Publish to YouTube"}
              </Button>
            )}
            <Select value={form.stage} onValueChange={(v) => setStage(v as ProductionStage)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRODUCTION_STAGES.map((stage) => {
                  const gated = (stage === "scheduled" || stage === "published") && !canPost;
                  return (
                    <SelectItem key={stage} value={stage} disabled={gated}>
                      {STAGE_LABELS[stage]}
                      {gated ? " (owner only)" : ""}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <Button
              size="icon"
              variant="ghost"
              className="text-muted-foreground hover:text-destructive"
              onClick={removeDoc}
              aria-label="Delete video doc"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* Main doc */}
        <div className="space-y-4">
          <Card>
            <CardContent className="grid gap-3 p-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Working title</Label>
                <Input value={form.title} onChange={(e) => patch({ title: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Topic</Label>
                <Input
                  value={form.topic ?? ""}
                  onChange={(e) => patch({ topic: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Assigned to</Label>
                <Select
                  value={form.assigneeId ?? ""}
                  onValueChange={(v) => patch({ assigneeId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    {(members ?? []).map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label>Due date</Label>
                  <Input
                    type="date"
                    value={form.dueDate ?? ""}
                    onChange={(e) => patch({ dueDate: e.target.value || undefined })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Publish at</Label>
                  <Input
                    type="datetime-local"
                    value={form.scheduledAt ? form.scheduledAt.slice(0, 16) : ""}
                    onChange={(e) =>
                      patch({
                        scheduledAt: e.target.value
                          ? new Date(e.target.value).toISOString()
                          : undefined,
                      })
                    }
                  />
                </div>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Goal of video</Label>
                <div className="grid grid-cols-[1fr_150px_110px] gap-2">
                  <Input
                    value={form.goal ?? ""}
                    onChange={(e) => patch({ goal: e.target.value })}
                    placeholder='e.g. "Beat channel CTR baseline"'
                  />
                  <Select
                    value={form.goalMetric ?? ""}
                    onValueChange={(v) => patch({ goalMetric: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Metric" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ctr">CTR %</SelectItem>
                      <SelectItem value="views">Views</SelectItem>
                      <SelectItem value="avg_percent_viewed">% viewed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    value={form.goalTarget ?? ""}
                    onChange={(e) =>
                      patch({ goalTarget: e.target.value ? +e.target.value : undefined })
                    }
                    placeholder="Target"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  With a metric + target set, this doc gets auto-scored against real metrics
                  after publish.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Script</CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-xs tabular-nums text-muted-foreground">
                  {wordCount(form.hookText) + wordCount(form.scriptBody) + wordCount(form.scriptOutro)}{" "}
                  words ≈ {Math.floor(runtime / 60)}:{String(runtime % 60).padStart(2, "0")}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={runDraft}
                  disabled={draftProduction.isPending}
                >
                  <Wand2 className={draftProduction.isPending ? "animate-pulse" : ""} />
                  {draftProduction.isPending ? "Drafting…" : "AI draft"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>
                  Hook (first 30 seconds) —{" "}
                  <span className="font-normal text-muted-foreground">
                    {wordCount(form.hookText)} words
                  </span>
                </Label>
                <Textarea
                  rows={4}
                  value={form.hookText ?? ""}
                  onChange={(e) => patch({ hookText: e.target.value })}
                  placeholder="Drop the viewer into one concrete scene, mid-action…"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Body</Label>
                <Textarea
                  rows={10}
                  value={form.scriptBody ?? ""}
                  onChange={(e) => patch({ scriptBody: e.target.value })}
                  placeholder="Acts, beats, the full script…"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Outro</Label>
                <Textarea
                  rows={3}
                  value={form.scriptOutro ?? ""}
                  onChange={(e) => patch({ scriptOutro: e.target.value })}
                  placeholder="Resolve the open question; one CTA, made once."
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Packaging</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Title candidates — star the finalist</Label>
                {form.titleCandidates.map((candidate, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        patch({
                          titleCandidates: form.titleCandidates.map((t, j) => ({
                            ...t,
                            starred: j === i ? !t.starred : false,
                          })),
                        })
                      }
                      aria-label={candidate.starred ? "Unstar" : "Star as finalist"}
                      className="shrink-0"
                    >
                      <Star
                        className={cn(
                          "h-4 w-4 text-muted-foreground/50 transition-colors hover:text-warning",
                          candidate.starred && "fill-warning text-warning",
                        )}
                      />
                    </button>
                    <Input
                      value={candidate.text}
                      className={cn(candidate.text.length > 55 && "border-destructive")}
                      onChange={(e) =>
                        patch({
                          titleCandidates: form.titleCandidates.map((t, j) =>
                            j === i ? { ...t, text: e.target.value } : t,
                          ),
                        })
                      }
                    />
                    <span
                      className={cn(
                        "w-8 shrink-0 text-right text-xs tabular-nums",
                        candidate.text.length > 55 ? "text-destructive" : "text-muted-foreground",
                      )}
                    >
                      {candidate.text.length}
                    </span>
                    <button
                      onClick={() =>
                        patch({
                          titleCandidates: form.titleCandidates.filter((_, j) => j !== i),
                        })
                      }
                      aria-label="Remove candidate"
                      className="shrink-0 text-muted-foreground/50 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    patch({
                      titleCandidates: [...form.titleCandidates, { text: "", starred: false }],
                    })
                  }
                >
                  <Plus /> Add title option
                </Button>
              </div>

              <div className="space-y-1.5">
                <Label>Thumbnail concept</Label>
                <Textarea
                  rows={2}
                  value={form.thumbnailConcept ?? ""}
                  onChange={(e) => patch({ thumbnailConcept: e.target.value })}
                  placeholder="One focal element, max 3 visual elements, ≤4 words of copy…"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Thumbnail image</Label>
                <div className="flex flex-wrap items-center gap-2">
                  {thumb ? (
                    <div className="relative">
                      <img
                        src={thumb}
                        alt="Thumbnail"
                        className="h-20 w-36 rounded-md border object-cover"
                      />
                      <button
                        onClick={() => setThumbnail(undefined)}
                        aria-label="Remove thumbnail"
                        className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full border bg-card shadow-sm hover:bg-accent"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => thumbFileRef.current?.click()}
                      className="flex h-20 w-36 flex-col items-center justify-center gap-1 rounded-md border border-dashed text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                    >
                      <ImageIcon className="h-4 w-4" />
                      Upload image
                    </button>
                  )}
                  <div className="flex flex-col gap-2">
                    <Button variant="outline" size="sm" onClick={() => thumbFileRef.current?.click()}>
                      <Upload /> {thumb ? "Replace" : "Upload"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={designInCanva}>
                      <Palette /> Design in Canva
                    </Button>
                  </div>
                  <input
                    ref={thumbFileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) onThumbFile(f);
                      e.target.value = "";
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Upload the finished thumbnail (auto-shrunk to keep it light), or design it in
                  Canva — the concept above is copied for you. Heavy raw files go in Assets as
                  Drive links.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>YouTube description</Label>
                <Textarea
                  rows={5}
                  value={form.description ?? ""}
                  onChange={(e) => patch({ description: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Assets & references</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Voiceover status</Label>
                  <Select
                    value={form.voStatus ?? "not_started"}
                    onValueChange={(v) => patch({ voStatus: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VO_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {humanize(s)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Reference links (one per line)</Label>
                  <Textarea
                    rows={2}
                    value={form.referenceLinks.join("\n")}
                    onChange={(e) =>
                      patch({
                        referenceLinks: e.target.value
                          .split("\n")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                    placeholder="Research, competitor videos, sources…"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Asset links — Drive, etc. (label | url, one per line)</Label>
                <Textarea
                  rows={2}
                  value={visibleAssetLinks(form).map((a) => `${a.label} | ${a.url}`).join("\n")}
                  onChange={(e) =>
                    patch({
                      assetLinks: withThumbnail(
                        e.target.value
                          .split("\n")
                          .map((line) => {
                            const [label, ...rest] = line.split("|");
                            const url = rest.join("|").trim();
                            return label?.trim() && url
                              ? { label: label.trim(), url }
                              : null;
                          })
                          .filter((x): x is { label: string; url: string } => !!x),
                        thumb,
                      ),
                    })
                  }
                  placeholder={"VO master | https://drive…\nRaw footage | https://drive…"}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea
                  rows={3}
                  value={form.notes ?? ""}
                  onChange={(e) => patch({ notes: e.target.value })}
                  placeholder="What are we betting on with this one?"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Side rail: stage SOP checklist + AI critique */}
        <div className="space-y-4">
          {stageSop && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  {STAGE_LABELS[form.stage]} checklist — {stageSop.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(stageSop.currentVersion?.steps ?? []).map((step, i) => {
                  const checked = stageChecks[i] ?? false;
                  return (
                    <button
                      key={i}
                      onClick={() => {
                        const steps = stageSop.currentVersion?.steps ?? [];
                        const next = steps.map((_, j) => (j === i ? !checked : stageChecks[j] ?? false));
                        patch({ checklists: { ...form.checklists, [form.stage]: next } });
                      }}
                      className="flex w-full items-start gap-2 text-left text-sm"
                    >
                      <CheckCircle2
                        className={cn(
                          "mt-0.5 h-4 w-4 shrink-0",
                          checked ? "text-success" : "text-muted-foreground/40",
                        )}
                      />
                      <span className={cn(checked && "text-muted-foreground line-through")}>
                        {step}
                      </span>
                    </button>
                  );
                })}
                <Link
                  to={`/sops/${stageSop.id}`}
                  className="block pt-1 text-xs text-muted-foreground underline-offset-2 hover:underline"
                >
                  Open the full SOP →
                </Link>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4 text-muted-foreground" /> AI check
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {findings.map((finding, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  {finding.severity === "warn" ? (
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                  ) : (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  )}
                  <span className="text-muted-foreground">{finding.message}</span>
                </div>
              ))}
              <p className="pt-1 text-xs text-muted-foreground">
                Checks run against your own SOPs. They update as you type.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <CommentsThread entityType="production" entityId={form.id} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

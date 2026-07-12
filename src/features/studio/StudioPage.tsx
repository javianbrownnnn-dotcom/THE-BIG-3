// Modern Ambition Content Studio — dashboard. Projects move through a gated
// pipeline (relevance before generation); the Script Bible tab holds the
// reusable writing rules distilled from feedback, injected into every future
// generation; Personas shows the built-in three plus AI-proposed ones that
// unlock at 30 and 100 completed videos (five max).

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BookOpenText, Film, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  useChannels,
  useContentProjects,
  useCreateContentProject,
  useCreateProduction,
  useDeleteContentProject,
  useDeleteFeedbackRule,
  useFeedbackRules,
  useSetFeedbackRuleActive,
  useStudioPersonas,
  useUpdateContentProject,
  useUpdateProduction,
} from "@/hooks/queries";
import { usePersistedState } from "@/hooks/usePersistedState";
import { relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ContentProject, StudioVideoLength } from "@/types";
import { DEFAULT_VIDEO_LENGTH, MAX_PERSONAS, PERSONA_UNLOCKS, STEP_LABELS, VIDEO_LENGTHS } from "./personas";
import { STUDIO_STEPS } from "@/types";

function StepDots({ project }: { project: ContentProject }) {
  const idx = STUDIO_STEPS.indexOf(project.status);
  return (
    <span className="flex items-center gap-0.5">
      {STUDIO_STEPS.slice(0, -1).map((s, i) => (
        <span
          key={s}
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            i < idx || project.status === "done" ? "bg-primary" : i === idx ? "bg-primary/50" : "bg-muted",
          )}
        />
      ))}
    </span>
  );
}

export function StudioPage() {
  const { data: projects, isLoading } = useContentProjects();
  const { data: rules } = useFeedbackRules();
  const { data: personas } = useStudioPersonas();
  const createProject = useCreateContentProject();
  const updateProject = useUpdateContentProject();
  const createProduction = useCreateProduction();
  const updateProduction = useUpdateProduction();
  const { data: channels } = useChannels();
  const deleteProject = useDeleteContentProject();
  const setRuleActive = useSetFeedbackRuleActive();
  const deleteRule = useDeleteFeedbackRule();
  const navigate = useNavigate();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm, clearForm] = usePersistedState("draft.studio", {
    topic: "",
    primaryPersona: "",
    secondaryPersona: "",
    length: `${DEFAULT_VIDEO_LENGTH}` as "" | `${StudioVideoLength}`,
  });

  const submit = async () => {
    if (!form.topic.trim()) {
      toast.error("What's the video about? One sentence is enough.");
      return;
    }
    try {
      const created = await createProject.mutateAsync({
        topic: form.topic.trim(),
        primaryPersona: form.primaryPersona || undefined,
        secondaryPersona: form.secondaryPersona || undefined,
        videoLengthMinutes: form.length ? (Number(form.length) as StudioVideoLength) : undefined,
      });
      // The video exists on the Production board from second one: a linked
      // doc is created immediately (Scripting) and the Studio keeps it in
      // sync — title, script, thumbnail — all the way to Editing.
      const channelId = channels?.[0]?.id;
      if (channelId) {
        try {
          const doc = await createProduction.mutateAsync({
            title: created.topic,
            channelId,
            topic: created.topic,
          });
          await updateProduction.mutateAsync({
            id: doc.id,
            patch: { notes: `Being written in Content Studio — project: ${created.topic}` },
          });
          await updateProject.mutateAsync({
            id: created.id,
            patch: { linkedProductionId: doc.id },
          });
        } catch {
          // Non-fatal: the doc can still be created at handoff time.
        }
      }
      clearForm();
      setDialogOpen(false);
      navigate(`/studio/${created.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const removeProject = (p: ContentProject) => {
    if (!window.confirm(`Delete "${p.topic}"? All its artifacts go with it.`)) return;
    deleteProject.mutate(p.id, {
      onSuccess: () => toast("Project deleted"),
      onError: (err) => toast.error(err instanceof Error ? err.message : String(err)),
    });
  };

  const doneCount = (projects ?? []).filter((p) => p.status === "done").length;
  const nextUnlock = PERSONA_UNLOCKS.find((n) => doneCount < n);

  if (isLoading) return <Skeleton className="h-96" />;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Content Studio"
        description="Modern Ambition's documentary pipeline: relevance before generation, feedback becomes rules, every script sharper than the last."
        actions={
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus /> New video project
          </Button>
        }
      />

      <Tabs defaultValue="projects">
        <TabsList className="mb-4">
          <TabsTrigger value="projects" className="gap-1.5">
            <Film className="h-3.5 w-3.5" /> Projects
          </TabsTrigger>
          <TabsTrigger value="bible" className="gap-1.5">
            <BookOpenText className="h-3.5 w-3.5" /> Script Bible
            {(rules ?? []).length > 0 && <Badge variant="secondary">{rules!.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="personas" className="gap-1.5">
            <Users className="h-3.5 w-3.5" /> Personas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="projects">
          {(projects ?? []).length === 0 ? (
            <EmptyState
              icon={Film}
              title="Start your first documentary project"
              description={'Enter a topic like "The dark side of Elon Musk\'s obsession" — the studio checks relevance first, then walks you from research to a critiqued full script.'}
              action={
                <Button size="sm" onClick={() => setDialogOpen(true)}>
                  <Plus /> New video project
                </Button>
              }
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {(projects ?? []).map((p) => (
                <Card key={p.id} className="transition-colors hover:border-primary/40">
                  <CardContent className="space-y-2 p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <Link to={`/studio/${p.id}`} className="min-w-0 flex-1">
                        <div className="line-clamp-2 text-sm font-medium leading-snug">
                          {p.selectedTitle ?? p.topic}
                        </div>
                      </Link>
                      <button
                        className="shrink-0 p-0.5 text-muted-foreground hover:text-destructive"
                        onClick={() => removeProject(p)}
                        aria-label="Delete project"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <Link to={`/studio/${p.id}`} className="block space-y-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant={p.status === "done" ? "success" : "secondary"}>
                          {STEP_LABELS[p.status]}
                        </Badge>
                        <Badge variant="outline">{p.videoLengthMinutes} min</Badge>
                        {p.relevance && (
                          <Badge variant={p.relevance.score >= 7 ? "success" : p.relevance.score >= 5 ? "warning" : "destructive"}>
                            relevance {p.relevance.score}/10
                          </Badge>
                        )}
                        {p.linkedProductionId && <Badge variant="success">in production</Badge>}
                      </div>
                      <div className="flex items-center justify-between">
                        <StepDots project={p} />
                        <span className="text-[11px] text-muted-foreground">
                          {relativeTime(p.updatedAt)}
                        </span>
                      </div>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="bible">
          <p className="mb-3 text-xs text-muted-foreground">
            Rules distilled from your feedback. Active rules are injected into every future
            generation — titles, outlines, scripts, critiques. Toggle off anything that stops
            serving you.
          </p>
          {(rules ?? []).length === 0 ? (
            <EmptyState
              icon={BookOpenText}
              title="The Bible writes itself"
              description="Finish a project and leave feedback — every note becomes a reusable writing rule here."
            />
          ) : (
            <div className="space-y-2">
              {(rules ?? []).map((r) => (
                <div
                  key={r.id}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border p-3",
                    !r.active && "opacity-50",
                  )}
                >
                  <Switch
                    checked={r.active}
                    onCheckedChange={(v) => setRuleActive.mutate({ id: r.id, active: v })}
                    aria-label="Rule active"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{r.category}</Badge>
                      <span className="text-[11px] text-muted-foreground">
                        {relativeTime(r.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm">{r.rule}</p>
                    {r.sourceFeedback && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        from: “{r.sourceFeedback}”
                      </p>
                    )}
                  </div>
                  <button
                    className="shrink-0 p-0.5 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteRule.mutate(r.id)}
                    aria-label="Delete rule"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="personas">
          <p className="mb-3 text-xs text-muted-foreground">
            {doneCount} completed video{doneCount === 1 ? "" : "s"}.
            {nextUnlock && (personas?.length ?? 3) < MAX_PERSONAS
              ? ` A new AI-proposed persona unlocks at ${nextUnlock} — refined from everything your feedback taught the system.`
              : ` All persona slots in use (max ${MAX_PERSONAS}).`}
          </p>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {(personas ?? []).map((p) => (
              <Card key={p.id}>
                <CardContent className="space-y-2 p-3.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{p.name}</span>
                    {p.ageRange && <Badge variant="outline">{p.ageRange}</Badge>}
                    <Badge variant={p.source === "builtin" ? "secondary" : "success"}>
                      {p.source === "builtin" ? "core" : "AI-evolved"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{p.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {p.respondsTo.map((t) => (
                      <Badge key={t} variant="secondary" className="text-[10px]">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New video project</DialogTitle>
            <DialogDescription>
              Topic first. The relevance gate decides whether it's worth making before anything
              is generated.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Topic</Label>
              <Textarea
                rows={2}
                value={form.topic}
                onChange={(e) => setForm({ ...form, topic: e.target.value })}
                placeholder='"How MrBeast turned attention into an empire"'
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label>Primary persona</Label>
                <Select
                  value={form.primaryPersona}
                  onValueChange={(v) => setForm({ ...form, primaryPersona: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Let AI pick" />
                  </SelectTrigger>
                  <SelectContent>
                    {(personas ?? []).map((p) => (
                      <SelectItem key={p.id} value={p.name}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Secondary persona</Label>
                <Select
                  value={form.secondaryPersona}
                  onValueChange={(v) => setForm({ ...form, secondaryPersona: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                  <SelectContent>
                    {(personas ?? [])
                      .filter((p) => p.name !== form.primaryPersona)
                      .map((p) => (
                        <SelectItem key={p.id} value={p.name}>
                          {p.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Length</Label>
              <div className="flex gap-1.5">
                {VIDEO_LENGTHS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setForm({ ...form, length: `${n}` })}
                    className={cn(
                      "flex-1 rounded-md border py-1.5 text-xs tabular-nums transition-colors",
                      form.length === `${n}`
                        ? "border-primary/50 bg-primary/10 font-medium text-primary"
                        : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {n} min
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Leave unset and the relevance gate recommends one.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={createProject.isPending}>
              Start project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

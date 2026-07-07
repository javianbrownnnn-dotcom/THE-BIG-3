import { useMemo, useState } from "react";
import { Clapperboard, Lightbulb, MessageCircleQuestion, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useNavigate } from "react-router-dom";
import { useChannels, useCreateIdea, useCreateProduction, useIdeas, useUpdateIdea } from "@/hooks/queries";
import type { Idea, IdeaPriority, IdeaStatus } from "@/types";
import { usePersistedState } from "@/hooks/usePersistedState";
import { GenerateIdeasDialog } from "./GenerateIdeasDialog";
import { BriefDialog } from "./BriefDialog";

const STATUSES: IdeaStatus[] = ["inbox", "researching", "approved", "in_production", "published", "archived"];
const PRIORITIES: IdeaPriority[] = ["low", "medium", "high", "urgent"];
const BOARD: IdeaStatus[] = ["inbox", "researching", "approved", "in_production"];

const priorityVariant = (p: IdeaPriority) =>
  p === "urgent" || p === "high" ? ("destructive" as const) : ("secondary" as const);

function IdeaCard({ idea }: { idea: Idea }) {
  const { data: channels } = useChannels();
  const updateIdea = useUpdateIdea();
  const createProduction = useCreateProduction();
  const navigate = useNavigate();
  const channel = channels?.find((c) => c.id === idea.channelId);

  // One tap from idea to a prefilled video doc — no retyping.
  const produce = async () => {
    const channelId = idea.channelId ?? channels?.[0]?.id;
    if (!channelId) {
      toast.error("Add a channel first (Channels page)");
      return;
    }
    const doc = await createProduction.mutateAsync({
      title: idea.title,
      channelId,
      topic: idea.tags[0] ?? undefined,
    });
    updateIdea.mutate({ id: idea.id, patch: { status: "in_production" } });
    toast.success("Video doc created — everything carried over");
    navigate(`/production/${doc.id}`);
  };

  return (
    <Card>
      <CardContent className="space-y-2 p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm font-medium leading-snug">{idea.title}</div>
        <Badge variant={priorityVariant(idea.priority)}>{idea.priority}</Badge>
      </div>
      {idea.description && (
        <p className="line-clamp-2 text-xs text-muted-foreground">{idea.description}</p>
      )}
      <div className="flex flex-wrap gap-1">
        {channel && <Badge variant="outline">{channel.name}</Badge>}
        {idea.tags.map((t) => (
          <Badge key={t} variant="secondary">
            {t}
          </Badge>
        ))}
      </div>
      {idea.status !== "in_production" && idea.status !== "published" && idea.status !== "archived" && (
        <Button
          size="sm"
          className="h-7 w-full text-xs"
          onClick={produce}
          disabled={createProduction.isPending}
        >
          <Clapperboard className="h-3.5 w-3.5" /> Produce this
        </Button>
      )}
      <Select
        value={idea.status}
        onValueChange={(status) => {
          const previous = idea.status;
          updateIdea.mutate(
            { id: idea.id, patch: { status: status as IdeaStatus } },
            {
              onSuccess: () =>
                toast(`Moved to ${status.replace(/_/g, " ")}`, {
                  action: {
                    label: "Undo",
                    onClick: () =>
                      updateIdea.mutate({ id: idea.id, patch: { status: previous } }),
                  },
                }),
            },
          );
        }}
      >
        <SelectTrigger className="h-7 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {s.replace(/_/g, " ")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      </CardContent>
    </Card>
  );
}

export function IdeasPage() {
  const { data: ideas, isLoading } = useIdeas();
  const { data: channels } = useChannels();
  const createIdea = useCreateIdea();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [briefOpen, setBriefOpen] = useState(false);
  const [form, setForm, clearForm] = usePersistedState("draft.idea", {
    title: "",
    description: "",
    channelId: "",
    priority: "medium" as IdeaPriority,
    tags: "",
  });

  const byStatus = useMemo(() => {
    const map = new Map<IdeaStatus, Idea[]>();
    for (const s of BOARD) map.set(s, []);
    for (const idea of ideas ?? []) {
      if (map.has(idea.status)) map.get(idea.status)!.push(idea);
    }
    return map;
  }, [ideas]);

  const submit = async () => {
    if (!form.title) {
      toast.error("A title is all that's required");
      return;
    }
    await createIdea.mutateAsync({
      title: form.title,
      description: form.description || undefined,
      channelId: form.channelId || undefined,
      priority: form.priority,
      status: "inbox",
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
    });
    toast.success("Idea captured");
    clearForm();
    setDialogOpen(false);
  };

  if (isLoading) return <Skeleton className="h-96" />;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Ideas"
        description="Capture fast, validate with data, produce the winners."
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => setBriefOpen(true)}>
              <MessageCircleQuestion /> Brief for ChatGPT
            </Button>
            <Button variant="outline" size="sm" onClick={() => setGenerateOpen(true)}>
              <Sparkles /> Generate ideas
            </Button>
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus /> New idea
            </Button>
          </>
        }
      />
      <BriefDialog open={briefOpen} onOpenChange={setBriefOpen} />

      {(ideas ?? []).length === 0 ? (
        <EmptyState
          icon={Lightbulb}
          title="Capture your first idea"
          description="A title, a half-thought, a competitor video that made you jealous — get it in the inbox. Or let AI draft a batch from what's already working."
          action={
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setGenerateOpen(true)}>
                <Sparkles /> Generate ideas
              </Button>
              <Button size="sm" onClick={() => setDialogOpen(true)}>
                <Plus /> New idea
              </Button>
            </div>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {BOARD.map((status) => (
            <div key={status}>
              <Card className="bg-transparent">
                <CardHeader className="p-3.5 pb-2">
                  <CardTitle className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
                    {status.replace(/_/g, " ")}
                    <Badge variant="secondary">{byStatus.get(status)?.length ?? 0}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5 p-3.5 pt-0">
                  {(byStatus.get(status) ?? []).map((idea) => (
                    <IdeaCard key={idea.id} idea={idea} />
                  ))}
                  {(byStatus.get(status) ?? []).length === 0 && (
                    <div className="rounded-md border border-dashed py-6 text-center text-xs text-muted-foreground">
                      Empty
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Capture an idea</DialogTitle>
            <DialogDescription>Everything starts in the inbox.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="The company that owns…"
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Angle, source, why now…"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Channel</Label>
                <Select onValueChange={(v) => setForm({ ...form, channelId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                  <SelectContent>
                    {(channels ?? []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Priority</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) => setForm({ ...form, priority: v as IdeaPriority })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tags (comma separated)</Label>
              <Input
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="rise_and_fall, consumer_anger"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={createIdea.isPending}>
              Capture
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <GenerateIdeasDialog open={generateOpen} onOpenChange={setGenerateOpen} />
    </div>
  );
}

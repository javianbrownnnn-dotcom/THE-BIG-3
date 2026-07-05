import { useState } from "react";
import { Check, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import { useChannels, useCreateIdea, useGenerateIdeas } from "@/hooks/queries";
import { cn } from "@/lib/utils";
import { humanize } from "@/lib/format";
import type { GeneratedIdea } from "@/types";

const ALL = "__all__";

export function GenerateIdeasDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: channels } = useChannels();
  const generate = useGenerateIdeas();
  const createIdea = useCreateIdea();

  const [channelId, setChannelId] = useState(ALL);
  const [results, setResults] = useState<GeneratedIdea[]>([]);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);

  const run = async () => {
    setResults([]);
    setPicked(new Set());
    try {
      const ideas = await generate.mutateAsync({
        channelId: channelId === ALL ? undefined : channelId,
        count: 6,
      });
      if (!ideas.length) {
        toast.error("No ideas came back — try again or pick a specific channel.");
        return;
      }
      setResults(ideas);
      setPicked(new Set(ideas.map((_, i) => i))); // pre-select all
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const toggle = (i: number) => {
    const next = new Set(picked);
    next.has(i) ? next.delete(i) : next.add(i);
    setPicked(next);
  };

  const save = async () => {
    const chosen = results.filter((_, i) => picked.has(i));
    if (!chosen.length) {
      toast.error("Pick at least one idea to save.");
      return;
    }
    setSaving(true);
    try {
      for (const idea of chosen) {
        await createIdea.mutateAsync({
          title: idea.title,
          description: `${idea.description}\n\nWhy: ${idea.rationale}`,
          channelId: channelId === ALL ? undefined : channelId,
          priority: "medium",
          status: "inbox",
          tags: idea.tags ?? [],
        });
      }
      toast.success(`Saved ${chosen.length} idea${chosen.length === 1 ? "" : "s"} to the inbox`);
      setResults([]);
      setPicked(new Set());
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> Generate ideas
          </DialogTitle>
          <DialogDescription>
            Fresh angles grounded in what's working in your niche and your competitor outliers —
            skipping topics you've already covered. Pick the keepers; they land in your inbox.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-1.5">
            <Label>Channel</Label>
            <Select value={channelId} onValueChange={setChannelId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All channels</SelectItem>
                {(channels ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={run} disabled={generate.isPending}>
            <Wand2 className={generate.isPending ? "animate-pulse" : ""} />
            {generate.isPending ? "Thinking…" : results.length ? "Regenerate" : "Generate"}
          </Button>
        </div>

        {results.length > 0 && (
          <div className="space-y-2">
            {results.map((idea, i) => {
              const on = picked.has(i);
              return (
                <button
                  key={i}
                  onClick={() => toggle(i)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-md border p-3 text-left transition-colors",
                    on ? "border-primary/50 bg-primary/5" : "hover:bg-accent/40",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                      on ? "border-primary bg-primary text-primary-foreground" : "border-input",
                    )}
                  >
                    {on && <Check className="h-3 w-3" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{idea.title}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {idea.rationale}
                    </span>
                    <span className="mt-1.5 flex flex-wrap gap-1">
                      {idea.suggestedHook && (
                        <Badge variant="secondary">{humanize(idea.suggestedHook)}</Badge>
                      )}
                      {(idea.tags ?? []).map((t) => (
                        <Badge key={t} variant="outline">
                          {t}
                        </Badge>
                      ))}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {results.length > 0 && (
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : `Save ${picked.size} to inbox`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

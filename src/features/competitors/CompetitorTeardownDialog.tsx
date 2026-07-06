import { useState } from "react";
import { Lightbulb, Sparkles, Swords } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useChannels, useCreateIdea, useGenerateTeardown } from "@/hooks/queries";
import type { CompetitorTeardown, CompetitorVideo } from "@/types";

export function CompetitorTeardownDialog({ video }: { video: CompetitorVideo }) {
  const { data: channels } = useChannels();
  const generate = useGenerateTeardown();
  const createIdea = useCreateIdea();

  const [open, setOpen] = useState(false);
  const [channelId, setChannelId] = useState<string>("");
  const [teardown, setTeardown] = useState<CompetitorTeardown | null>(null);
  const [saved, setSaved] = useState(false);

  const targetChannelId = channelId || channels?.[0]?.id;

  const run = () => {
    setSaved(false);
    generate.mutate(
      { competitorVideoId: video.id, targetChannelId },
      {
        onSuccess: (t) => setTeardown(t),
        onError: (err) => toast.error(err instanceof Error ? err.message : String(err)),
      },
    );
  };

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (next && !teardown && !generate.isPending) run();
    if (!next) {
      setTeardown(null);
      setSaved(false);
    }
  };

  const saveIdea = () => {
    if (!teardown) return;
    createIdea.mutate(
      {
        title: teardown.idea.title,
        description: teardown.idea.description,
        channelId: targetChannelId,
        priority: "medium",
        status: "inbox",
        tags: teardown.idea.tags,
        relatedCompetitorVideoId: video.id,
      },
      {
        onSuccess: () => {
          setSaved(true);
          toast.success("Idea saved to your Ideas inbox");
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : String(err)),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Button size="sm" variant="ghost" onClick={() => onOpenChange(true)}>
        <Swords className="h-3.5 w-3.5" /> Teardown
      </Button>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Why it worked
          </DialogTitle>
          <DialogDescription className="line-clamp-2">{video.title}</DialogDescription>
        </DialogHeader>

        {/* Target channel picker */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Adapt for</Label>
          <Select
            value={targetChannelId}
            onValueChange={(v) => {
              setChannelId(v);
              setTeardown(null);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose a channel" />
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

        {generate.isPending && (
          <div className="space-y-2 py-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        )}

        {teardown && !generate.isPending && (
          <div className="space-y-4 text-sm">
            <p>{teardown.whyItWorked}</p>
            <p className="text-muted-foreground">{teardown.observations}</p>

            {teardown.transferableMoves.length > 0 && (
              <div>
                <div className="mb-1 text-xs font-medium text-muted-foreground">
                  What to steal (the mechanism, not the topic)
                </div>
                <ul className="list-disc space-y-1 pl-5">
                  {teardown.transferableMoves.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
              <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
                <Lightbulb className="h-3.5 w-3.5" /> Ready-to-produce idea
              </div>
              <div className="mt-1 font-medium">{teardown.idea.title}</div>
              <p className="mt-1 text-muted-foreground">{teardown.idea.description}</p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          {teardown && (
            <Button variant="outline" onClick={run} disabled={generate.isPending}>
              Regenerate
            </Button>
          )}
          <Button
            onClick={saveIdea}
            disabled={!teardown || createIdea.isPending || saved}
          >
            <Lightbulb /> {saved ? "Saved ✓" : "Save as idea"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

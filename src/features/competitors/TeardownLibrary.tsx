// The Teardown Library — every banked competitor teardown, readable in full.
// The teardowns feed the playbook synthesis (every 20), but they're written
// for the team just as much as for the system: this is the study room.

import { BookOpen, Flame, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/layout/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useChannels, useCompetitorVideos, useCreateIdea } from "@/hooks/queries";
import { relativeTime } from "@/lib/format";
import type { CompetitorVideo } from "@/types";

function TeardownCard({ video }: { video: CompetitorVideo }) {
  const { data: channels } = useChannels();
  const createIdea = useCreateIdea();
  const t = video.teardown!;

  const saveIdea = () => {
    createIdea.mutate(
      {
        title: t.idea.title,
        description: t.idea.description,
        channelId: channels?.[0]?.id,
        priority: "medium",
        status: "inbox",
        tags: t.idea.tags,
        relatedCompetitorVideoId: video.id,
      },
      {
        onSuccess: () => toast.success("Saved to the ideas inbox"),
        onError: (err) => toast.error(err instanceof Error ? err.message : String(err)),
      },
    );
  };

  return (
    // content-visibility: the library holds 80+ of these cards; offscreen
    // ones skip layout/paint until scrolled near.
    <Card className="[content-visibility:auto] [contain-intrinsic-size:auto_460px]">
      <CardContent className="space-y-3 p-4">
        <div>
          <div className="flex flex-wrap items-center gap-1.5">
            {video.isOutlier && (
              <Badge variant="warning" className="gap-1">
                <Flame className="h-3 w-3" /> z={video.outlierScore ?? "high"}
              </Badge>
            )}
            {video.competitorChannelName && (
              <Badge variant="outline">{video.competitorChannelName}</Badge>
            )}
            {video.teardownAt && (
              <span className="text-[11px] text-muted-foreground">
                torn down {relativeTime(video.teardownAt)}
              </span>
            )}
          </div>
          <h3 className="mt-1.5 text-sm font-semibold leading-snug">
            {video.url ? (
              <a
                href={video.url}
                target="_blank"
                rel="noreferrer"
                className="underline-offset-2 hover:underline"
              >
                {video.title}
              </a>
            ) : (
              video.title
            )}
          </h3>
        </div>

        <div>
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Why it worked
          </div>
          <p className="text-sm text-foreground/90">{t.whyItWorked}</p>
        </div>

        <div>
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            What generalizes — and what doesn't
          </div>
          <p className="text-sm text-foreground/90">{t.observations}</p>
        </div>

        <div>
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Transferable moves
          </div>
          <ul className="mt-1 space-y-1 text-sm">
            {t.transferableMoves.map((m, i) => (
              <li key={i} className="flex gap-1.5">
                <span className="text-primary">→</span>
                <span>{m}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-md border border-primary/25 bg-primary/5 p-3">
          <div className="text-[11px] font-medium uppercase tracking-wide text-primary">
            Adapted for us
          </div>
          <p className="mt-0.5 text-sm font-medium">{t.idea.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{t.idea.description}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {t.idea.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px]">
                {tag}
              </Badge>
            ))}
            <Button
              size="sm"
              variant="outline"
              className="ml-auto h-7 text-xs"
              onClick={saveIdea}
              disabled={createIdea.isPending}
            >
              <Lightbulb className="h-3 w-3" /> Save to Ideas
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function TeardownLibrary() {
  const { data: videos } = useCompetitorVideos(false);
  const torn = (videos ?? [])
    .filter((v) => v.teardown)
    .sort((a, b) => (b.teardownAt ?? "").localeCompare(a.teardownAt ?? ""));

  if (torn.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        title="No teardowns yet"
        description='Run a teardown on any tracked video (the "Teardown" button in the videos table) — the full analysis lands here to read, and every 20 of them the system distills the winning playbook.'
      />
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {torn.length} teardown{torn.length === 1 ? "" : "s"} banked — newest first. Read them,
        steal the moves; the system reads them too.
      </p>
      <div className="grid gap-3 lg:grid-cols-2">
        {torn.map((v) => (
          <TeardownCard key={v.id} video={v} />
        ))}
      </div>
    </div>
  );
}

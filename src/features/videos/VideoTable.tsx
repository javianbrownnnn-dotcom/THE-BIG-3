import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useChannels } from "@/hooks/queries";
import { useFavorites } from "@/hooks/useFavorites";
import { compactNumber, duration, humanize, percent, shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Video } from "@/types";

export function VideoTable({ videos, hideChannel }: { videos: Video[]; hideChannel?: boolean }) {
  const { data: channels } = useChannels();
  const { favorites, toggle } = useFavorites();
  const channelName = (id: string) => channels?.find((c) => c.id === id)?.name ?? "—";

  return (
    <>
      {/* Phone: a card list — the table's 11 columns crush titles to one word. */}
      <div className="divide-y divide-border md:hidden">
        {videos.map((v) => (
          <div key={v.id} className="flex gap-3 p-3">
            <button
              onClick={() => toggle(v.id)}
              aria-label={favorites.has(v.id) ? "Remove from favorites" : "Add to favorites"}
              className="mt-0.5 shrink-0 self-start text-muted-foreground/50 transition-colors hover:text-warning"
            >
              <Star
                className={cn("h-4 w-4", favorites.has(v.id) && "fill-warning text-warning")}
              />
            </button>
            <div className="min-w-0 flex-1">
              <Link
                to={`/videos/${v.id}`}
                className="line-clamp-2 text-sm font-medium leading-snug underline-offset-2 hover:underline"
              >
                {v.title}
              </Link>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {!hideChannel && <>{channelName(v.channelId)} · </>}
                {shortDate(v.publishedAt)}
                {v.hookType && <> · {humanize(v.hookType)}</>}
              </div>
              <div className="mt-1.5 flex gap-4 text-xs tabular-nums text-muted-foreground">
                <span>
                  <span className="font-medium text-foreground">
                    {compactNumber(v.metrics?.views)}
                  </span>{" "}
                  views
                </span>
                <span>
                  <span className="font-medium text-foreground">{percent(v.metrics?.ctr)}</span>{" "}
                  CTR
                </span>
                <span>
                  <span className="font-medium text-foreground">
                    {percent(v.metrics?.avgPercentViewed, 0)}
                  </span>{" "}
                  viewed
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden md:block">
        <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-8" aria-label="Favorite" />
          <TableHead>Title</TableHead>
          {!hideChannel && <TableHead>Channel</TableHead>}
          <TableHead>Published</TableHead>
          <TableHead>Hook</TableHead>
          <TableHead>Structure</TableHead>
          <TableHead className="text-right">Length</TableHead>
          <TableHead className="text-right">Views</TableHead>
          <TableHead className="text-right">CTR</TableHead>
          <TableHead className="text-right">% viewed</TableHead>
          <TableHead className="text-right">Subs</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {videos.map((v) => (
          <TableRow key={v.id}>
            <TableCell className="pr-0">
              <button
                onClick={() => toggle(v.id)}
                aria-label={favorites.has(v.id) ? "Remove from favorites" : "Add to favorites"}
                className="text-muted-foreground/50 transition-colors hover:text-warning"
              >
                <Star
                  className={cn(
                    "h-4 w-4",
                    favorites.has(v.id) && "fill-warning text-warning",
                  )}
                />
              </button>
            </TableCell>
            <TableCell className="max-w-[280px]">
              <Link
                to={`/videos/${v.id}`}
                className="line-clamp-1 font-medium underline-offset-2 hover:underline"
              >
                {v.title}
              </Link>
            </TableCell>
            {!hideChannel && (
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {channelName(v.channelId)}
              </TableCell>
            )}
            <TableCell className="whitespace-nowrap text-muted-foreground">
              {shortDate(v.publishedAt)}
            </TableCell>
            <TableCell>
              {v.hookType && <Badge variant="secondary">{humanize(v.hookType)}</Badge>}
            </TableCell>
            <TableCell>
              {v.storyStructure && <Badge variant="outline">{humanize(v.storyStructure)}</Badge>}
            </TableCell>
            <TableCell className="text-right tabular-nums">{duration(v.durationSeconds)}</TableCell>
            <TableCell className="text-right tabular-nums">
              {compactNumber(v.metrics?.views)}
            </TableCell>
            <TableCell className="text-right tabular-nums">{percent(v.metrics?.ctr)}</TableCell>
            <TableCell className="text-right tabular-nums">
              {percent(v.metrics?.avgPercentViewed, 0)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {compactNumber(v.metrics?.subscribersGained)}
            </TableCell>
          </TableRow>
        ))}
        </TableBody>
        </Table>
      </div>
    </>
  );
}

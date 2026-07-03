import { Link } from "react-router-dom";
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
import { compactNumber, duration, humanize, percent, shortDate } from "@/lib/format";
import type { Video } from "@/types";

export function VideoTable({ videos, hideChannel }: { videos: Video[]; hideChannel?: boolean }) {
  const { data: channels } = useChannels();
  const channelName = (id: string) => channels?.find((c) => c.id === id)?.name ?? "—";

  return (
    <Table>
      <TableHeader>
        <TableRow>
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
  );
}

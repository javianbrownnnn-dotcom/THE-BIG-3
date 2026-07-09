import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Bot, ExternalLink, Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { MetricCard } from "@/components/charts/MetricCard";
import { TrendChart } from "@/components/charts/TrendChart";
import { VideoAudience } from "./VideoAudience";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAddVideoSnapshot, useChannel, useVideo } from "@/hooks/queries";
import { useRecordRecent } from "@/hooks/useRecents";
import { compactNumber, duration, humanize, percent, shortDate } from "@/lib/format";

export function VideoDetailPage() {
  const { id = "" } = useParams();
  const { data: video, isLoading } = useVideo(id);
  const { data: channel } = useChannel(video?.channelId ?? "");
  const addSnapshot = useAddVideoSnapshot();
  const [snapOpen, setSnapOpen] = useState(false);
  const [snap, setSnap] = useState({ views: "", ctr: "", pct: "", subs: "" });
  useRecordRecent(
    video ? { to: `/videos/${video.id}`, label: video.title, kind: "video" } : null,
  );

  if (isLoading) return <Skeleton className="h-96" />;
  if (!video) {
    return <div className="py-20 text-center text-muted-foreground">Video not found.</div>;
  }

  const m = video.metrics;
  const history = video.snapshots.map((s) => ({
    label: shortDate(s.capturedAt),
    views: s.views,
    ctr: s.ctr,
    pct: s.avgPercentViewed,
  }));

  const submitSnapshot = async () => {
    try {
      await addSnapshot.mutateAsync({
        videoId: video.id,
        metrics: {
          views: snap.views ? +snap.views : undefined,
          ctr: snap.ctr ? +snap.ctr : undefined,
          avgPercentViewed: snap.pct ? +snap.pct : undefined,
          subscribersGained: snap.subs ? +snap.subs : undefined,
        },
      });
      toast.success("Snapshot recorded — history preserved");
      setSnapOpen(false);
      setSnap({ views: "", ctr: "", pct: "", subs: "" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="animate-fade-in">
      <Button variant="ghost" size="sm" className="mb-3 -ml-2" asChild>
        <Link to="/videos">
          <ArrowLeft /> Videos
        </Link>
      </Button>
      <PageHeader
        title={video.title}
        description={`${channel?.name ?? ""} · Published ${shortDate(video.publishedAt)} · ${duration(video.durationSeconds)}`}
        actions={
          <>
            {video.url && (
              <Button variant="outline" size="sm" asChild>
                <a href={video.url} target="_blank" rel="noreferrer">
                  <ExternalLink /> Watch
                </a>
              </Button>
            )}
            <Button size="sm" onClick={() => setSnapOpen(true)}>
              <Plus /> Add snapshot
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap gap-1.5">
        {video.topic && video.topic.toLowerCase() !== video.title.toLowerCase() && (
          <Badge variant="secondary">{video.topic}</Badge>
        )}
        {video.hookType && <Badge>{humanize(video.hookType)}</Badge>}
        {video.storyStructure && <Badge variant="outline">{humanize(video.storyStructure)}</Badge>}
        <Badge variant="outline">{humanize(video.format)}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <MetricCard label="Views" value={compactNumber(m?.views)} />
        <MetricCard label="CTR" value={percent(m?.ctr)} />
        <MetricCard label="Percent viewed" value={percent(m?.avgPercentViewed)} />
        <MetricCard label="Subscribers gained" value={compactNumber(m?.subscribersGained)} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Views over time</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart
              data={history.map((h) => ({ label: h.label, views: h.views }))}
              series={[{ key: "views", label: "Views" }]}
              formatter={(v) => compactNumber(Number(v))}
              height={200}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>CTR over time</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart
              data={history.map((h) => ({ label: h.label, ctr: h.ctr }))}
              series={[{ key: "ctr", label: "CTR" }]}
              formatter={(v) => `${v}%`}
              height={200}
            />
          </CardContent>
        </Card>
      </div>

      <VideoAudience videoId={video.id} />

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-muted-foreground" /> AI observations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {video.aiObservations ??
                "No observations yet. The learning loop analyzes each video as metrics accumulate."}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Manual notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {video.manualNotes ?? "No notes yet."}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Metric history — every snapshot is kept forever</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Captured</TableHead>
                <TableHead className="text-right">Views</TableHead>
                <TableHead className="text-right">Impressions</TableHead>
                <TableHead className="text-right">CTR</TableHead>
                <TableHead className="text-right">Avg duration</TableHead>
                <TableHead className="text-right">% viewed</TableHead>
                <TableHead className="text-right">Watch hrs</TableHead>
                <TableHead className="text-right">Subs</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...video.snapshots].reverse().map((s, i) => (
                <TableRow key={i}>
                  <TableCell className="whitespace-nowrap">{shortDate(s.capturedAt)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {compactNumber(s.views)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {compactNumber(s.impressions)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{percent(s.ctr)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {duration(s.avgViewDurationSecs)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {percent(s.avgPercentViewed, 0)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {compactNumber(s.watchTimeHours)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {compactNumber(s.subscribersGained)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={snapOpen} onOpenChange={setSnapOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add metric snapshot</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Views</Label>
              <Input
                type="number"
                value={snap.views}
                onChange={(e) => setSnap({ ...snap, views: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">CTR %</Label>
              <Input
                type="number"
                step="0.1"
                value={snap.ctr}
                onChange={(e) => setSnap({ ...snap, ctr: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">% viewed</Label>
              <Input
                type="number"
                step="0.1"
                value={snap.pct}
                onChange={(e) => setSnap({ ...snap, pct: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Subs gained</Label>
              <Input
                type="number"
                value={snap.subs}
                onChange={(e) => setSnap({ ...snap, subs: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSnapOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitSnapshot} disabled={addSnapshot.isPending}>
              Save snapshot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

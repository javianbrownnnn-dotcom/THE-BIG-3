import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Bot, Trash2, Youtube } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { BarBreakdown } from "@/components/charts/BarBreakdown";
import { MetricCard } from "@/components/charts/MetricCard";
import { TrendChart } from "@/components/charts/TrendChart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { VideoTable } from "@/features/videos/VideoTable";
import { useChannel, useDeleteChannel, useInsights, useVideos } from "@/hooks/queries";
import { useRecordRecent } from "@/hooks/useRecents";
import { compactNumber, humanize, percent } from "@/lib/format";
import {
  THIRTY_DAYS,
  last30Spark,
  metricByGroup,
  pctDelta,
  windowStats,
} from "@/features/dashboard/stats";
import { YouTubeDialog } from "./YouTubeDialog";
import { messageOf } from "@/lib/errors";

export function ChannelDetailPage() {
  const { id = "" } = useParams();
  const { data: channel, isLoading } = useChannel(id);
  const { data: videos } = useVideos(id);
  const { data: insights } = useInsights();
  const [syncOpen, setSyncOpen] = useState(false);
  const navigate = useNavigate();
  const deleteChannel = useDeleteChannel();

  const removeChannel = () => {
    const n = (videos ?? []).length;
    const ok = window.confirm(
      `Delete "${channel?.name}"?` +
        (n ? ` Its ${n} tracked video${n === 1 ? "" : "s"} and their metric history go with it.` : "") +
        " This can't be undone.",
    );
    if (!ok) return;
    deleteChannel.mutate(id, {
      onSuccess: () => {
        toast.success("Channel deleted");
        navigate("/channels");
      },
      onError: (err) => toast.error(messageOf(err)),
    });
  };
  useRecordRecent(
    channel ? { to: `/channels/${channel.id}`, label: channel.name, kind: "channel" } : null,
  );

  if (isLoading || !channel) {
    return <Skeleton className="h-96" />;
  }

  const now = Date.now();
  const current = windowStats(videos ?? [], now - THIRTY_DAYS, now);
  const prior = windowStats(videos ?? [], now - 2 * THIRTY_DAYS, now - THIRTY_DAYS);

  // Per-video series, oldest → newest (performance history).
  const history = [...(videos ?? [])]
    .filter((v) => v.publishedAt)
    .sort((a, b) => a.publishedAt!.localeCompare(b.publishedAt!))
    .map((v) => ({
      label: new Date(v.publishedAt!).toLocaleDateString("en", { month: "short", day: "numeric" }),
      ctr: v.metrics?.ctr,
      pct: v.metrics?.avgPercentViewed,
      views: v.metrics?.views,
    }));

  // Charts adapt to the data this channel actually has: API-synced channels
  // start with views only (CTR/retention are private until OAuth), so the
  // panels reshape rather than render empty.
  const hasCtr = history.filter((h) => h.ctr != null).length >= 2;
  const hasPct = history.filter((h) => h.pct != null).length >= 2;
  const hasViews = history.filter((h) => h.views != null).length >= 2;

  return (
    <div className="animate-fade-in">
      <Button variant="ghost" size="sm" className="mb-3 -ml-2" asChild>
        <Link to="/channels">
          <ArrowLeft /> Channels
        </Link>
      </Button>
      <PageHeader
        title={channel.name}
        description={[
          [channel.brand, channel.niche].filter(Boolean).join(" — "),
          channel.ownerName ? `Owned by ${channel.ownerName}` : "",
          channel.uploadCadence ?? "",
        ]
          .filter(Boolean)
          .join(" · ")}
        actions={
          <>
            {channel.youtubeConnectedAt ? (
              <Badge variant="success">YouTube connected</Badge>
            ) : channel.youtubeChannelId ? (
              <Badge variant="success">YouTube linked</Badge>
            ) : (
              <Badge variant="warning">YouTube not linked</Badge>
            )}
            <Button size="sm" onClick={() => setSyncOpen(true)}>
              <Youtube /> Set up YouTube
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="text-muted-foreground hover:text-destructive"
              onClick={removeChannel}
              aria-label="Delete channel"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <MetricCard
          label="Videos / 30 days"
          value={String(current.published)}
          delta={pctDelta(current.published, prior.published)}
        />
        <MetricCard
          label="Average CTR"
          value={percent(current.avgCtr)}
          delta={pctDelta(current.avgCtr, prior.avgCtr)}
          spark={last30Spark(videos ?? [], (v) => v.metrics?.ctr)}
        />
        <MetricCard
          label="Avg percent viewed"
          value={percent(current.avgPercentViewed)}
          delta={pctDelta(current.avgPercentViewed, prior.avgPercentViewed)}
        />
        <MetricCard
          label="Subs gained / 30 days"
          value={compactNumber(current.subscribersGained)}
          delta={pctDelta(current.subscribersGained, prior.subscribersGained)}
        />
      </div>

      {channel.goals.length > 0 && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Goals</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {channel.goals.map((g) => (
              <Badge key={g.id} variant="secondary" className="px-3 py-1">
                {g.metric.replace(/_/g, " ")} ≥ {g.targetValue}
                {["ctr", "avg_percent_viewed"].includes(g.metric) ? "%" : ""} ({g.period})
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {hasCtr ? (
          <Card>
            <CardHeader>
              <CardTitle>CTR per video</CardTitle>
            </CardHeader>
            <CardContent>
              <TrendChart
                data={history}
                series={[{ key: "ctr", label: "CTR" }]}
                formatter={(v) => `${v}%`}
                height={200}
              />
            </CardContent>
          </Card>
        ) : hasViews ? (
          <Card>
            <CardHeader>
              <CardTitle>Views per video</CardTitle>
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
        ) : null}
        {hasPct ? (
          <Card>
            <CardHeader>
              <CardTitle>Percent viewed per video</CardTitle>
            </CardHeader>
            <CardContent>
              <TrendChart
                data={history.map((h) => ({ label: h.label, pct: h.pct }))}
                series={[{ key: "pct", label: "Percent viewed" }]}
                formatter={(v) => `${v}%`}
                height={200}
              />
            </CardContent>
          </Card>
        ) : (
          !hasCtr && hasViews && (
            <Card>
              <CardHeader>
                <CardTitle>Unlock CTR & retention</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                YouTube's public API shares views, durations, and publish dates. CTR,
                impressions, and retention are private to the channel owner — they arrive
                via the Analytics API (OAuth) or a YouTube Studio CSV import. Until then,
                this page adapts to what it has.
              </CardContent>
            </Card>
          )
        )}
      </div>

      {/* Adaptive analytics: these panels exist only where this channel's own
          data can support them, and reshape as more videos sync in. */}
      {(() => {
        const hookGroups = metricByGroup(videos ?? [], (v) => v.hookType, (v) => v.metrics?.ctr)
          .filter((g) => g.n >= 2);
        const structureGroups = metricByGroup(
          videos ?? [],
          (v) => v.storyStructure,
          (v) => v.metrics?.avgPercentViewed,
        ).filter((g) => g.n >= 2);
        const channelInsights = (insights ?? []).filter((i) => i.channelId === channel.id);
        if (!hookGroups.length && !structureGroups.length && !channelInsights.length) {
          return null;
        }
        return (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {hookGroups.length >= 2 && (
              <Card>
                <CardHeader>
                  <CardTitle>This channel: CTR by hook type</CardTitle>
                </CardHeader>
                <CardContent>
                  <BarBreakdown
                    data={hookGroups.map((g) => ({
                      label: `${humanize(g.label)} (${g.n})`,
                      value: g.value,
                    }))}
                    valueLabel="CTR"
                    formatter={(v) => `${v}%`}
                    height={Math.max(120, hookGroups.length * 40)}
                  />
                </CardContent>
              </Card>
            )}
            {structureGroups.length >= 2 && (
              <Card>
                <CardHeader>
                  <CardTitle>This channel: retention by structure</CardTitle>
                </CardHeader>
                <CardContent>
                  <BarBreakdown
                    data={structureGroups.map((g) => ({
                      label: `${humanize(g.label)} (${g.n})`,
                      value: g.value,
                    }))}
                    valueLabel="% viewed"
                    formatter={(v) => `${v}%`}
                    height={Math.max(120, structureGroups.length * 40)}
                  />
                </CardContent>
              </Card>
            )}
            {channelInsights.length > 0 && (
              <Card className={hookGroups.length >= 2 && structureGroups.length >= 2 ? "lg:col-span-2" : ""}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="h-4 w-4 text-muted-foreground" /> AI findings for this channel
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {channelInsights.slice(0, 3).map((ins) => (
                    <div key={ins.id} className="rounded-md border p-3">
                      <div className="text-sm font-medium">{ins.title}</div>
                      <p className="mt-1 text-xs text-muted-foreground">{ins.body}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        );
      })()}

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Videos</CardTitle>
        </CardHeader>
        <CardContent>
          <VideoTable videos={videos ?? []} hideChannel />
        </CardContent>
      </Card>

      <YouTubeDialog channel={channel} open={syncOpen} onOpenChange={setSyncOpen} />
    </div>
  );
}

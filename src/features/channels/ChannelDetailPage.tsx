import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { MetricCard } from "@/components/charts/MetricCard";
import { TrendChart } from "@/components/charts/TrendChart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { VideoTable } from "@/features/videos/VideoTable";
import { useChannel, useVideos } from "@/hooks/queries";
import { useRecordRecent } from "@/hooks/useRecents";
import { compactNumber, percent } from "@/lib/format";
import { THIRTY_DAYS, last30Spark, pctDelta, windowStats } from "@/features/dashboard/stats";

export function ChannelDetailPage() {
  const { id = "" } = useParams();
  const { data: channel, isLoading } = useChannel(id);
  const { data: videos } = useVideos(id);
  useRecordRecent(
    channel ? { to: `/channels/${channel.id}`, label: channel.name, kind: "channel" } : null,
  );

  if (isLoading || !channel) {
    return <Skeleton className="h-96" />;
  }

  const now = Date.now();
  const current = windowStats(videos ?? [], now - THIRTY_DAYS, now);
  const prior = windowStats(videos ?? [], now - 2 * THIRTY_DAYS, now - THIRTY_DAYS);

  // Per-video CTR/retention series, oldest → newest (performance history).
  const history = [...(videos ?? [])]
    .filter((v) => v.publishedAt)
    .sort((a, b) => a.publishedAt!.localeCompare(b.publishedAt!))
    .map((v) => ({
      label: new Date(v.publishedAt!).toLocaleDateString("en", { month: "short", day: "numeric" }),
      ctr: v.metrics?.ctr,
      pct: v.metrics?.avgPercentViewed,
    }));

  return (
    <div className="animate-fade-in">
      <Button variant="ghost" size="sm" className="mb-3 -ml-2" asChild>
        <Link to="/channels">
          <ArrowLeft /> Channels
        </Link>
      </Button>
      <PageHeader
        title={channel.name}
        description={`${channel.brand ?? ""} — ${channel.niche ?? ""}. Owned by ${channel.ownerName}. ${channel.uploadCadence ?? ""}`}
        actions={
          channel.youtubeChannelId ? (
            <Badge variant="success">YouTube connected</Badge>
          ) : (
            <Badge variant="warning">YouTube not connected</Badge>
          )
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Videos</CardTitle>
        </CardHeader>
        <CardContent>
          <VideoTable videos={videos ?? []} hideChannel />
        </CardContent>
      </Card>
    </div>
  );
}

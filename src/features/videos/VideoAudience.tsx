import { Activity, PlugZap } from "lucide-react";
import { BarBreakdown } from "@/components/charts/BarBreakdown";
import { MetricCard } from "@/components/charts/MetricCard";
import { TrendChart } from "@/components/charts/TrendChart";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useVideoAnalytics } from "@/hooks/queries";
import { compactNumber, percent } from "@/lib/format";

export function VideoAudience({ videoId }: { videoId: string }) {
  const { data: a, isLoading, error } = useVideoAnalytics(videoId);

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center gap-2">
        <Activity className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">Audience</h3>
        {a?.source === "simulated" && <Badge variant="outline">simulated</Badge>}
        {a?.source === "youtube" && <Badge variant="success">live</Badge>}
      </div>

      {isLoading && <Skeleton className="h-56 w-full" />}

      {error && (
        <Card>
          <CardContent className="flex items-center gap-3 py-6 text-sm text-muted-foreground">
            <PlugZap className="h-5 w-5 shrink-0 text-warning" />
            <span>
              {error instanceof Error ? error.message : String(error)} Connect this video's
              channel to YouTube (Channels → Connect) to load the real retention curve, traffic
              sources, and impressions.
            </span>
          </CardContent>
        </Card>
      )}

      {a && !isLoading && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Impressions" value={compactNumber(a.impressions)} />
            <MetricCard label="Impressions CTR" value={percent(a.ctr)} />
            <MetricCard label="Views" value={compactNumber(a.views)} />
            <MetricCard label="Avg % viewed" value={percent(a.avgPercentViewed)} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Audience retention</CardTitle>
              </CardHeader>
              <CardContent>
                <TrendChart
                  data={a.retention.map((r) => ({ label: `${r.pct}%`, audience: r.audience }))}
                  series={[{ key: "audience", label: "Still watching" }]}
                  formatter={(v) => `${v}%`}
                  yDomain={[0, 100]}
                  height={220}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  % of viewers still watching across the video's length. Watch the first 30s and
                  any mid-video cliffs.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Traffic sources</CardTitle>
              </CardHeader>
              <CardContent>
                <BarBreakdown
                  data={a.trafficSources.map((t) => ({ label: t.source, value: t.views }))}
                  formatter={(v) => compactNumber(Number(v))}
                  valueLabel="Views"
                  height={220}
                />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

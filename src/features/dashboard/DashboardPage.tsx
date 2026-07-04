import { Link } from "react-router-dom";
import {
  ArrowRight,
  Bot,
  Flame,
  Lightbulb,
  ListChecks,
  Plus,
  Video as VideoIcon,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { BarBreakdown } from "@/components/charts/BarBreakdown";
import { MetricCard } from "@/components/charts/MetricCard";
import { TrendChart } from "@/components/charts/TrendChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useActivity,
  useChannels,
  useCompetitorVideos,
  useIdeas,
  useRecommendations,
  useSops,
  useVideos,
} from "@/hooks/queries";
import { compactNumber, duration, humanize, percent, relativeTime } from "@/lib/format";
import {
  THIRTY_DAYS,
  last30Spark,
  metricByGroup,
  monthlyByChannel,
  pctDelta,
  windowStats,
} from "./stats";
import { WeeklyRhythm } from "./WeeklyRhythm";

export function DashboardPage() {
  const { data: videos, isLoading } = useVideos();
  const { data: channels } = useChannels();
  const { data: outliers } = useCompetitorVideos(true);
  const { data: ideas } = useIdeas();
  const { data: sops } = useSops();
  const { data: recommendations } = useRecommendations();
  const { data: activity } = useActivity();

  if (isLoading || !videos || !channels) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  const now = Date.now();
  const current = windowStats(videos, now - THIRTY_DAYS, now);
  const prior = windowStats(videos, now - 2 * THIRTY_DAYS, now - THIRTY_DAYS);

  const ctrTrend = monthlyByChannel(videos, channels, (v) => v.metrics?.ctr);
  const ideasWaiting = (ideas ?? []).filter((i) => i.status === "inbox" || i.status === "researching");
  const sopsDue = (sops ?? []).filter(
    (s) => s.nextReviewAt && new Date(s.nextReviewAt).getTime() < now,
  );
  const openRecs = (recommendations ?? []).filter(
    (r) => r.status === "proposed" || r.status === "testing",
  );

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Dashboard"
        description="The last 30 days across all channels, and what to change next."
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link to="/ideas">
                <Plus /> New idea
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/videos">
                <VideoIcon /> Log video
              </Link>
            </Button>
          </>
        }
      />

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          label="Videos published"
          value={String(current.published)}
          delta={pctDelta(current.published, prior.published)}
        />
        <MetricCard
          label="Average CTR"
          value={percent(current.avgCtr)}
          delta={pctDelta(current.avgCtr, prior.avgCtr)}
          spark={last30Spark(videos, (v) => v.metrics?.ctr)}
          hint="Rough guide for long-form: 2–10% is the normal band, 4–6% is typical, 8%+ is excellent. Your own baseline matters more than any benchmark — beat last month first."
        />
        <MetricCard
          label="Avg view duration"
          value={duration(current.avgViewDurationSecs)}
          delta={pctDelta(current.avgViewDurationSecs, prior.avgViewDurationSecs)}
        />
        <MetricCard
          label="Avg percent viewed"
          value={percent(current.avgPercentViewed)}
          delta={pctDelta(current.avgPercentViewed, prior.avgPercentViewed)}
          spark={last30Spark(videos, (v) => v.metrics?.avgPercentViewed)}
          hint="For 10min+ long-form: 40–50% average viewed is solid, 55%+ is excellent. Shorter videos naturally score higher — compare like with like."
        />
        <MetricCard
          label="Watch time"
          value={`${compactNumber(current.watchTimeHours)} hrs`}
          delta={pctDelta(current.watchTimeHours, prior.watchTimeHours)}
        />
        <MetricCard
          label="Subscribers gained"
          value={compactNumber(current.subscribersGained)}
          delta={pctDelta(current.subscribersGained, prior.subscribersGained)}
        />
      </div>

      {/* The loop, as a checklist */}
      <div className="mt-4">
        <WeeklyRhythm />
      </div>

      {/* Trend */}
      <Card className="mt-4">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>CTR by channel — last 6 months</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/videos">
              All videos <ArrowRight />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <TrendChart
            data={ctrTrend}
            series={channels.map((c) => ({ key: c.id, label: c.name }))}
            formatter={(v) => `${v}%`}
          />
        </CardContent>
      </Card>

      {/* What's working: the packaging decisions behind the numbers */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Average CTR by hook type</CardTitle>
          </CardHeader>
          <CardContent>
            <BarBreakdown
              data={metricByGroup(videos, (v) => v.hookType, (v) => v.metrics?.ctr).map(
                (g) => ({ label: `${humanize(g.label)} (${g.n})`, value: g.value }),
              )}
              valueLabel="CTR"
              formatter={(v) => `${v}%`}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Average percent viewed by story structure</CardTitle>
          </CardHeader>
          <CardContent>
            <BarBreakdown
              data={metricByGroup(
                videos,
                (v) => v.storyStructure,
                (v) => v.metrics?.avgPercentViewed,
              ).map((g) => ({ label: `${humanize(g.label)} (${g.n})`, value: g.value }))}
              valueLabel="% viewed"
              formatter={(v) => `${v}%`}
            />
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* Latest AI recommendations */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-muted-foreground" /> Latest AI recommendations
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/coach">
                Coach <ArrowRight />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {openRecs.slice(0, 3).map((r) => (
              <div key={r.id} className="rounded-md border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-medium">{r.title}</div>
                  <Badge variant={r.status === "testing" ? "warning" : "default"}>
                    {r.status}
                  </Badge>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{r.rationale}</p>
              </div>
            ))}
            {openRecs.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No open recommendations. The learning loop runs daily.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Competitor outliers */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-muted-foreground" /> Recent competitor outliers
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/competitors">
                All <ArrowRight />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {(outliers ?? []).slice(0, 4).map((o) => (
              <div key={o.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{o.title}</div>
                  <div className="text-xs text-muted-foreground">{o.competitorChannelName}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-sm font-medium tabular-nums">
                    {compactNumber(o.viewsPerDay)}/day
                  </div>
                  <div className="text-xs text-muted-foreground">z = {o.outlierScore}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Ideas waiting + SOPs due */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-muted-foreground" /> Ideas waiting
              <Badge variant="secondary">{ideasWaiting.length}</Badge>
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/ideas">
                Queue <ArrowRight />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {ideasWaiting.slice(0, 4).map((i) => (
              <div key={i.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate">{i.title}</span>
                <Badge
                  variant={
                    i.priority === "urgent" || i.priority === "high" ? "destructive" : "secondary"
                  }
                >
                  {i.priority}
                </Badge>
              </div>
            ))}
            {sopsDue.length > 0 && (
              <div className="mt-3 rounded-md border border-warning/40 bg-warning/10 p-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <ListChecks className="h-4 w-4" /> {sopsDue.length} SOP
                  {sopsDue.length > 1 ? "s" : ""} due for review
                </div>
                {sopsDue.map((s) => (
                  <Link
                    key={s.id}
                    to={`/sops/${s.id}`}
                    className="mt-1 block text-xs text-muted-foreground underline-offset-2 hover:underline"
                  >
                    {s.title}
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {(activity ?? []).slice(0, 6).map((a) => (
              <div key={a.id} className="flex items-baseline gap-2 text-sm">
                <span className="font-medium">{a.actorName}</span>
                <span className="text-muted-foreground">{a.action}</span>
                <span className="min-w-0 flex-1 truncate">{a.entityLabel}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {relativeTime(a.createdAt)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

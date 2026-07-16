import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Bot,
  Film,
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
  useCompetitorChannels,
  useCompetitorVideos,
  useContentProjects,
  useIdeas,
  useProductions,
  useRecommendations,
  useSops,
  useVideos,
} from "@/hooks/queries";
import { NICHE_LABELS, nicheKeyOf, nicheKeyOfCompetitor, useNicheScope, type NicheKey } from "@/lib/niches";
import { NicheChips } from "@/components/layout/NicheChips";
import { STEP_LABELS } from "@/features/studio/personas";
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
import { ResultsTrend } from "./ResultsTrend";
import type { AiRecommendation, Idea, Sop } from "@/types";

/** One card, one verb: the next thing that moves the loop forward. */
function NextBestAction({
  openRec,
  sopDue,
  ideaWaiting,
}: {
  openRec?: AiRecommendation;
  sopDue?: Sop;
  ideaWaiting?: Idea;
}) {
  const action = openRec
    ? {
        eyebrow: "AI recommendation waiting",
        title: openRec.title,
        to: "/coach",
        cta: "Review & decide",
        icon: Bot,
      }
    : sopDue
      ? {
          eyebrow: "SOP due for review",
          title: sopDue.title,
          to: `/sops/${sopDue.id}`,
          cta: "Review SOP",
          icon: ListChecks,
        }
      : ideaWaiting
        ? {
            eyebrow: "Idea waiting in the inbox",
            title: ideaWaiting.title,
            to: "/ideas",
            cta: "Validate it",
            icon: Lightbulb,
          }
        : {
            eyebrow: "All clear",
            title: "Log your latest video so the loop can learn from it",
            to: "/videos",
            cta: "Log video",
            icon: VideoIcon,
          };
  const Icon = action.icon;

  return (
    <Card className="mt-3 border-primary/25 bg-gradient-to-r from-primary/[0.08] to-transparent md:mt-4">
      <CardContent className="flex items-center gap-3 p-3.5 md:p-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15">
          <Icon className="h-4.5 w-4.5 h-[18px] w-[18px] text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-medium text-primary">{action.eyebrow}</div>
          <div className="truncate text-sm font-medium">{action.title}</div>
        </div>
        <Button size="sm" asChild className="shrink-0">
          <Link to={action.to}>
            {action.cta} <ArrowRight />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

/** One tap back into whatever was being worked on last. */
function ResumeWork() {
  const { data: projects } = useContentProjects();
  const { data: productions } = useProductions();

  const candidates = [
    ...(projects ?? [])
      .filter((p) => p.status !== "done")
      .map((p) => ({
        to: `/studio/${p.id}`,
        title: p.selectedTitle ?? p.topic,
        where: `Studio · ${STEP_LABELS[p.status] ?? p.status}`,
        at: p.updatedAt,
      })),
    ...(productions ?? [])
      .filter((p) => p.stage !== "published")
      .map((p) => ({
        to: `/production/${p.id}`,
        title: p.title,
        where: `Production · ${humanize(p.stage)}`,
        at: p.updatedAt,
      })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  const latest = candidates[0];
  if (!latest) return null;

  return (
    <Card className="mt-3 md:mt-4">
      <CardContent className="flex items-center gap-3 p-3.5 md:p-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Film className="h-[18px] w-[18px] text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-medium text-muted-foreground">
            Pick up where you left off · {relativeTime(latest.at)}
          </div>
          <div className="truncate text-sm font-medium">{latest.title}</div>
          <div className="text-xs text-muted-foreground">{latest.where}</div>
        </div>
        <Button size="sm" variant="outline" asChild className="shrink-0">
          <Link to={latest.to}>
            Resume <ArrowRight />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const { data: allVideos, isLoading } = useVideos();
  const { data: allChannels } = useChannels();
  const { data: allOutliers } = useCompetitorVideos(true);
  const { data: competitorChannels } = useCompetitorChannels();
  const { data: allIdeas } = useIdeas();
  const { data: allSops } = useSops();
  const { data: recommendations } = useRecommendations();
  const { data: activity } = useActivity();

  // Niche scope: view the home screen per niche or all together (shared
  // across all list pages).
  const [niche, pickNiche] = useNicheScope();

  const nicheOptions = useMemo(() => {
    const seen: NicheKey[] = [];
    for (const c of allChannels ?? []) {
      const k = nicheKeyOf(c.niche);
      if (!seen.includes(k)) seen.push(k);
    }
    return seen;
  }, [allChannels]);

  const { channels, videos, outliers, ideas, sops } = useMemo(() => {
    const chans = allChannels ?? [];
    if (niche === "all") {
      return {
        channels: chans,
        videos: allVideos ?? [],
        outliers: allOutliers ?? [],
        ideas: allIdeas ?? [],
        sops: allSops ?? [],
      };
    }
    const channelIds = new Set(chans.filter((c) => nicheKeyOf(c.niche) === niche).map((c) => c.id));
    const competitorIds = new Set(
      (competitorChannels ?? []).filter((c) => nicheKeyOfCompetitor(c) === niche).map((c) => c.id),
    );
    return {
      channels: chans.filter((c) => channelIds.has(c.id)),
      videos: (allVideos ?? []).filter((v) => channelIds.has(v.channelId)),
      outliers: (allOutliers ?? []).filter((o) => competitorIds.has(o.competitorChannelId)),
      // Org-level rows (no channel) stay visible in every scope.
      ideas: (allIdeas ?? []).filter((i) => !i.channelId || channelIds.has(i.channelId)),
      sops: (allSops ?? []).filter((s) => !s.channelId || channelIds.has(s.channelId)),
    };
  }, [niche, allChannels, allVideos, allOutliers, competitorChannels, allIdeas, allSops]);

  if (isLoading || !allVideos || !allChannels) {
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
  const ideasWaiting = ideas.filter((i) => i.status === "inbox" || i.status === "researching");
  const sopsDue = sops.filter(
    (s) => s.nextReviewAt && new Date(s.nextReviewAt).getTime() < now,
  );
  const openRecs = (recommendations ?? []).filter(
    (r) => r.status === "proposed" || r.status === "testing",
  );

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Dashboard"
        description={
          niche === "all"
            ? "The last 30 days across all channels, and what to change next."
            : `The last 30 days in the ${NICHE_LABELS[niche]} niche, and what to change next.`
        }
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

      {/* Niche scope — view one niche or the whole company together */}
      <NicheChips scope={niche} onPick={pickNiche} options={nicheOptions} />

      {/* The headline: are the results moving? */}
      <ResultsTrend videos={videos} />

      {/* KPI row — 2-up on phones so the pulse fits one screen */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-3">
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
          hint="YouTube's API doesn't share impression CTR (it's Studio-only). Bring it in on the Videos page → Import CSV → a YouTube Studio Advanced-mode export. Rough guide for long-form: 2–10% is the normal band, 4–6% is typical, 8%+ is excellent."
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

      {/* Next best action — the single most useful thing to do right now */}
      <NextBestAction
        openRec={openRecs[0]}
        sopDue={sopsDue[0]}
        ideaWaiting={ideasWaiting[0]}
      />

      {/* One tap back into the video being made right now */}
      <ResumeWork />

      {/* The loop, as a checklist */}
      <div className="mt-3 md:mt-4">
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
            {outliers.slice(0, 4).map((o) => (
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

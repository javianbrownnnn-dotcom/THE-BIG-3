import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Archive, ExternalLink, FileText, Target, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useChannels, useProductions, useVideos } from "@/hooks/queries";
import { compactNumber, humanize, percent, shortDate } from "@/lib/format";
import { metricByGroup } from "@/features/dashboard/stats";
import { getThumbnail } from "@/features/production/thumbnail";
import type { Production, Video } from "@/types";

const ALL = "__all__";

type Outcome = "all" | "met" | "missed" | "no_goal";

function goalOutcome(prod: Production | undefined, video: Video): Outcome {
  if (!prod?.goalMetric || prod.goalTarget == null) return "no_goal";
  const m = video.metrics;
  const actual =
    prod.goalMetric === "ctr" ? m?.ctr
    : prod.goalMetric === "views" ? m?.views
    : prod.goalMetric === "avg_percent_viewed" ? m?.avgPercentViewed
    : undefined;
  if (actual == null) return "no_goal";
  return actual >= prod.goalTarget ? "met" : "missed";
}

export function VaultPage() {
  const { data: videos, isLoading } = useVideos();
  const { data: productions } = useProductions();
  const { data: channels } = useChannels();

  const [search, setSearch] = useState("");
  const [channelId, setChannelId] = useState(ALL);
  const [hook, setHook] = useState(ALL);
  const [outcome, setOutcome] = useState<Outcome>("all");

  // Map each published video to its production doc (the source of hook/script/goal).
  const prodByVideo = useMemo(() => {
    const map = new Map<string, Production>();
    for (const p of productions ?? []) {
      if (p.linkedVideoId) map.set(p.linkedVideoId, p);
    }
    return map;
  }, [productions]);

  // The vault is the record of what shipped: videos with a publish date.
  const shipped = useMemo(
    () =>
      (videos ?? [])
        .filter((v) => v.publishedAt)
        .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "")),
    [videos],
  );

  const hooks = useMemo(
    () => [...new Set(shipped.map((v) => v.hookType).filter(Boolean))] as string[],
    [shipped],
  );

  const filtered = useMemo(
    () =>
      shipped.filter((v) => {
        if (channelId !== ALL && v.channelId !== channelId) return false;
        if (hook !== ALL && v.hookType !== hook) return false;
        if (search && !v.title.toLowerCase().includes(search.toLowerCase())) return false;
        if (outcome !== "all" && goalOutcome(prodByVideo.get(v.id), v) !== outcome) return false;
        return true;
      }),
    [shipped, channelId, hook, search, outcome, prodByVideo],
  );

  // The learning payoff, computed from what's in the vault right now.
  const bestHook = metricByGroup(filtered, (v) => v.hookType, (v) => v.metrics?.ctr)[0];
  const bestStructure = metricByGroup(
    filtered,
    (v) => v.storyStructure,
    (v) => v.metrics?.avgPercentViewed,
  )[0];
  const channelName = (id: string) => channels?.find((c) => c.id === id)?.name ?? "—";

  if (isLoading) return <Skeleton className="h-96" />;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Vault"
        description="Every video you've shipped, with each part — hook, structure, goal — tied to how it actually performed. This is where the pattern becomes obvious."
      />

      {shipped.length === 0 ? (
        <EmptyState
          icon={Archive}
          title="Nothing archived yet"
          description="Publish a video from Production and it lands here forever — hook, script, packaging, and how it actually performed, side by side."
        />
      ) : (
        <>
          {/* The learning payoff at a glance */}
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <Archive className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <div className="text-lg font-semibold leading-none">{filtered.length}</div>
                  <div className="text-xs text-muted-foreground">videos in the vault</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <TrendingUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <div className="truncate text-lg font-semibold leading-none">
                    {bestHook ? humanize(bestHook.label) : "—"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    top hook{bestHook ? ` · ${percent(bestHook.value)} CTR` : ""}
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <TrendingUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <div className="truncate text-lg font-semibold leading-none">
                    {bestStructure ? humanize(bestStructure.label) : "—"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    top structure{bestStructure ? ` · ${percent(bestStructure.value)} viewed` : ""}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search titles…"
              className="w-48"
            />
            <Select value={channelId} onValueChange={setChannelId}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All channels</SelectItem>
                {(channels ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={hook} onValueChange={setHook}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All hooks</SelectItem>
                {hooks.map((h) => (
                  <SelectItem key={h} value={h}>
                    {humanize(h)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={outcome} onValueChange={(v) => setOutcome(v as Outcome)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any outcome</SelectItem>
                <SelectItem value="met">Goal met</SelectItem>
                <SelectItem value="missed">Goal missed</SelectItem>
                <SelectItem value="no_goal">No goal set</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Archive entries */}
          <div className="space-y-3">
            {filtered.map((v) => {
              const prod = prodByVideo.get(v.id);
              const out = goalOutcome(prod, v);
              return (
                <Card key={v.id}>
                  <CardContent className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex min-w-0 gap-3">
                        {(prod && getThumbnail(prod)) || v.thumbnailUrl ? (
                          <img
                            src={(prod && getThumbnail(prod)) || v.thumbnailUrl}
                            alt=""
                            className="hidden h-14 w-24 shrink-0 rounded-md border object-cover sm:block"
                          />
                        ) : null}
                        <div className="min-w-0">
                          <Link
                            to={prod ? `/production/${prod.id}` : `/videos/${v.id}`}
                            className="font-medium underline-offset-2 hover:underline"
                          >
                            {v.title}
                          </Link>
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {channelName(v.channelId)} · {shortDate(v.publishedAt)}
                          </div>
                        </div>
                      </div>
                      {out !== "no_goal" && (
                        <Badge variant={out === "met" ? "success" : "warning"} className="gap-1">
                          <Target className="h-3 w-3" />
                          {out === "met" ? "Goal met" : "Goal missed"}
                        </Badge>
                      )}
                    </div>

                    {/* Parts */}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {v.topic && <Badge variant="secondary">{v.topic}</Badge>}
                      {v.hookType && <Badge>{humanize(v.hookType)}</Badge>}
                      {v.storyStructure && (
                        <Badge variant="outline">{humanize(v.storyStructure)}</Badge>
                      )}
                    </div>

                    {prod?.hookText && (
                      <p className="mt-2 line-clamp-2 border-l-2 border-primary/40 pl-3 text-sm text-muted-foreground">
                        {prod.hookText}
                      </p>
                    )}

                    {/* Performance — the part → outcome tie */}
                    <div className="mt-3 grid grid-cols-2 gap-3 border-t pt-3 sm:grid-cols-4">
                      <div>
                        <div className="text-sm font-semibold tabular-nums">
                          {compactNumber(v.metrics?.views)}
                        </div>
                        <div className="text-[11px] text-muted-foreground">views</div>
                      </div>
                      <div>
                        <div className="text-sm font-semibold tabular-nums">
                          {percent(v.metrics?.ctr)}
                        </div>
                        <div className="text-[11px] text-muted-foreground">CTR</div>
                      </div>
                      <div>
                        <div className="text-sm font-semibold tabular-nums">
                          {percent(v.metrics?.avgPercentViewed, 0)}
                        </div>
                        <div className="text-[11px] text-muted-foreground">viewed</div>
                      </div>
                      <div>
                        <div className="text-sm font-semibold tabular-nums">
                          {compactNumber(v.metrics?.subscribersGained)}
                        </div>
                        <div className="text-[11px] text-muted-foreground">subs</div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-3 text-xs">
                      {prod ? (
                        <Link
                          to={`/production/${prod.id}`}
                          className="flex items-center gap-1 text-muted-foreground underline-offset-2 hover:underline"
                        >
                          <FileText className="h-3 w-3" /> Full doc — hook, script, packaging
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">
                          No production doc linked
                        </span>
                      )}
                      {v.url && (
                        <a
                          href={v.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-muted-foreground underline-offset-2 hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" /> Watch
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {filtered.length === 0 && (
              <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
                No videos match these filters.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

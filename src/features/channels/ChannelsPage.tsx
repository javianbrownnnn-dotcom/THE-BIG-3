import { Link } from "react-router-dom";
import { ArrowRight, Tv } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useChannels, useVideos } from "@/hooks/queries";
import { percent } from "@/lib/format";
import { THIRTY_DAYS, windowStats } from "@/features/dashboard/stats";

export function ChannelsPage() {
  const { data: channels, isLoading } = useChannels();
  const { data: videos } = useVideos();

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-52" />
        ))}
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Channels"
        description="One brand per channel. Each carries its own goals, KPIs, and performance history."
      />

      {(channels ?? []).length === 0 ? (
        <EmptyState
          icon={Tv}
          title="No channels yet"
          description="Connect Supabase and create your first channel to start tracking performance."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(channels ?? []).map((ch) => {
            const chVideos = (videos ?? []).filter((v) => v.channelId === ch.id);
            const now = Date.now();
            const stats = windowStats(chVideos, now - THIRTY_DAYS, now);
            const ctrGoal = ch.goals.find((g) => g.metric === "ctr");
            return (
              <Link key={ch.id} to={`/channels/${ch.id}`} className="group">
                <Card className="h-full transition-colors group-hover:border-primary/40">
                  <CardHeader className="flex-row items-start justify-between space-y-0">
                    <div>
                      <CardTitle className="text-base">{ch.name}</CardTitle>
                      <div className="mt-1 text-xs text-muted-foreground">{ch.brand}</div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="line-clamp-2 text-sm text-muted-foreground">{ch.description}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {ch.niche && <Badge variant="secondary">{ch.niche.split(",")[0]}</Badge>}
                      {ch.uploadCadence && <Badge variant="outline">{ch.uploadCadence}</Badge>}
                      {!ch.youtubeChannelId && (
                        <Badge variant="warning">YouTube not connected</Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2 border-t pt-3 text-center">
                      <div>
                        <div className="text-sm font-semibold tabular-nums">{stats.published}</div>
                        <div className="text-[11px] text-muted-foreground">videos / 30d</div>
                      </div>
                      <div>
                        <div className="text-sm font-semibold tabular-nums">
                          {percent(stats.avgCtr)}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          CTR{ctrGoal ? ` · goal ${ctrGoal.targetValue}%` : ""}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-semibold tabular-nums">
                          {percent(stats.avgPercentViewed)}
                        </div>
                        <div className="text-[11px] text-muted-foreground">viewed</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 border-t pt-3">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-[10px]">
                          {ch.ownerName?.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-muted-foreground">
                        Owned by {ch.ownerName}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

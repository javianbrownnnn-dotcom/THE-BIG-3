// Builds the performance context handed to Claude. One place, reused by the
// coach, the learning loop, and report generation, so every AI feature reasons
// over the same picture of the business.

// deno-lint-ignore-file no-explicit-any
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

export interface OrgContext {
  channels: any[];
  videos: any[];
  sops: any[];
  competitorOutliers: any[];
  recentInsights: any[];
  openRecommendations: any[];
}

export async function loadOrgContext(
  db: SupabaseClient,
  organizationId: string,
  options: { videoLimit?: number } = {},
): Promise<OrgContext> {
  const videoLimit = options.videoLimit ?? 60;

  const [channels, sops, insights, recommendations] = await Promise.all([
    db.from("channels").select("id,name,brand,niche,upload_cadence")
      .eq("organization_id", organizationId),
    db.from("sops")
      .select("id,title,category,status,channel_id,next_review_at")
      .eq("organization_id", organizationId).eq("status", "active"),
    db.from("ai_insights").select("kind,title,body,confidence,created_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false }).limit(15),
    db.from("ai_recommendations").select("id,title,rationale,status,created_at")
      .eq("organization_id", organizationId)
      .in("status", ["proposed", "testing"])
      .order("created_at", { ascending: false }).limit(15),
  ]);

  const channelIds = (channels.data ?? []).map((c: any) => c.id);

  const videos = channelIds.length
    ? await db.from("videos")
        .select("id,channel_id,title,topic,hook_type,story_structure,duration_seconds,format,published_at")
        .in("channel_id", channelIds)
        .order("published_at", { ascending: false })
        .limit(videoLimit)
    : { data: [] };

  const videoIds = (videos.data ?? []).map((v: any) => v.id);
  const metrics = videoIds.length
    ? await db.from("video_current_metrics").select("*").in("video_id", videoIds)
    : { data: [] };
  const metricsByVideo = new Map(
    (metrics.data ?? []).map((m: any) => [m.video_id, m]),
  );

  const outliers = await db.from("competitor_videos")
    .select("title,topic,hook,story_structure,why_it_worked,outlier_score,published_at,competitor_channels!inner(name,organization_id)")
    .eq("competitor_channels.organization_id", organizationId)
    .eq("is_outlier", true)
    .order("outlier_score", { ascending: false })
    .limit(20);

  return {
    channels: channels.data ?? [],
    videos: (videos.data ?? []).map((v: any) => ({
      ...v,
      metrics: metricsByVideo.get(v.id) ?? null,
    })),
    sops: sops.data ?? [],
    competitorOutliers: outliers.data ?? [],
    recentInsights: insights.data ?? [],
    openRecommendations: recommendations.data ?? [],
  };
}

export function contextToPrompt(ctx: OrgContext): string {
  return [
    "## Channels",
    JSON.stringify(ctx.channels),
    "## Recent videos (with latest metric snapshot)",
    JSON.stringify(ctx.videos),
    "## Active SOPs",
    JSON.stringify(ctx.sops),
    "## Competitor outliers",
    JSON.stringify(ctx.competitorOutliers),
    "## Recent AI insights",
    JSON.stringify(ctx.recentInsights),
    "## Open recommendations",
    JSON.stringify(ctx.openRecommendations),
  ].join("\n\n");
}

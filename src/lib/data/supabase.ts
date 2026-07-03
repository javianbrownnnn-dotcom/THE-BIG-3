// Real backend implementation of DataProvider on top of Supabase.
// All access control is enforced server-side by RLS; this class only maps
// between snake_case rows and the camelCase domain types.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  ActivityItem,
  AiInsight,
  AiRecommendation,
  AppNotification,
  Channel,
  ChatMessage,
  CoachReply,
  CompetitorChannel,
  CompetitorVideo,
  CompetitorVideoInput,
  Idea,
  IdeaInput,
  Member,
  Organization,
  Profile,
  RecommendationStatus,
  Report,
  ReportType,
  Sop,
  SopInput,
  SopVersion,
  SopVersionInput,
  SopWithHistory,
  Video,
  VideoInput,
  VideoMetrics,
  VideoMetricsInput,
  VideoWithHistory,
} from "@/types";
import type { DataProvider } from "./provider";

function mapMetrics(row: any): VideoMetrics {
  return {
    capturedAt: row.captured_at,
    views: row.views ?? undefined,
    impressions: row.impressions ?? undefined,
    ctr: row.ctr ?? undefined,
    avgViewDurationSecs: row.avg_view_duration_secs ?? undefined,
    avgPercentViewed: row.avg_percent_viewed ?? undefined,
    watchTimeHours: row.watch_time_hours ?? undefined,
    subscribersGained: row.subscribers_gained ?? undefined,
    revenue: row.revenue ?? undefined,
    rpm: row.rpm ?? undefined,
  };
}

function mapVideo(row: any, metrics?: VideoMetrics): Video {
  return {
    id: row.id,
    channelId: row.channel_id,
    title: row.title,
    url: row.url ?? undefined,
    thumbnailUrl: row.thumbnail_url ?? undefined,
    publishedAt: row.published_at ?? undefined,
    topic: row.topic ?? undefined,
    hookType: row.hook_type ?? undefined,
    storyStructure: row.story_structure ?? undefined,
    durationSeconds: row.duration_seconds ?? undefined,
    format: row.format,
    manualNotes: row.manual_notes ?? undefined,
    aiObservations: row.ai_observations ?? undefined,
    metrics,
    createdAt: row.created_at,
  };
}

function mapSopVersion(row: any): SopVersion {
  return {
    id: row.id,
    sopId: row.sop_id,
    versionNumber: row.version_number,
    purpose: row.purpose,
    whenToUse: row.when_to_use ?? undefined,
    steps: Array.isArray(row.steps) ? row.steps : [],
    examples: row.examples ?? undefined,
    changeSummary: row.change_summary ?? undefined,
    source: row.source,
    createdAt: row.created_at,
  };
}

export class SupabaseProvider implements DataProvider {
  readonly isDemo = false;
  private db: SupabaseClient;
  private orgId: string | null = null;

  constructor(url: string, anonKey: string) {
    this.db = createClient(url, anonKey);
  }

  get client(): SupabaseClient {
    return this.db;
  }

  private async requireOrgId(): Promise<string> {
    if (this.orgId) return this.orgId;
    const { data, error } = await this.db
      .from("organization_members")
      .select("organization_id")
      .limit(1)
      .single();
    if (error || !data) throw new Error("No organization membership found for this user");
    this.orgId = data.organization_id;
    return this.orgId!;
  }

  async getCurrentUser(): Promise<Profile> {
    const { data: auth } = await this.db.auth.getUser();
    if (!auth.user) throw new Error("Not signed in");
    const { data } = await this.db
      .from("profiles").select("*").eq("id", auth.user.id).single();
    return {
      id: auth.user.id,
      displayName: data?.display_name ?? auth.user.email ?? "You",
      avatarUrl: data?.avatar_url ?? undefined,
    };
  }

  async getOrganization(): Promise<Organization> {
    const orgId = await this.requireOrgId();
    const { data, error } = await this.db
      .from("organizations").select("*").eq("id", orgId).single();
    if (error) throw error;
    return { id: data.id, name: data.name, slug: data.slug };
  }

  async listMembers(): Promise<Member[]> {
    const orgId = await this.requireOrgId();
    const { data, error } = await this.db
      .from("organization_members")
      .select("role, profiles(id, display_name, avatar_url)")
      .eq("organization_id", orgId);
    if (error) throw error;
    return (data ?? []).map((m: any) => ({
      id: m.profiles.id,
      displayName: m.profiles.display_name,
      avatarUrl: m.profiles.avatar_url ?? undefined,
      role: m.role,
    }));
  }

  async listChannels(): Promise<Channel[]> {
    const orgId = await this.requireOrgId();
    const { data, error } = await this.db
      .from("channels")
      .select("*, profiles:owner_id(display_name), channel_goals(*)")
      .eq("organization_id", orgId)
      .order("created_at");
    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      id: row.id,
      organizationId: row.organization_id,
      name: row.name,
      ownerId: row.owner_id ?? undefined,
      ownerName: row.profiles?.display_name ?? undefined,
      brand: row.brand ?? undefined,
      niche: row.niche ?? undefined,
      uploadCadence: row.upload_cadence ?? undefined,
      description: row.description ?? undefined,
      youtubeChannelId: row.youtube_channel_id ?? undefined,
      goals: (row.channel_goals ?? []).map((g: any) => ({
        id: g.id, channelId: g.channel_id, metric: g.metric,
        targetValue: g.target_value, period: g.period, notes: g.notes ?? undefined,
      })),
      createdAt: row.created_at,
    }));
  }

  async getChannel(id: string): Promise<Channel | null> {
    const all = await this.listChannels();
    return all.find((c) => c.id === id) ?? null;
  }

  async listVideos(filter?: { channelId?: string }): Promise<Video[]> {
    const orgId = await this.requireOrgId();
    let query = this.db
      .from("videos")
      .select("*, channels!inner(organization_id)")
      .eq("channels.organization_id", orgId)
      .order("published_at", { ascending: false });
    if (filter?.channelId) query = query.eq("channel_id", filter.channelId);
    const { data, error } = await query;
    if (error) throw error;

    const ids = (data ?? []).map((v: any) => v.id);
    const metricsByVideo = new Map<string, VideoMetrics>();
    if (ids.length) {
      const { data: metrics } = await this.db
        .from("video_current_metrics").select("*").in("video_id", ids);
      for (const m of metrics ?? []) metricsByVideo.set(m.video_id, mapMetrics(m));
    }
    return (data ?? []).map((row: any) => mapVideo(row, metricsByVideo.get(row.id)));
  }

  async getVideo(id: string): Promise<VideoWithHistory | null> {
    const { data, error } = await this.db.from("videos").select("*").eq("id", id).single();
    if (error || !data) return null;
    const { data: snaps } = await this.db
      .from("video_metric_snapshots")
      .select("*").eq("video_id", id)
      .order("captured_at", { ascending: true });
    const snapshots = (snaps ?? []).map(mapMetrics);
    return { ...mapVideo(data, snapshots[snapshots.length - 1]), snapshots };
  }

  async createVideo(input: VideoInput, metrics?: VideoMetricsInput): Promise<Video> {
    const { data: auth } = await this.db.auth.getUser();
    const { data, error } = await this.db.from("videos").insert({
      channel_id: input.channelId,
      title: input.title,
      url: input.url,
      published_at: input.publishedAt,
      topic: input.topic,
      hook_type: input.hookType,
      story_structure: input.storyStructure,
      duration_seconds: input.durationSeconds,
      format: input.format,
      manual_notes: input.manualNotes,
      created_by: auth.user?.id,
    }).select("*").single();
    if (error) throw error;
    if (metrics) await this.addVideoSnapshot(data.id, metrics);
    return mapVideo(data);
  }

  async addVideoSnapshot(videoId: string, metrics: VideoMetricsInput): Promise<void> {
    const { error } = await this.db.from("video_metric_snapshots").insert({
      video_id: videoId,
      views: metrics.views,
      impressions: metrics.impressions,
      ctr: metrics.ctr,
      avg_view_duration_secs: metrics.avgViewDurationSecs,
      avg_percent_viewed: metrics.avgPercentViewed,
      watch_time_hours: metrics.watchTimeHours,
      subscribers_gained: metrics.subscribersGained,
    });
    if (error) throw error;
  }

  async listCompetitorChannels(): Promise<CompetitorChannel[]> {
    const orgId = await this.requireOrgId();
    const { data, error } = await this.db
      .from("competitor_channels").select("*").eq("organization_id", orgId);
    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      id: row.id, organizationId: row.organization_id, name: row.name,
      niche: row.niche ?? undefined, notes: row.notes ?? undefined,
    }));
  }

  async listCompetitorVideos(filter?: { onlyOutliers?: boolean }): Promise<CompetitorVideo[]> {
    const orgId = await this.requireOrgId();
    let query = this.db
      .from("competitor_videos")
      .select("*, competitor_channels!inner(name, organization_id)")
      .eq("competitor_channels.organization_id", orgId)
      .order("published_at", { ascending: false });
    if (filter?.onlyOutliers) query = query.eq("is_outlier", true);
    const { data, error } = await query;
    if (error) throw error;

    const ids = (data ?? []).map((v: any) => v.id);
    const latest = new Map<string, any>();
    if (ids.length) {
      const { data: snaps } = await this.db
        .from("competitor_video_snapshots")
        .select("*").in("competitor_video_id", ids)
        .order("captured_at", { ascending: false });
      for (const s of snaps ?? []) {
        if (!latest.has(s.competitor_video_id)) latest.set(s.competitor_video_id, s);
      }
    }
    return (data ?? []).map((row: any) => {
      const snap = latest.get(row.id);
      return {
        id: row.id,
        competitorChannelId: row.competitor_channel_id,
        competitorChannelName: row.competitor_channels?.name,
        title: row.title,
        url: row.url ?? undefined,
        thumbnailUrl: row.thumbnail_url ?? undefined,
        publishedAt: row.published_at ?? undefined,
        topic: row.topic ?? undefined,
        hook: row.hook ?? undefined,
        storyStructure: row.story_structure ?? undefined,
        whyItWorked: row.why_it_worked ?? undefined,
        aiObservations: row.ai_observations ?? undefined,
        isOutlier: row.is_outlier,
        outlierScore: row.outlier_score ?? undefined,
        views: snap?.views ?? undefined,
        viewsPerDay: snap?.views_per_day ?? undefined,
        velocity: snap?.velocity ?? undefined,
      };
    });
  }

  async createCompetitorVideo(input: CompetitorVideoInput): Promise<CompetitorVideo> {
    const { data: auth } = await this.db.auth.getUser();
    const { data, error } = await this.db.from("competitor_videos").insert({
      competitor_channel_id: input.competitorChannelId,
      title: input.title,
      url: input.url,
      published_at: input.publishedAt,
      topic: input.topic,
      hook: input.hook,
      story_structure: input.storyStructure,
      why_it_worked: input.whyItWorked,
      created_by: auth.user?.id,
    }).select("*").single();
    if (error) throw error;
    if (input.views != null || input.viewsPerDay != null) {
      await this.db.from("competitor_video_snapshots").insert({
        competitor_video_id: data.id,
        views: input.views,
        views_per_day: input.viewsPerDay,
      });
    }
    return {
      id: data.id,
      competitorChannelId: data.competitor_channel_id,
      title: data.title,
      isOutlier: false,
      views: input.views,
      viewsPerDay: input.viewsPerDay,
    };
  }

  async listIdeas(): Promise<Idea[]> {
    const orgId = await this.requireOrgId();
    const { data, error } = await this.db
      .from("ideas")
      .select("*, idea_tags(tags(name))")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      id: row.id,
      organizationId: row.organization_id,
      channelId: row.channel_id ?? undefined,
      title: row.title,
      description: row.description ?? undefined,
      priority: row.priority,
      status: row.status,
      tags: (row.idea_tags ?? []).map((t: any) => t.tags?.name).filter(Boolean),
      relatedCompetitorVideoId: row.related_competitor_video_id ?? undefined,
      relatedSopId: row.related_sop_id ?? undefined,
      createdAt: row.created_at,
    }));
  }

  private async syncIdeaTags(ideaId: string, tags: string[]): Promise<void> {
    const orgId = await this.requireOrgId();
    await this.db.from("idea_tags").delete().eq("idea_id", ideaId);
    for (const name of tags) {
      const { data: tag } = await this.db
        .from("tags")
        .upsert({ organization_id: orgId, name }, { onConflict: "organization_id,name" })
        .select("id").single();
      if (tag) await this.db.from("idea_tags").insert({ idea_id: ideaId, tag_id: tag.id });
    }
  }

  async createIdea(input: IdeaInput): Promise<Idea> {
    const orgId = await this.requireOrgId();
    const { data: auth } = await this.db.auth.getUser();
    const { data, error } = await this.db.from("ideas").insert({
      organization_id: orgId,
      channel_id: input.channelId,
      title: input.title,
      description: input.description,
      priority: input.priority,
      status: input.status,
      related_competitor_video_id: input.relatedCompetitorVideoId,
      related_sop_id: input.relatedSopId,
      created_by: auth.user?.id,
    }).select("*").single();
    if (error) throw error;
    if (input.tags.length) await this.syncIdeaTags(data.id, input.tags);
    return {
      id: data.id, organizationId: orgId, channelId: data.channel_id ?? undefined,
      title: data.title, description: data.description ?? undefined,
      priority: data.priority, status: data.status, tags: input.tags,
      createdAt: data.created_at,
    };
  }

  async updateIdea(id: string, patch: Partial<IdeaInput>): Promise<Idea> {
    const update: Record<string, unknown> = {};
    if (patch.title !== undefined) update.title = patch.title;
    if (patch.description !== undefined) update.description = patch.description;
    if (patch.channelId !== undefined) update.channel_id = patch.channelId;
    if (patch.priority !== undefined) update.priority = patch.priority;
    if (patch.status !== undefined) update.status = patch.status;
    const { error } = await this.db.from("ideas").update(update).eq("id", id);
    if (error) throw error;
    if (patch.tags) await this.syncIdeaTags(id, patch.tags);
    const all = await this.listIdeas();
    const idea = all.find((i) => i.id === id);
    if (!idea) throw new Error("idea not found");
    return idea;
  }

  private mapSop(row: any): Sop {
    return {
      id: row.id,
      organizationId: row.organization_id,
      channelId: row.channel_id ?? undefined,
      title: row.title,
      category: row.category ?? undefined,
      status: row.status,
      reviewFrequencyDays: row.review_frequency_days,
      nextReviewAt: row.next_review_at ?? undefined,
      linkedVideoIds: (row.sop_video_links ?? []).map((l: any) => l.video_id),
      linkedCompetitorVideoIds: (row.sop_competitor_links ?? []).map(
        (l: any) => l.competitor_video_id,
      ),
      createdAt: row.created_at,
    };
  }

  async listSops(): Promise<Sop[]> {
    const orgId = await this.requireOrgId();
    const { data, error } = await this.db
      .from("sops")
      .select("*, sop_video_links(video_id), sop_competitor_links(competitor_video_id)")
      .eq("organization_id", orgId)
      .order("created_at");
    if (error) throw error;

    const ids = (data ?? []).map((s: any) => s.id);
    const currentBySop = new Map<string, SopVersion>();
    if (ids.length) {
      const { data: versions } = await this.db
        .from("sop_current_versions").select("*").in("sop_id", ids);
      for (const v of versions ?? []) currentBySop.set(v.sop_id, mapSopVersion(v));
    }
    return (data ?? []).map((row: any) => ({
      ...this.mapSop(row),
      currentVersion: currentBySop.get(row.id),
    }));
  }

  async getSop(id: string): Promise<SopWithHistory | null> {
    const { data, error } = await this.db
      .from("sops")
      .select("*, sop_video_links(video_id), sop_competitor_links(competitor_video_id)")
      .eq("id", id).single();
    if (error || !data) return null;
    const { data: versions } = await this.db
      .from("sop_versions").select("*").eq("sop_id", id)
      .order("version_number", { ascending: false });
    const mapped = (versions ?? []).map(mapSopVersion);
    return { ...this.mapSop(data), currentVersion: mapped[0], versions: mapped };
  }

  async createSop(input: SopInput): Promise<Sop> {
    const orgId = await this.requireOrgId();
    const { data: auth } = await this.db.auth.getUser();
    const { data, error } = await this.db.from("sops").insert({
      organization_id: orgId,
      channel_id: input.channelId,
      title: input.title,
      category: input.category,
      created_by: auth.user?.id,
    }).select("*").single();
    if (error) throw error;
    await this.db.from("sop_versions").insert({
      sop_id: data.id,
      version_number: 1,
      purpose: input.purpose,
      when_to_use: input.whenToUse,
      steps: input.steps,
      examples: input.examples,
      source: "human",
      created_by: auth.user?.id,
    });
    return this.mapSop({ ...data, sop_video_links: [], sop_competitor_links: [] });
  }

  async addSopVersion(sopId: string, input: SopVersionInput): Promise<SopWithHistory> {
    const { data: auth } = await this.db.auth.getUser();
    const { data: latest } = await this.db
      .from("sop_versions").select("version_number").eq("sop_id", sopId)
      .order("version_number", { ascending: false }).limit(1).single();
    const { error } = await this.db.from("sop_versions").insert({
      sop_id: sopId,
      version_number: (latest?.version_number ?? 0) + 1,
      purpose: input.purpose,
      when_to_use: input.whenToUse,
      steps: input.steps,
      examples: input.examples,
      change_summary: input.changeSummary,
      source: "human",
      created_by: auth.user?.id,
    });
    if (error) throw error;
    const sop = await this.getSop(sopId);
    if (!sop) throw new Error("SOP not found");
    return sop;
  }

  async listInsights(): Promise<AiInsight[]> {
    const orgId = await this.requireOrgId();
    const { data, error } = await this.db
      .from("ai_insights").select("*").eq("organization_id", orgId)
      .order("created_at", { ascending: false }).limit(50);
    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      id: row.id, organizationId: row.organization_id,
      channelId: row.channel_id ?? undefined, kind: row.kind,
      title: row.title, body: row.body,
      confidence: row.confidence ?? undefined, createdAt: row.created_at,
    }));
  }

  async listRecommendations(): Promise<AiRecommendation[]> {
    const orgId = await this.requireOrgId();
    const { data, error } = await this.db
      .from("ai_recommendations").select("*").eq("organization_id", orgId)
      .order("created_at", { ascending: false }).limit(50);
    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      id: row.id, organizationId: row.organization_id,
      insightId: row.insight_id ?? undefined,
      sopId: row.sop_id ?? undefined,
      proposedSopVersionId: row.proposed_sop_version_id ?? undefined,
      title: row.title, rationale: row.rationale, status: row.status,
      measuredImpact: row.measured_impact ?? undefined,
      outcomeNotes: row.outcome_notes ?? undefined,
      createdAt: row.created_at,
    }));
  }

  async setRecommendationStatus(id: string, status: RecommendationStatus): Promise<void> {
    const { data: auth } = await this.db.auth.getUser();
    const { error } = await this.db.from("ai_recommendations").update({
      status,
      decided_by: auth.user?.id,
      decided_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) throw error;
  }

  private mapReport(row: any): Report {
    return {
      id: row.id, organizationId: row.organization_id,
      channelId: row.channel_id ?? undefined, type: row.type, title: row.title,
      periodStart: row.period_start, periodEnd: row.period_end,
      contentMd: row.content_md, source: row.source, createdAt: row.created_at,
    };
  }

  async listReports(): Promise<Report[]> {
    const orgId = await this.requireOrgId();
    const { data, error } = await this.db
      .from("reports").select("*").eq("organization_id", orgId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row: any) => this.mapReport(row));
  }

  async getReport(id: string): Promise<Report | null> {
    const { data } = await this.db.from("reports").select("*").eq("id", id).single();
    return data ? this.mapReport(data) : null;
  }

  async generateReport(input: {
    type: ReportType; channelId?: string; periodStart: string; periodEnd: string;
  }): Promise<Report> {
    const orgId = await this.requireOrgId();
    const { data, error } = await this.db.functions.invoke("generate-report", {
      body: {
        organizationId: orgId,
        channelId: input.channelId,
        type: input.type,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
      },
    });
    if (error) throw error;
    const report = await this.getReport(data.id);
    if (!report) throw new Error("report generation failed");
    return report;
  }

  async listNotifications(): Promise<AppNotification[]> {
    const orgId = await this.requireOrgId();
    const { data, error } = await this.db
      .from("notifications").select("*").eq("organization_id", orgId)
      .order("created_at", { ascending: false }).limit(50);
    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      id: row.id, organizationId: row.organization_id, type: row.type,
      title: row.title, body: row.body ?? undefined,
      entityType: row.entity_type ?? undefined,
      entityId: row.entity_id ?? undefined,
      readAt: row.read_at ?? undefined, createdAt: row.created_at,
    }));
  }

  async markNotificationRead(id: string): Promise<void> {
    await this.db.from("notifications")
      .update({ read_at: new Date().toISOString() }).eq("id", id);
  }

  async listActivity(): Promise<ActivityItem[]> {
    const orgId = await this.requireOrgId();
    const { data, error } = await this.db
      .from("activity_log")
      .select("*, profiles:actor_id(display_name)")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false }).limit(25);
    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      id: row.id,
      actorName: row.profiles?.display_name ?? "System",
      action: row.action,
      entityType: row.entity_type,
      entityLabel: row.meta?.label ?? row.entity_type,
      createdAt: row.created_at,
    }));
  }

  async askCoach(message: string, _history: ChatMessage[]): Promise<CoachReply> {
    const orgId = await this.requireOrgId();
    const { data, error } = await this.db.functions.invoke("ai-coach", {
      body: { organizationId: orgId, message },
    });
    if (error) throw error;
    return { conversationId: data.conversationId, answer: data.answer };
  }
}

// Real backend implementation of DataProvider on top of Supabase.
// All access control is enforced server-side by RLS; this class only maps
// between snake_case rows and the camelCase domain types.

/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  BuilderBrollItem,
  ActivityItem,
  AiInsight,
  AiRecommendation,
  AppNotification,
  Channel,
  ChannelInput,
  ChatMessage,
  ContentProject,
  ContentProjectInput,
  DerivedShort,
  DraftResult,
  FeedbackRule,
  FeedbackRuleCategory,
  StudioFeedback,
  StudioPersona,
  StudioStep,
  ThumbnailVariant,
  GeneratedIdea,
  CoachReply,
  Comment,
  CommentEntityType,
  CommentInput,
  DiscordConfig,
  CompetitorChannel,
  CompetitorChannelInput,
  CompetitorScanResult,
  CompetitorTeardown,
  CompetitorVideo,
  CompetitorVideoInput,
  Idea,
  Invite,
  InviteInput,
  IdeaInput,
  Member,
  Organization,
  Production,
  ProductionInput,
  ProductionPatch,
  Profile,
  ProposedSopChange,
  RecommendationStatus,
  Report,
  ReportType,
  Sop,
  SopInput,
  SopVersion,
  SopVersionInput,
  SopWithHistory,
  Task,
  TaskInput,
  Video,
  VideoAnalytics,
  VideoInput,
  VideoMetrics,
  VideoMetricsInput,
  VideoWithHistory,
} from "@/types";
import type { DataProvider } from "./provider";
import { BUILTIN_PERSONAS } from "@/features/studio/personas";

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

function mapProposedChange(raw: any): ProposedSopChange | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  if (!raw.purpose || !Array.isArray(raw.steps)) return undefined;
  return {
    sopId: raw.sop_id ?? undefined,
    sopTitle: raw.sop_title ?? "New SOP",
    category: raw.category ?? undefined,
    purpose: raw.purpose,
    whenToUse: raw.when_to_use ?? undefined,
    steps: raw.steps,
    examples: raw.examples ?? undefined,
    changeSummary: raw.change_summary ?? "Proposed by the learning loop.",
  };
}

function mapInvite(row: any): Invite {
  return {
    id: row.id,
    code: row.code,
    email: row.email ?? undefined,
    role: row.role,
    expiresAt: row.expires_at,
    acceptedAt: row.accepted_at ?? undefined,
    createdAt: row.created_at,
  };
}

// Short, unambiguous invite code (no 0/O/1/I) — matches the demo provider.
function randomInviteCode(len = 8): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

function mapCompetitorChannel(row: any): CompetitorChannel {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    niche: row.niche ?? undefined,
    notes: row.notes ?? undefined,
    url: row.url ?? undefined,
    handle: row.handle ?? undefined,
    youtubeChannelId: row.youtube_channel_id ?? undefined,
    thumbnailUrl: row.thumbnail_url ?? undefined,
    subscriberCount: row.subscriber_count ?? undefined,
    trackedVideoCount: row.tracked_video_count ?? undefined,
    outlierCount: row.outlier_count ?? undefined,
    medianViewsPerDay: row.median_views_per_day ?? undefined,
    uploadCadenceDays: row.upload_cadence_days ?? undefined,
    lastScannedAt: row.last_scanned_at ?? undefined,
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
  private projectUrl: string;

  constructor(url: string, anonKey: string) {
    this.db = createClient(url, anonKey);
    this.projectUrl = url.replace(/\/$/, "");
  }

  get client(): SupabaseClient {
    return this.db;
  }

  /**
   * Invoke an edge function and surface ITS error message — supabase-js
   * otherwise collapses every failure into "non-2xx status code".
   */
  private async invokeFn<T>(name: string, body: Record<string, unknown>): Promise<T> {
    const { data, error } = await this.db.functions.invoke(name, { body });
    if (error) {
      const ctx = (error as any).context;
      if (ctx && typeof ctx.json === "function") {
        const payload = await ctx.json().catch(() => null);
        if (payload?.error) throw new Error(String(payload.error));
      }
      throw new Error(error.message ?? `${name} failed`);
    }
    if ((data as any)?.error) throw new Error(String((data as any).error));
    return data as T;
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

  async listInvites(): Promise<Invite[]> {
    const orgId = await this.requireOrgId();
    const { data, error } = await this.db
      .from("org_invites")
      .select("*")
      .eq("organization_id", orgId)
      .is("accepted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapInvite);
  }

  async createInvite(input: InviteInput): Promise<Invite> {
    const orgId = await this.requireOrgId();
    const { data: auth } = await this.db.auth.getUser();
    const code = randomInviteCode();
    const { data, error } = await this.db.from("org_invites").insert({
      organization_id: orgId,
      code,
      email: input.email,
      role: input.role,
      created_by: auth.user?.id,
    }).select("*").single();
    if (error) throw error;
    return mapInvite(data);
  }

  async revokeInvite(id: string): Promise<void> {
    const { error } = await this.db.from("org_invites").delete().eq("id", id);
    if (error) throw error;
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
      youtubeConnectedAt: row.youtube_connected_at ?? undefined,
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

  async createChannel(input: ChannelInput): Promise<Channel> {
    const orgId = await this.requireOrgId();
    const { data: auth } = await this.db.auth.getUser();
    const { data, error } = await this.db.from("channels").insert({
      organization_id: orgId,
      owner_id: auth.user?.id,
      name: input.name,
      brand: input.brand,
      niche: input.niche,
      upload_cadence: input.uploadCadence,
      description: input.description,
      youtube_channel_id: input.youtubeChannelId,
      created_by: auth.user?.id,
    }).select("*").single();
    if (error) throw error;
    return {
      id: data.id,
      organizationId: data.organization_id,
      name: data.name,
      ownerId: data.owner_id ?? undefined,
      brand: data.brand ?? undefined,
      niche: data.niche ?? undefined,
      uploadCadence: data.upload_cadence ?? undefined,
      description: data.description ?? undefined,
      youtubeChannelId: data.youtube_channel_id ?? undefined,
      youtubeConnectedAt: data.youtube_connected_at ?? undefined,
      goals: [],
      createdAt: data.created_at,
    };
  }

  async updateChannel(id: string, patch: Partial<ChannelInput>): Promise<Channel> {
    const update: Record<string, unknown> = {};
    if (patch.name !== undefined) update.name = patch.name;
    if (patch.brand !== undefined) update.brand = patch.brand;
    if (patch.niche !== undefined) update.niche = patch.niche;
    if (patch.uploadCadence !== undefined) update.upload_cadence = patch.uploadCadence;
    if (patch.description !== undefined) update.description = patch.description;
    if (patch.youtubeChannelId !== undefined) update.youtube_channel_id = patch.youtubeChannelId;
    const { error } = await this.db.from("channels").update(update).eq("id", id);
    if (error) throw error;
    const channel = await this.getChannel(id);
    if (!channel) throw new Error("channel not found");
    return channel;
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
      thumbnail_url: input.thumbnailUrl,
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

  async getVideoAnalytics(videoId: string): Promise<VideoAnalytics> {
    return this.invokeFn<VideoAnalytics>("youtube-analytics", { videoId });
  }

  async shareBrief(title: string, contentMd: string): Promise<string> {
    const orgId = await this.requireOrgId();
    const { data: auth } = await this.db.auth.getUser();
    const bytes = crypto.getRandomValues(new Uint8Array(18));
    const token = btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const { error } = await this.db.from("shared_briefs").insert({
      organization_id: orgId,
      token,
      title,
      content_md: contentMd,
      created_by: auth.user?.id,
    });
    if (error) throw error;
    return `${this.projectUrl}/functions/v1/share-brief?t=${token}`;
  }

  async connectYouTubeUrl(channelId: string): Promise<string> {
    const data = await this.invokeFn<{ authUrl?: string }>("youtube-oauth", {
      channelId,
      returnTo: window.location.href,
    });
    if (!data?.authUrl) throw new Error("Google OAuth isn't configured on the backend yet.");
    return data.authUrl;
  }

  async listCompetitorChannels(): Promise<CompetitorChannel[]> {
    const orgId = await this.requireOrgId();
    const { data, error } = await this.db
      .from("competitor_channels").select("*").eq("organization_id", orgId);
    if (error) throw error;
    return (data ?? []).map(mapCompetitorChannel);
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
        teardown: row.teardown ?? undefined,
        teardownAt: row.teardown_at ?? undefined,
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
      thumbnail_url: input.thumbnailUrl,
      published_at: input.publishedAt,
      topic: input.topic,
      hook: input.hook,
      story_structure: input.storyStructure,
      why_it_worked: input.whyItWorked,
      ai_observations: input.aiObservations,
      is_outlier: input.isOutlier ?? false,
      outlier_score: input.outlierScore,
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
      isOutlier: data.is_outlier ?? false,
      outlierScore: data.outlier_score ?? undefined,
      views: input.views,
      viewsPerDay: input.viewsPerDay,
    };
  }

  async createCompetitorChannel(input: CompetitorChannelInput): Promise<CompetitorChannel> {
    const orgId = await this.requireOrgId();
    const { data: auth } = await this.db.auth.getUser();
    const { data, error } = await this.db.from("competitor_channels").insert({
      organization_id: orgId,
      name: input.name,
      url: input.url,
      niche: input.niche,
      notes: input.notes,
      created_by: auth.user?.id,
    }).select("*").single();
    if (error) throw error;
    return mapCompetitorChannel(data);
  }

  async updateCompetitorChannel(
    id: string,
    patch: Partial<CompetitorChannel>,
  ): Promise<CompetitorChannel> {
    const dbPatch: Record<string, unknown> = {};
    if (patch.name !== undefined) dbPatch.name = patch.name;
    if (patch.niche !== undefined) dbPatch.niche = patch.niche;
    if (patch.notes !== undefined) dbPatch.notes = patch.notes;
    if (patch.url !== undefined) dbPatch.url = patch.url;
    if (patch.handle !== undefined) dbPatch.handle = patch.handle;
    if (patch.youtubeChannelId !== undefined) dbPatch.youtube_channel_id = patch.youtubeChannelId;
    if (patch.thumbnailUrl !== undefined) dbPatch.thumbnail_url = patch.thumbnailUrl;
    if (patch.subscriberCount !== undefined) dbPatch.subscriber_count = patch.subscriberCount;
    if (patch.trackedVideoCount !== undefined) dbPatch.tracked_video_count = patch.trackedVideoCount;
    if (patch.outlierCount !== undefined) dbPatch.outlier_count = patch.outlierCount;
    if (patch.medianViewsPerDay !== undefined) dbPatch.median_views_per_day = patch.medianViewsPerDay;
    if (patch.uploadCadenceDays !== undefined) dbPatch.upload_cadence_days = patch.uploadCadenceDays;
    if (patch.lastScannedAt !== undefined) dbPatch.last_scanned_at = patch.lastScannedAt;
    const { data, error } = await this.db
      .from("competitor_channels").update(dbPatch).eq("id", id).select("*").single();
    if (error) throw error;
    return mapCompetitorChannel(data);
  }

  async scanCompetitorChannel(channelId: string): Promise<CompetitorScanResult> {
    return this.invokeFn<CompetitorScanResult>("competitor-scan", { channelId });
  }

  async generateTeardown(
    competitorVideoId: string,
    targetChannelId?: string,
  ): Promise<CompetitorTeardown> {
    const organizationId = await this.requireOrgId();
    const teardown = await this.invokeFn<CompetitorTeardown>("competitor-teardown", {
      organizationId, competitorVideoId, targetChannelId,
    });
    // Persist the analysis onto the video so it sticks in the table — and the
    // full teardown, which the learning loop synthesizes every 20 teardowns.
    await this.db.from("competitor_videos").update({
      why_it_worked: teardown.whyItWorked,
      ai_observations: teardown.observations,
      teardown,
      teardown_at: new Date().toISOString(),
    }).eq("id", competitorVideoId);
    return teardown;
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

  async generateIdeas(channelId?: string, count = 6): Promise<GeneratedIdea[]> {
    const orgId = await this.requireOrgId();
    const data = await this.invokeFn<{ ideas?: GeneratedIdea[] }>("ai-ideas", {
      organizationId: orgId, channelId, count,
    });
    return data?.ideas ?? [];
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

  private mapProduction(row: any): Production {
    return {
      id: row.id,
      organizationId: row.organization_id,
      channelId: row.channel_id,
      title: row.title,
      stage: row.stage,
      format: row.format ?? "long_form",
      assigneeId: row.assignee_id ?? undefined,
      dueDate: row.due_date ?? undefined,
      scheduledAt: row.scheduled_at ?? undefined,
      topic: row.topic ?? undefined,
      goal: row.goal ?? undefined,
      goalMetric: row.goal_metric ?? undefined,
      goalTarget: row.goal_target ?? undefined,
      hookText: row.hook_text ?? undefined,
      scriptHook: row.script_hook ?? undefined,
      scriptBody: row.script_body ?? undefined,
      scriptOutro: row.script_outro ?? undefined,
      description: row.description ?? undefined,
      titleCandidates: Array.isArray(row.title_candidates) ? row.title_candidates : [],
      thumbnailConcept: row.thumbnail_concept ?? undefined,
      referenceLinks: Array.isArray(row.reference_links) ? row.reference_links : [],
      voStatus: row.vo_status ?? undefined,
      assetLinks: Array.isArray(row.asset_links) ? row.asset_links : [],
      checklists: row.checklists ?? {},
      notes: row.notes ?? undefined,
      builder: row.builder ?? undefined,
      linkedVideoId: row.linked_video_id ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private productionPatchToRow(patch: ProductionPatch): Record<string, unknown> {
    const map: Array<[keyof ProductionPatch, string]> = [
      ["channelId", "channel_id"], ["title", "title"], ["stage", "stage"],
      ["format", "format"],
      ["assigneeId", "assignee_id"], ["dueDate", "due_date"],
      ["scheduledAt", "scheduled_at"], ["topic", "topic"], ["goal", "goal"],
      ["goalMetric", "goal_metric"], ["goalTarget", "goal_target"],
      ["hookText", "hook_text"], ["scriptHook", "script_hook"],
      ["scriptBody", "script_body"], ["scriptOutro", "script_outro"],
      ["description", "description"], ["titleCandidates", "title_candidates"],
      ["thumbnailConcept", "thumbnail_concept"], ["referenceLinks", "reference_links"],
      ["voStatus", "vo_status"], ["assetLinks", "asset_links"],
      ["checklists", "checklists"], ["notes", "notes"], ["builder", "builder"],
    ];
    const row: Record<string, unknown> = {};
    for (const [from, to] of map) {
      if (patch[from] !== undefined) row[to] = patch[from];
    }
    return row;
  }

  async listProductions(): Promise<Production[]> {
    const orgId = await this.requireOrgId();
    const { data, error } = await this.db
      .from("productions").select("*").eq("organization_id", orgId)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row: any) => this.mapProduction(row));
  }

  async getProduction(id: string): Promise<Production | null> {
    const { data } = await this.db.from("productions").select("*").eq("id", id).single();
    return data ? this.mapProduction(data) : null;
  }

  async createProduction(input: ProductionInput): Promise<Production> {
    const orgId = await this.requireOrgId();
    const { data: auth } = await this.db.auth.getUser();
    const { data, error } = await this.db.from("productions").insert({
      organization_id: orgId,
      channel_id: input.channelId,
      title: input.title,
      format: input.format ?? "long_form",
      topic: input.topic,
      assignee_id: input.assigneeId ?? auth.user?.id,
      due_date: input.dueDate,
      created_by: auth.user?.id,
    }).select("*").single();
    if (error) throw error;
    return this.mapProduction(data);
  }

  async updateProduction(id: string, patch: ProductionPatch): Promise<Production> {
    const { data, error } = await this.db
      .from("productions")
      .update(this.productionPatchToRow(patch))
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return this.mapProduction(data);
  }

  async draftProduction(production: Production): Promise<DraftResult> {
    const orgId = await this.requireOrgId();
    return this.invokeFn<DraftResult>("ai-write", {
      organizationId: orgId, productionId: production.id,
    });
  }

  async deriveShorts(productionId: string, count: number): Promise<Production[]> {
    const orgId = await this.requireOrgId();
    const source = await this.getProduction(productionId);
    if (!source) throw new Error("production not found");
    const data = await this.invokeFn<{ shorts?: DerivedShort[] }>("ai-shorts", {
      organizationId: orgId, productionId, count,
    });
    const shorts = data?.shorts ?? [];
    if (!shorts.length) throw new Error("No shorts came back — write more script first");

    const { data: auth } = await this.db.auth.getUser();
    const rows = shorts.map((s) => ({
      organization_id: orgId,
      channel_id: source.channelId,
      title: s.title,
      format: "short",
      stage: "scripting",
      topic: source.topic,
      hook_text: s.hook,
      script_body: s.script,
      notes: [
        s.onScreenText ? `On-screen text: ${s.onScreenText}` : "",
        `Derived from: ${source.title}`,
      ].filter(Boolean).join("\n"),
      assignee_id: source.assigneeId ?? auth.user?.id,
      created_by: auth.user?.id,
    }));
    const { data: created, error } = await this.db
      .from("productions").insert(rows).select("*");
    if (error) throw error;
    return (created ?? []).map((r: any) => this.mapProduction(r));
  }

  async publishToYouTube(productionId: string): Promise<{ videoUrl: string; simulated: boolean }> {
    const orgId = await this.requireOrgId();
    const data = await this.invokeFn<{ videoUrl: string }>("youtube-upload", {
      organizationId: orgId, productionId,
    });
    return { videoUrl: data.videoUrl, simulated: false };
  }

  async searchBroll(query: string): Promise<BuilderBrollItem[]> {
    const data = await this.invokeFn<{ items?: BuilderBrollItem[] }>("broll-search", {
      query,
    });
    return data?.items ?? [];
  }

  async publishProduction(id: string): Promise<Production> {
    const prod = await this.getProduction(id);
    if (!prod) throw new Error("production not found");
    let linkedVideoId = prod.linkedVideoId;
    if (!linkedVideoId) {
      const starred = prod.titleCandidates.find((t) => t.starred)?.text ?? prod.title;
      const video = await this.createVideo({
        channelId: prod.channelId,
        title: starred,
        topic: prod.topic,
        publishedAt: new Date().toISOString(),
        format: prod.format ?? "long_form",
        manualNotes: prod.goal ? `Goal: ${prod.goal}` : undefined,
      });
      linkedVideoId = video.id;
      await this.db.from("productions").update({ linked_video_id: linkedVideoId }).eq("id", id);
    }
    // The publish-gate trigger enforces owner/admin server-side.
    return this.updateProduction(id, { stage: "published" });
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
      proposedChange: mapProposedChange(row.proposed_change),
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

  async approveRecommendation(id: string): Promise<SopWithHistory> {
    const { data: row, error } = await this.db
      .from("ai_recommendations").select("*").eq("id", id).single();
    if (error) throw error;
    const pc = mapProposedChange(row.proposed_change);
    if (!pc) throw new Error("This recommendation has no proposed SOP change to apply");

    // Write the drafted change as a new SOP version (append-only), or a new SOP.
    let sop: SopWithHistory;
    if (pc.sopId) {
      sop = await this.addSopVersion(pc.sopId, {
        purpose: pc.purpose, whenToUse: pc.whenToUse, steps: pc.steps,
        examples: pc.examples, changeSummary: pc.changeSummary,
      });
    } else {
      const created = await this.createSop({
        title: pc.sopTitle, category: pc.category,
        purpose: pc.purpose, whenToUse: pc.whenToUse,
        steps: pc.steps, examples: pc.examples,
      });
      sop = await this.getSop(created.id) as SopWithHistory;
    }

    const { data: auth } = await this.db.auth.getUser();
    const { error: upErr } = await this.db.from("ai_recommendations").update({
      status: "accepted",
      sop_id: sop.id,
      proposed_sop_version_id: sop.currentVersion?.id,
      decided_by: auth.user?.id,
      decided_at: new Date().toISOString(),
    }).eq("id", id);
    if (upErr) throw upErr;
    return sop;
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
    const data = await this.invokeFn<{ id: string }>("generate-report", {
      organizationId: orgId,
      channelId: input.channelId,
      type: input.type,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
    });
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

  async listComments(entityType: CommentEntityType, entityId: string): Promise<Comment[]> {
    const { data, error } = await this.db
      .from("comments")
      .select("*, profiles:author_id(id, display_name, avatar_url)")
      .eq("entity_type", entityType).eq("entity_id", entityId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      id: row.id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      author: {
        id: row.profiles?.id ?? row.author_id,
        displayName: row.profiles?.display_name ?? "Teammate",
        avatarUrl: row.profiles?.avatar_url ?? undefined,
      },
      body: row.body,
      mentions: row.mentions ?? [],
      createdAt: row.created_at,
    }));
  }

  async addComment(input: CommentInput): Promise<Comment> {
    const orgId = await this.requireOrgId();
    const { data: auth } = await this.db.auth.getUser();
    const mentions = input.mentions ?? [];
    const { data, error } = await this.db.from("comments").insert({
      organization_id: orgId,
      entity_type: input.entityType,
      entity_id: input.entityId,
      author_id: auth.user?.id,
      body: input.body,
      mentions,
    }).select("*, profiles:author_id(id, display_name, avatar_url)").single();
    if (error) throw error;

    // Notify each mentioned teammate (skip self).
    const authorName = data.profiles?.display_name ?? "A teammate";
    const rows = mentions
      .filter((uid) => uid !== auth.user?.id)
      .map((uid) => ({
        organization_id: orgId, user_id: uid, type: "system" as const,
        title: `${authorName} mentioned you`,
        body: input.body.slice(0, 140),
        entity_type: input.entityType, entity_id: input.entityId,
      }));
    if (rows.length) await this.db.from("notifications").insert(rows);

    return {
      id: data.id, entityType: data.entity_type, entityId: data.entity_id,
      author: {
        id: data.profiles?.id ?? data.author_id,
        displayName: authorName,
        avatarUrl: data.profiles?.avatar_url ?? undefined,
      },
      body: data.body, mentions: data.mentions ?? [], createdAt: data.created_at,
    };
  }

  async deleteComment(id: string): Promise<void> {
    const { error } = await this.db.from("comments").delete().eq("id", id);
    if (error) throw error;
  }

  private mapTask(row: any): Task {
    return {
      id: row.id, organizationId: row.organization_id,
      title: row.title, notes: row.notes ?? undefined,
      status: row.status,
      assigneeId: row.assignee_id ?? undefined,
      assigneeName: row.profiles?.display_name ?? undefined,
      dueAt: row.due_at ?? undefined,
      createdBy: row.created_by ?? undefined,
      createdAt: row.created_at,
    };
  }

  async listTasks(): Promise<Task[]> {
    const orgId = await this.requireOrgId();
    const { data, error } = await this.db
      .from("tasks").select("*, profiles:assignee_id(display_name)")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r: any) => this.mapTask(r));
  }

  async createTask(input: TaskInput): Promise<Task> {
    const orgId = await this.requireOrgId();
    const { data: auth } = await this.db.auth.getUser();
    const { data, error } = await this.db.from("tasks").insert({
      organization_id: orgId,
      title: input.title,
      notes: input.notes,
      status: input.status ?? "todo",
      assignee_id: input.assigneeId,
      due_at: input.dueAt,
      created_by: auth.user?.id,
    }).select("*, profiles:assignee_id(display_name)").single();
    if (error) throw error;
    return this.mapTask(data);
  }

  async updateTask(id: string, patch: Partial<TaskInput>): Promise<Task> {
    const row: Record<string, unknown> = {};
    if (patch.title !== undefined) row.title = patch.title;
    if (patch.notes !== undefined) row.notes = patch.notes;
    if (patch.status !== undefined) row.status = patch.status;
    if (patch.assigneeId !== undefined) row.assignee_id = patch.assigneeId || null;
    if (patch.dueAt !== undefined) row.due_at = patch.dueAt || null;
    const { data, error } = await this.db.from("tasks").update(row).eq("id", id)
      .select("*, profiles:assignee_id(display_name)").single();
    if (error) throw error;
    return this.mapTask(data);
  }

  async deleteTask(id: string): Promise<void> {
    const { error } = await this.db.from("tasks").delete().eq("id", id);
    if (error) throw error;
  }

  async getDiscordConfig(): Promise<DiscordConfig | null> {
    const orgId = await this.requireOrgId();
    const { data } = await this.db.from("integrations")
      .select("config, enabled").eq("organization_id", orgId).eq("provider", "discord")
      .maybeSingle();
    const cfg = data?.config as DiscordConfig | undefined;
    return cfg?.webhookUrl ? { webhookUrl: cfg.webhookUrl, userIds: cfg.userIds ?? {} } : null;
  }

  async saveDiscordConfig(config: DiscordConfig): Promise<void> {
    const orgId = await this.requireOrgId();
    const { data: auth } = await this.db.auth.getUser();
    const { error } = await this.db.from("integrations").upsert(
      {
        organization_id: orgId,
        provider: "discord",
        config,
        enabled: !!config.webhookUrl,
        created_by: auth.user?.id,
      },
      { onConflict: "organization_id,provider" },
    );
    if (error) throw error;
  }

  async deleteChannel(id: string): Promise<void> {
    // Cascades to the channel's videos + snapshots (SQL foreign keys).
    const { error } = await this.db.from("channels").delete().eq("id", id);
    if (error) throw error;
  }

  async deleteCompetitorChannel(id: string): Promise<void> {
    const { error } = await this.db.from("competitor_channels").delete().eq("id", id);
    if (error) throw error;
  }

  async deleteProduction(id: string): Promise<void> {
    const { error } = await this.db.from("productions").delete().eq("id", id);
    if (error) throw error;
  }

  async deleteVideo(id: string): Promise<void> {
    // Cascades to the video's metric snapshots (migration 0017 lets whole-
    // entity deletes pass the append-only guard).
    const { error } = await this.db.from("videos").delete().eq("id", id);
    if (error) throw error;
  }


  // ------------------------------------------------------------------
  // Modern Ambition Content Studio
  // ------------------------------------------------------------------

  private mapContentProject(row: any): ContentProject {
    return {
      id: row.id,
      organizationId: row.organization_id,
      channelId: row.channel_id ?? undefined,
      topic: row.topic,
      status: row.status,
      primaryPersona: row.primary_persona ?? undefined,
      secondaryPersona: row.secondary_persona ?? undefined,
      videoLengthMinutes: row.video_length_minutes ?? 15,
      relevance: row.relevance ?? undefined,
      research: row.research ?? undefined,
      titleLab: row.title_lab ?? undefined,
      selectedTitle: row.selected_title ?? undefined,
      thumbnailLab: row.thumbnail_lab ?? undefined,
      selectedThumbnail: row.selected_thumbnail ?? undefined,
      thumbnailVariants: Array.isArray(row.thumbnail_variants) ? row.thumbnail_variants : [],
      outline: row.outline ?? undefined,
      script: row.script ?? undefined,
      critique: row.critique ?? undefined,
      factChecks: Array.isArray(row.fact_checks) ? row.fact_checks : undefined,
      feedback: row.feedback ?? undefined,
      linkedProductionId: row.linked_production_id ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private contentPatchToRow(patch: Partial<ContentProject>): Record<string, unknown> {
    const map: Array<[keyof ContentProject, string]> = [
      ["channelId", "channel_id"], ["topic", "topic"], ["status", "status"],
      ["primaryPersona", "primary_persona"], ["secondaryPersona", "secondary_persona"],
      ["videoLengthMinutes", "video_length_minutes"], ["relevance", "relevance"],
      ["research", "research"], ["titleLab", "title_lab"],
      ["selectedTitle", "selected_title"], ["thumbnailLab", "thumbnail_lab"],
      ["selectedThumbnail", "selected_thumbnail"], ["thumbnailVariants", "thumbnail_variants"],
      ["outline", "outline"], ["script", "script"], ["critique", "critique"],
      ["factChecks", "fact_checks"],
      ["feedback", "feedback"], ["linkedProductionId", "linked_production_id"],
    ];
    const row: Record<string, unknown> = {};
    for (const [from, to] of map) {
      if (patch[from] !== undefined) row[to] = patch[from];
    }
    return row;
  }

  async listContentProjects(): Promise<ContentProject[]> {
    const orgId = await this.requireOrgId();
    const { data, error } = await this.db
      .from("content_projects").select("*").eq("organization_id", orgId)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r: any) => this.mapContentProject(r));
  }

  async getContentProject(id: string): Promise<ContentProject | null> {
    const { data } = await this.db
      .from("content_projects").select("*").eq("id", id).single();
    return data ? this.mapContentProject(data) : null;
  }

  async createContentProject(input: ContentProjectInput): Promise<ContentProject> {
    const orgId = await this.requireOrgId();
    const { data: auth } = await this.db.auth.getUser();
    const { data, error } = await this.db.from("content_projects").insert({
      organization_id: orgId,
      channel_id: input.channelId ?? null,
      topic: input.topic,
      primary_persona: input.primaryPersona ?? null,
      secondary_persona: input.secondaryPersona ?? null,
      video_length_minutes: input.videoLengthMinutes ?? 15,
      created_by: auth.user?.id,
    }).select("*").single();
    if (error) throw error;
    return this.mapContentProject(data);
  }

  async updateContentProject(
    id: string,
    patch: Partial<ContentProject>,
  ): Promise<ContentProject> {
    const { data, error } = await this.db
      .from("content_projects")
      .update(this.contentPatchToRow(patch))
      .eq("id", id).select("*").single();
    if (error) throw error;
    return this.mapContentProject(data);
  }

  async deleteContentProject(id: string): Promise<void> {
    const { error } = await this.db.from("content_projects").delete().eq("id", id);
    if (error) throw error;
  }

  async runStudioStep(projectId: string, step: StudioStep): Promise<ContentProject> {
    const orgId = await this.requireOrgId();
    // The edge function loads the project, injects channel identity, personas
    // and active Script Bible rules, runs Claude, writes the artifact back,
    // and returns the updated row.
    const data = await this.invokeFn<{ project: any }>("content-studio", {
      organizationId: orgId, projectId, step,
    });
    return this.mapContentProject(data.project);
  }

  async listStudioPersonas(): Promise<StudioPersona[]> {
    const orgId = await this.requireOrgId();
    const { data } = await this.db
      .from("content_personas").select("*").eq("organization_id", orgId)
      .order("created_at");
    const ai: StudioPersona[] = (data ?? []).map((r: any) => ({
      id: r.id,
      name: r.name,
      ageRange: r.definition?.ageRange ?? undefined,
      description: r.definition?.description ?? "",
      respondsTo: r.definition?.respondsTo ?? [],
      source: "ai",
      active: r.active,
    }));
    return [...BUILTIN_PERSONAS, ...ai];
  }

  async listFeedbackRules(): Promise<FeedbackRule[]> {
    const orgId = await this.requireOrgId();
    const { data, error } = await this.db
      .from("feedback_rules").select("*").eq("organization_id", orgId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r: any) => ({
      id: r.id,
      category: r.category,
      rule: r.rule,
      sourceFeedback: r.source_feedback ?? undefined,
      active: r.active,
      createdAt: r.created_at,
    }));
  }

  async addFeedbackRule(input: {
    category: FeedbackRuleCategory;
    rule: string;
    sourceFeedback?: string;
  }): Promise<FeedbackRule> {
    const orgId = await this.requireOrgId();
    const { data: auth } = await this.db.auth.getUser();
    const { data, error } = await this.db.from("feedback_rules").insert({
      organization_id: orgId,
      category: input.category,
      rule: input.rule,
      source_feedback: input.sourceFeedback ?? null,
      created_by: auth.user?.id,
    }).select("*").single();
    if (error) throw error;
    return {
      id: data.id, category: data.category, rule: data.rule,
      sourceFeedback: data.source_feedback ?? undefined,
      active: data.active, createdAt: data.created_at,
    };
  }

  async setFeedbackRuleActive(id: string, active: boolean): Promise<void> {
    const { error } = await this.db.from("feedback_rules").update({ active }).eq("id", id);
    if (error) throw error;
  }

  async deleteFeedbackRule(id: string): Promise<void> {
    const { error } = await this.db.from("feedback_rules").delete().eq("id", id);
    if (error) throw error;
  }

  async submitStudioFeedback(
    projectId: string,
    feedback: StudioFeedback,
  ): Promise<{ project: ContentProject; rules: FeedbackRule[] }> {
    const orgId = await this.requireOrgId();
    await this.updateContentProject(projectId, { feedback, status: "done" });
    // Claude distills the notes into reusable rules and inserts them; it also
    // checks the 30/100 persona-unlock milestones.
    const data = await this.invokeFn<{ project: any; rules: any[] }>("content-studio", {
      organizationId: orgId, projectId, step: "feedbackRules", feedback,
    });
    return {
      project: this.mapContentProject(data.project),
      rules: (data.rules ?? []).map((r: any) => ({
        id: r.id, category: r.category, rule: r.rule,
        sourceFeedback: r.source_feedback ?? undefined,
        active: r.active ?? true, createdAt: r.created_at,
      })),
    };
  }

  async saveThumbnailVariant(
    projectId: string,
    variant: Omit<ThumbnailVariant, "id" | "createdAt">,
  ): Promise<ContentProject> {
    const project = await this.getContentProject(projectId);
    if (!project) throw new Error("project not found");
    const existing = variant.selected
      ? project.thumbnailVariants.map((v) => ({ ...v, selected: false }))
      : project.thumbnailVariants;
    const next: ThumbnailVariant = {
      ...variant,
      id: `thv_${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`,
      createdAt: new Date().toISOString(),
    };
    return this.updateContentProject(projectId, {
      thumbnailVariants: [...existing, next],
    });
  }

  async generateThumbnailImage(
    projectId: string,
    conceptName: string,
  ): Promise<ContentProject> {
    const orgId = await this.requireOrgId();
    // Gemini renders the concept's image prompt server-side (GEMINI_API_KEY
    // as an edge-function secret — never in the client). Missing key returns
    // setup instructions in the error message instead of breaking.
    const data = await this.invokeFn<{ imageUrl: string; prompt: string }>(
      "thumbnail-image",
      { organizationId: orgId, projectId, conceptName },
    );
    const project = await this.getContentProject(projectId);
    return this.saveThumbnailVariant(projectId, {
      provider: "gemini",
      conceptName,
      imageUrl: data.imageUrl,
      prompt: data.prompt,
      pairedTitle: project?.selectedTitle,
      relevanceScore: project?.thumbnailLab?.concepts.find(
        (c) => c.conceptName === conceptName,
      )?.relevanceScore,
      selected: (project?.thumbnailVariants.length ?? 0) === 0,
    });
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
    const data = await this.invokeFn<{ conversationId: string; answer: string }>("ai-coach", {
      organizationId: orgId, message,
    });
    return { conversationId: data.conversationId, answer: data.answer };
  }

  async runLearningLoop() {
    const data = await this.invokeFn<{ results?: Array<{ insights?: number; recommendations?: number }> }>(
      "learning-loop", {},
    );
    const results = data?.results ?? [];
    const insights = results.reduce((a, r) => a + (r.insights ?? 0), 0);
    const recommendations = results.reduce((a, r) => a + (r.recommendations ?? 0), 0);
    return { insights, recommendations, notifications: 0 };
  }

  resetLocalData() {
    // Real backend — nothing local to reset.
  }
}

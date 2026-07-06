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
  ChannelInput,
  ChatMessage,
  DraftResult,
  GeneratedIdea,
  CoachReply,
  CompetitorChannel,
  CompetitorChannelInput,
  CompetitorScanResult,
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
    const { data, error } = await this.db.functions.invoke("competitor-scan", {
      body: { channelId },
    });
    if (error) throw new Error(error.message ?? "Competitor scan failed");
    return data as CompetitorScanResult;
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
    const { data, error } = await this.db.functions.invoke("ai-ideas", {
      body: { organizationId: orgId, channelId, count },
    });
    if (error) throw error;
    return (data?.ideas ?? []) as GeneratedIdea[];
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
      linkedVideoId: row.linked_video_id ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private productionPatchToRow(patch: ProductionPatch): Record<string, unknown> {
    const map: Array<[keyof ProductionPatch, string]> = [
      ["channelId", "channel_id"], ["title", "title"], ["stage", "stage"],
      ["assigneeId", "assignee_id"], ["dueDate", "due_date"],
      ["scheduledAt", "scheduled_at"], ["topic", "topic"], ["goal", "goal"],
      ["goalMetric", "goal_metric"], ["goalTarget", "goal_target"],
      ["hookText", "hook_text"], ["scriptHook", "script_hook"],
      ["scriptBody", "script_body"], ["scriptOutro", "script_outro"],
      ["description", "description"], ["titleCandidates", "title_candidates"],
      ["thumbnailConcept", "thumbnail_concept"], ["referenceLinks", "reference_links"],
      ["voStatus", "vo_status"], ["assetLinks", "asset_links"],
      ["checklists", "checklists"], ["notes", "notes"],
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
    const { data, error } = await this.db.functions.invoke("ai-write", {
      body: { organizationId: orgId, productionId: production.id },
    });
    if (error) throw error;
    return data as DraftResult;
  }

  async publishToYouTube(productionId: string): Promise<{ videoUrl: string; simulated: boolean }> {
    const orgId = await this.requireOrgId();
    const { data, error } = await this.db.functions.invoke("youtube-upload", {
      body: { organizationId: orgId, productionId },
    });
    if (error) throw error;
    return { videoUrl: data.videoUrl, simulated: false };
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
        format: "long_form",
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

  async runLearningLoop() {
    const { data, error } = await this.db.functions.invoke("learning-loop", { body: {} });
    if (error) throw error;
    const results: Array<{ insights?: number; recommendations?: number }> = data?.results ?? [];
    const insights = results.reduce((a, r) => a + (r.insights ?? 0), 0);
    const recommendations = results.reduce((a, r) => a + (r.recommendations ?? 0), 0);
    return { insights, recommendations, notifications: 0 };
  }

  resetLocalData() {
    // Real backend — nothing local to reset.
  }
}

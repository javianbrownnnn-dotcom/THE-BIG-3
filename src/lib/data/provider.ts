import type {
  ActivityItem,
  AiInsight,
  AiRecommendation,
  AppNotification,
  Channel,
  ChannelInput,
  ChatMessage,
  CoachReply,
  CompetitorChannel,
  CompetitorVideo,
  CompetitorVideoInput,
  Idea,
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
  SopVersionInput,
  SopWithHistory,
  Video,
  VideoInput,
  VideoMetricsInput,
  VideoWithHistory,
} from "@/types";

/**
 * Every screen talks to this interface, never to Supabase directly.
 * Two implementations exist:
 *   - SupabaseProvider: the real backend (auth + RLS + edge functions).
 *   - DemoProvider: seeded in-memory data so the product runs with zero setup.
 * The swap is decided once at startup by environment configuration.
 */
export interface DataProvider {
  readonly isDemo: boolean;

  getCurrentUser(): Promise<Profile>;
  getOrganization(): Promise<Organization>;
  listMembers(): Promise<Member[]>;

  listChannels(): Promise<Channel[]>;
  getChannel(id: string): Promise<Channel | null>;
  createChannel(input: ChannelInput): Promise<Channel>;
  updateChannel(id: string, patch: Partial<ChannelInput>): Promise<Channel>;

  listVideos(filter?: { channelId?: string }): Promise<Video[]>;
  getVideo(id: string): Promise<VideoWithHistory | null>;
  createVideo(input: VideoInput, metrics?: VideoMetricsInput): Promise<Video>;
  addVideoSnapshot(videoId: string, metrics: VideoMetricsInput): Promise<void>;

  listCompetitorChannels(): Promise<CompetitorChannel[]>;
  listCompetitorVideos(filter?: {
    onlyOutliers?: boolean;
  }): Promise<CompetitorVideo[]>;
  createCompetitorVideo(input: CompetitorVideoInput): Promise<CompetitorVideo>;

  listIdeas(): Promise<Idea[]>;
  createIdea(input: IdeaInput): Promise<Idea>;
  updateIdea(id: string, patch: Partial<IdeaInput>): Promise<Idea>;

  // Production workspace: the shared video documents + pipeline.
  listProductions(): Promise<Production[]>;
  getProduction(id: string): Promise<Production | null>;
  createProduction(input: ProductionInput): Promise<Production>;
  updateProduction(id: string, patch: ProductionPatch): Promise<Production>;
  /**
   * Move to published: creates the linked `videos` row (where real metrics
   * accumulate) and stamps stage/publishedAt. Owner/admin only — enforced
   * in the database for the real backend, checked in-app for demo.
   */
  publishProduction(id: string): Promise<Production>;

  listSops(): Promise<Sop[]>;
  getSop(id: string): Promise<SopWithHistory | null>;
  createSop(input: SopInput): Promise<Sop>;
  addSopVersion(sopId: string, input: SopVersionInput): Promise<SopWithHistory>;

  listInsights(): Promise<AiInsight[]>;
  listRecommendations(): Promise<AiRecommendation[]>;
  setRecommendationStatus(
    id: string,
    status: RecommendationStatus,
  ): Promise<void>;

  listReports(): Promise<Report[]>;
  getReport(id: string): Promise<Report | null>;
  generateReport(input: {
    type: ReportType;
    channelId?: string;
    periodStart: string;
    periodEnd: string;
  }): Promise<Report>;

  listNotifications(): Promise<AppNotification[]>;
  markNotificationRead(id: string): Promise<void>;

  listActivity(): Promise<ActivityItem[]>;

  askCoach(message: string, history: ChatMessage[]): Promise<CoachReply>;

  /**
   * Run one iteration of the learning loop now (it also runs on a schedule):
   * detect metric shifts and competitor outliers, generate insights and
   * recommendations, notify. Returns what was produced.
   */
  runLearningLoop(): Promise<{
    insights: number;
    recommendations: number;
    notifications: number;
  }>;

  /** Demo mode only: wipe locally persisted edits back to the seed. */
  resetLocalData(): void;
}

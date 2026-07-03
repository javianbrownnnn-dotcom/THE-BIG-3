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
}

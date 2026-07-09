import type {
  BuilderBrollItem,
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
  Comment,
  CommentEntityType,
  CommentInput,
  CompetitorChannel,
  CompetitorChannelInput,
  CompetitorScanResult,
  CompetitorTeardown,
  ContentProject,
  ContentProjectInput,
  DiscordConfig,
  FeedbackRule,
  FeedbackRuleCategory,
  StudioFeedback,
  StudioPersona,
  StudioStep,
  ThumbnailVariant,
  Invite,
  InviteInput,
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
  Task,
  TaskInput,
  SopVersionInput,
  SopWithHistory,
  Video,
  VideoAnalytics,
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
  /** Team invites (live mode). Admins mint a code an invitee redeems to join. */
  listInvites(): Promise<Invite[]>;
  createInvite(input: InviteInput): Promise<Invite>;
  revokeInvite(id: string): Promise<void>;

  listChannels(): Promise<Channel[]>;
  getChannel(id: string): Promise<Channel | null>;
  createChannel(input: ChannelInput): Promise<Channel>;
  updateChannel(id: string, patch: Partial<ChannelInput>): Promise<Channel>;

  listVideos(filter?: { channelId?: string }): Promise<Video[]>;
  getVideo(id: string): Promise<VideoWithHistory | null>;
  createVideo(input: VideoInput, metrics?: VideoMetricsInput): Promise<Video>;
  addVideoSnapshot(videoId: string, metrics: VideoMetricsInput): Promise<void>;
  /**
   * Deep audience analytics for a video: retention curve, traffic sources,
   * impressions/CTR. Live mode routes to the youtube-analytics edge function
   * (channel-owner OAuth); demo mode returns a realistic simulated shape.
   */
  getVideoAnalytics(videoId: string): Promise<VideoAnalytics>;
  /**
   * Start the YouTube OAuth connect for a channel (analytics + upload): returns
   * the Google consent URL to open. Live mode only — needs the Google OAuth
   * secrets configured on the backend.
   */
  connectYouTubeUrl(channelId: string): Promise<string>;

  /**
   * Freeze a markdown idea brief behind a public unguessable-token URL that an
   * outside AI (ChatGPT etc.) can fetch. Live mode only; demo copies instead.
   */
  shareBrief(title: string, contentMd: string): Promise<string>;

  listCompetitorChannels(): Promise<CompetitorChannel[]>;
  listCompetitorVideos(filter?: {
    onlyOutliers?: boolean;
  }): Promise<CompetitorVideo[]>;
  createCompetitorVideo(input: CompetitorVideoInput): Promise<CompetitorVideo>;
  /** Track a whole channel in the niche (not just one video). */
  createCompetitorChannel(input: CompetitorChannelInput): Promise<CompetitorChannel>;
  updateCompetitorChannel(
    id: string,
    patch: Partial<CompetitorChannel>,
  ): Promise<CompetitorChannel>;
  /**
   * Scan a competitor channel's recent uploads in bulk and flag outliers.
   * Demo mode simulates a believable batch; live mode routes to the
   * competitor-scan edge function (server-side YouTube API). The client can
   * also run a real scan itself with a stored API key via
   * scanCompetitorFromYouTube (features/competitors/liveScan.ts).
   */
  scanCompetitorChannel(channelId: string): Promise<CompetitorScanResult>;
  /**
   * AI teardown of a competitor outlier: why it worked + a ready-to-produce
   * idea adapted for one of your channels. Persists the analysis onto the
   * competitor video so it sticks. Live mode routes to the competitor-teardown
   * edge function (Claude); demo mode synthesizes from the tracked signals.
   */
  generateTeardown(
    competitorVideoId: string,
    targetChannelId?: string,
  ): Promise<CompetitorTeardown>;

  listIdeas(): Promise<Idea[]>;
  createIdea(input: IdeaInput): Promise<Idea>;
  updateIdea(id: string, patch: Partial<IdeaInput>): Promise<Idea>;
  /**
   * Generate fresh video ideas grounded in the org's data and competitor
   * landscape. Live mode routes to OpenAI (ai-ideas edge function); demo mode
   * derives them from seeded competitor outliers + content gaps.
   */
  generateIdeas(channelId?: string, count?: number): Promise<GeneratedIdea[]>;

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
  /**
   * Draft a first pass (hook, script outline, description, title candidates)
   * for a production. Live mode routes to Claude (ai-write edge function);
   * demo mode uses a template engine grounded in SOPs + best-performing hook.
   */
  draftProduction(production: Production): Promise<DraftResult>;
  /**
   * Cut a long-form script into N Shorts: each becomes its own production doc
   * (format 'short', stage 'scripting', same channel) so it runs the normal
   * pipeline. Live mode routes to Claude (ai-shorts edge function); demo mode
   * derives beats from the script locally. Returns the created docs.
   */
  deriveShorts(productionId: string, count: number): Promise<Production[]>;
  /**
   * Publish a production to YouTube: uploads the video and marks it published,
   * linking a tracked video record. Live mode calls the youtube-upload edge
   * function (real resumable upload via the channel's connected Google account);
   * demo mode simulates the upload so the full workflow is explorable.
   */
  publishToYouTube(productionId: string): Promise<{ videoUrl: string; simulated: boolean }>;
  /**
   * Search stock b-roll (clips + photos) for a script section. Live mode
   * proxies Pexels through the broll-search edge function (key stays server
   * side); demo mode returns simulated placeholder footage so the builder
   * works with zero setup.
   */
  searchBroll(query: string): Promise<BuilderBrollItem[]>;

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
  /**
   * Approve a recommendation's proposed SOP change: writes it as a new SOP
   * version (append-only) and marks the recommendation accepted. This is the
   * step that actually closes the learning loop.
   */
  approveRecommendation(id: string): Promise<SopWithHistory>;

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

  /** Threaded comments on a doc; @mentions notify the tagged teammates. */
  listComments(entityType: CommentEntityType, entityId: string): Promise<Comment[]>;
  addComment(input: CommentInput): Promise<Comment>;
  deleteComment(id: string): Promise<void>;

  /** Kanban task manager (todo → doing → done, assignee, due date). */
  listTasks(): Promise<Task[]>;
  createTask(input: TaskInput): Promise<Task>;
  updateTask(id: string, patch: Partial<TaskInput>): Promise<Task>;
  deleteTask(id: string): Promise<void>;
  /** Discord webhook + member mapping used for task notifications. */
  getDiscordConfig(): Promise<DiscordConfig | null>;
  saveDiscordConfig(config: DiscordConfig): Promise<void>;

  /** Remove records that no longer exist in the world. Destructive. */
  deleteChannel(id: string): Promise<void>;
  deleteCompetitorChannel(id: string): Promise<void>;
  deleteProduction(id: string): Promise<void>;

  // ------------------------------------------------------------------
  // Modern Ambition Content Studio: the gated documentary pipeline.
  // Relevance before generation; every artifact stored; feedback becomes
  // reusable rules (the Script Bible) injected into future generations.
  // ------------------------------------------------------------------
  listContentProjects(): Promise<ContentProject[]>;
  getContentProject(id: string): Promise<ContentProject | null>;
  createContentProject(input: ContentProjectInput): Promise<ContentProject>;
  updateContentProject(
    id: string,
    patch: Partial<ContentProject>,
  ): Promise<ContentProject>;
  deleteContentProject(id: string): Promise<void>;
  /**
   * Run one AI step of the pipeline (relevance, research, titles, thumbnails,
   * outline, script, critique, personaReview). Live mode routes to Claude via
   * the content-studio edge function (which injects channel identity,
   * personas, and active Script Bible rules); demo mode uses honest template
   * scaffolds. Returns the updated project.
   */
  runStudioStep(projectId: string, step: StudioStep): Promise<ContentProject>;
  /** Built-in personas plus AI-proposed ones (unlock at 30/100 videos, 5 max). */
  listStudioPersonas(): Promise<StudioPersona[]>;
  /** The Script Bible. */
  listFeedbackRules(): Promise<FeedbackRule[]>;
  addFeedbackRule(input: {
    category: FeedbackRuleCategory;
    rule: string;
    sourceFeedback?: string;
  }): Promise<FeedbackRule>;
  setFeedbackRuleActive(id: string, active: boolean): Promise<void>;
  deleteFeedbackRule(id: string): Promise<void>;
  /**
   * Store the human's ratings + notes on a finished project, distill the
   * notes into reusable Script Bible rules, and mark the project done.
   */
  submitStudioFeedback(
    projectId: string,
    feedback: StudioFeedback,
  ): Promise<{ project: ContentProject; rules: FeedbackRule[] }>;
  /** Persist a produced thumbnail (Gemini image, Canva export, or upload). */
  saveThumbnailVariant(
    projectId: string,
    variant: Omit<ThumbnailVariant, "id" | "createdAt">,
  ): Promise<ContentProject>;
  /**
   * Generate a thumbnail image for a concept via the cheapest automated
   * provider (Gemini). Live mode calls the thumbnail-image edge function —
   * if GEMINI_API_KEY isn't configured it returns setup instructions in the
   * error. Demo mode fabricates a placeholder so the flow is explorable.
   */
  generateThumbnailImage(
    projectId: string,
    conceptName: string,
  ): Promise<ContentProject>;

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

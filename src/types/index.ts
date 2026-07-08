// Domain types for The Big 3 OS. These mirror the database schema
// (supabase/migrations) in camelCase and are the single vocabulary used by
// every page, hook, and provider.

export type OrgRole = "owner" | "admin" | "editor" | "viewer";
export type VideoFormat = "long_form" | "short" | "livestream";
export type IdeaPriority = "low" | "medium" | "high" | "urgent";
export type IdeaStatus =
  | "inbox"
  | "researching"
  | "approved"
  | "in_production"
  | "published"
  | "archived";
export type SopStatus = "draft" | "active" | "archived";
export type ContentSource = "human" | "ai";
export type RecommendationStatus =
  | "proposed"
  | "accepted"
  | "rejected"
  | "testing"
  | "validated"
  | "failed";
export type ReportType =
  | "weekly"
  | "monthly"
  | "quarterly"
  | "channel"
  | "cross_channel"
  | "competitor"
  | "experiment";
export type NotificationType =
  | "ctr_drop"
  | "retention_improved"
  | "competitor_outlier"
  | "sop_review_due"
  | "ai_recommendation"
  | "experiment_complete"
  | "system";

export interface Profile {
  id: string;
  displayName: string;
  avatarUrl?: string;
}

export interface Member extends Profile {
  role: OrgRole;
}

export interface Invite {
  id: string;
  code: string;
  email?: string;
  role: OrgRole;
  expiresAt: string;
  acceptedAt?: string;
  createdAt: string;
}

export interface InviteInput {
  role: OrgRole;
  email?: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
}

export interface ChannelGoal {
  id: string;
  channelId: string;
  metric: string;
  targetValue: number;
  period: string;
  notes?: string;
}

export interface Channel {
  id: string;
  organizationId: string;
  name: string;
  ownerId?: string;
  ownerName?: string;
  brand?: string;
  niche?: string;
  uploadCadence?: string;
  description?: string;
  youtubeChannelId?: string;
  /** Set when the owner OAuth (analytics + upload) succeeded for this channel. */
  youtubeConnectedAt?: string;
  goals: ChannelGoal[];
  createdAt: string;
}

export interface VideoMetrics {
  capturedAt: string;
  views?: number;
  impressions?: number;
  ctr?: number; // percent, 0..100
  avgViewDurationSecs?: number;
  avgPercentViewed?: number; // percent, 0..100
  watchTimeHours?: number;
  subscribersGained?: number;
  revenue?: number; // future
  rpm?: number; // future
}

/** One point on the audience-retention curve. */
export interface RetentionPoint {
  pct: number;      // elapsed video time, 0..100
  audience: number; // % of viewers still watching, 0..100
}

export interface TrafficSource {
  source: string; // "Browse", "Suggested", "Search", "External", …
  views: number;
}

/** Deep audience analytics for a video (YouTube Analytics API). */
export interface VideoAnalytics {
  videoId: string;
  retention: RetentionPoint[];
  trafficSources: TrafficSource[];
  impressions?: number;
  ctr?: number;              // percent
  views?: number;
  avgPercentViewed?: number; // percent
  /** "youtube" = pulled live via OAuth; "simulated" = demo/no connection. */
  source: "youtube" | "simulated";
}

export interface Video {
  id: string;
  channelId: string;
  title: string;
  url?: string;
  thumbnailUrl?: string;
  publishedAt?: string;
  topic?: string;
  hookType?: string;
  storyStructure?: string;
  durationSeconds?: number;
  format: VideoFormat;
  manualNotes?: string;
  aiObservations?: string;
  metrics?: VideoMetrics; // latest snapshot
  createdAt: string;
}

export interface VideoWithHistory extends Video {
  snapshots: VideoMetrics[]; // full history, oldest first
}

export interface CompetitorChannel {
  id: string;
  organizationId: string;
  name: string;
  niche?: string;
  notes?: string;
  // Channel-level intelligence, filled in by a scan.
  url?: string;
  handle?: string;
  youtubeChannelId?: string;
  thumbnailUrl?: string;
  subscriberCount?: number;
  trackedVideoCount?: number;
  outlierCount?: number;
  medianViewsPerDay?: number;
  /** Average days between uploads across the tracked sample. */
  uploadCadenceDays?: number;
  lastScannedAt?: string;
}

export interface CompetitorVideo {
  id: string;
  competitorChannelId: string;
  competitorChannelName?: string;
  title: string;
  url?: string;
  thumbnailUrl?: string;
  publishedAt?: string;
  topic?: string;
  hook?: string;
  storyStructure?: string;
  whyItWorked?: string;
  aiObservations?: string;
  /** Full AI teardown, banked for playbook synthesis (every 20 teardowns). */
  teardown?: CompetitorTeardown;
  teardownAt?: string;
  isOutlier: boolean;
  outlierScore?: number;
  views?: number;
  viewsPerDay?: number;
  velocity?: number;
}

export interface Idea {
  id: string;
  organizationId: string;
  channelId?: string;
  title: string;
  description?: string;
  priority: IdeaPriority;
  status: IdeaStatus;
  tags: string[];
  relatedCompetitorVideoId?: string;
  relatedSopId?: string;
  createdAt: string;
}

export type TaskStatus = "todo" | "doing" | "done";

export interface Task {
  id: string;
  organizationId: string;
  title: string;
  notes?: string;
  status: TaskStatus;
  assigneeId?: string;
  assigneeName?: string;
  dueAt?: string;
  createdBy?: string;
  createdAt: string;
}

export interface TaskInput {
  title: string;
  notes?: string;
  status?: TaskStatus;
  assigneeId?: string;
  dueAt?: string;
}

/** Discord notifications for tasks: one org webhook + member → Discord id map. */
export interface DiscordConfig {
  webhookUrl: string;
  /** member id → Discord user id, used to @mention the assignee. */
  userIds: Record<string, string>;
}

export type CommentEntityType = "production" | "sop" | "idea";

export interface Comment {
  id: string;
  entityType: CommentEntityType;
  entityId: string;
  author: Profile;
  body: string;
  mentions: string[]; // mentioned member ids
  createdAt: string;
}

export interface CommentInput {
  entityType: CommentEntityType;
  entityId: string;
  body: string;
  mentions?: string[];
}

/**
 * AI teardown of a competitor outlier: why it worked, transferable mechanisms,
 * and a ready-to-produce idea adapted for one of your channels.
 */
export interface CompetitorTeardown {
  whyItWorked: string;
  observations: string;
  transferableMoves: string[];
  idea: {
    title: string;
    description: string;
    tags: string[];
  };
}

export interface SopVersion {
  id: string;
  sopId: string;
  versionNumber: number;
  purpose: string;
  whenToUse?: string;
  steps: string[];
  examples?: string;
  changeSummary?: string;
  source: ContentSource;
  createdAt: string;
}

export interface Sop {
  id: string;
  organizationId: string;
  channelId?: string;
  title: string;
  category?: string;
  status: SopStatus;
  reviewFrequencyDays: number;
  nextReviewAt?: string;
  currentVersion?: SopVersion;
  linkedVideoIds: string[];
  linkedCompetitorVideoIds: string[];
  createdAt: string;
}

export interface SopWithHistory extends Sop {
  versions: SopVersion[]; // newest first
}

export interface AiInsight {
  id: string;
  organizationId: string;
  channelId?: string;
  kind: string;
  title: string;
  body: string;
  confidence?: number;
  createdAt: string;
}

export interface MeasuredImpact {
  metric: string;
  before: number;
  after: number;
  nBefore: number;
  nAfter: number;
  tStat?: number;
}

/**
 * The concrete SOP edit a recommendation proposes — a mutable draft that only
 * becomes an immutable sop_versions row when a human approves it. If sopId is
 * set it updates that SOP; otherwise approving creates a new SOP.
 */
export interface ProposedSopChange {
  sopId?: string;
  sopTitle: string;
  category?: string;
  purpose: string;
  whenToUse?: string;
  steps: string[];
  examples?: string;
  changeSummary: string;
}

export interface AiRecommendation {
  id: string;
  organizationId: string;
  insightId?: string;
  sopId?: string;
  proposedSopVersionId?: string;
  title: string;
  rationale: string;
  status: RecommendationStatus;
  proposedChange?: ProposedSopChange;
  measuredImpact?: MeasuredImpact;
  outcomeNotes?: string;
  createdAt: string;
}

export interface Report {
  id: string;
  organizationId: string;
  channelId?: string;
  type: ReportType;
  title: string;
  periodStart: string;
  periodEnd: string;
  contentMd: string;
  source: ContentSource;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  organizationId: string;
  userId?: string; // null/undefined = whole org
  type: NotificationType;
  title: string;
  body?: string;
  entityType?: string;
  entityId?: string;
  readAt?: string;
  createdAt: string;
}

export interface ActivityItem {
  id: string;
  actorName: string;
  action: string;
  entityType: string;
  entityLabel: string;
  createdAt: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface CoachReply {
  conversationId: string;
  answer: string;
}

// ---------------------------------------------------------------------------
// Production workspace
// ---------------------------------------------------------------------------

export type ProductionStage =
  | "scripting"
  | "editing"
  | "packaging"
  | "scheduled"
  | "published";

export const PRODUCTION_STAGES: ProductionStage[] = [
  "scripting",
  "editing",
  "packaging",
  "scheduled",
  "published",
];

export interface TitleCandidate {
  text: string;
  starred: boolean;
}

export interface AssetLink {
  label: string;
  url: string;
}

export interface Production {
  id: string;
  organizationId: string;
  channelId: string;
  title: string;
  stage: ProductionStage;
  format: VideoFormat;
  assigneeId?: string;
  dueDate?: string;
  scheduledAt?: string;

  topic?: string;
  goal?: string;
  goalMetric?: string;
  goalTarget?: number;

  hookText?: string;
  scriptHook?: string;
  scriptBody?: string;
  scriptOutro?: string;
  description?: string;
  titleCandidates: TitleCandidate[];
  thumbnailConcept?: string;
  referenceLinks: string[];
  voStatus?: string;
  assetLinks: AssetLink[];
  checklists: Partial<Record<ProductionStage, boolean[]>>;
  notes?: string;

  linkedVideoId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductionInput {
  channelId: string;
  title: string;
  format?: VideoFormat;
  topic?: string;
  assigneeId?: string;
  dueDate?: string;
}

/** One Short derived from a long-form script by AI (or the demo engine). */
export interface DerivedShort {
  title: string;
  hook: string;
  script: string;
  onScreenText?: string;
}

export type ProductionPatch = Partial<
  Omit<Production, "id" | "organizationId" | "createdAt" | "updatedAt" | "linkedVideoId">
>;

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

export interface ChannelInput {
  name: string;
  brand?: string;
  niche?: string;
  uploadCadence?: string;
  description?: string;
  youtubeChannelId?: string;
}

export interface VideoInput {
  channelId: string;
  title: string;
  url?: string;
  thumbnailUrl?: string;
  publishedAt?: string;
  topic?: string;
  hookType?: string;
  storyStructure?: string;
  durationSeconds?: number;
  format: VideoFormat;
  manualNotes?: string;
}

export interface VideoMetricsInput {
  views?: number;
  impressions?: number;
  ctr?: number;
  avgViewDurationSecs?: number;
  avgPercentViewed?: number;
  watchTimeHours?: number;
  subscribersGained?: number;
}

// ---------------------------------------------------------------------------
// Modern Ambition Content Studio — the gated documentary pipeline.
// Relevance comes before generation: each step's artifact is stored whole so
// the next step (and the human) can react to it.
// ---------------------------------------------------------------------------

export type StudioStatus =
  | "relevance"
  | "research"
  | "titles"
  | "thumbnail"
  | "outline"
  | "script"
  | "critique"
  | "feedback"
  | "done";

export const STUDIO_STEPS: StudioStatus[] = [
  "relevance",
  "research",
  "titles",
  "thumbnail",
  "outline",
  "script",
  "critique",
  "feedback",
  "done",
];

export type StudioVideoLength = 15 | 18 | 20 | 25;

export interface StudioPersona {
  id: string;
  name: string;
  ageRange?: string;
  description: string;
  respondsTo: string[];
  /** 'builtin' ships in code; 'ai' personas unlock at 30/100 completed videos. */
  source: "builtin" | "ai";
  active: boolean;
}

export interface RelevanceReport {
  relevant: "yes" | "no" | "maybe";
  score: number; // 1–10
  bestPersona: string;
  whyViewerCares: string;
  emotionalHook: string;
  businessHook: string;
  psychologyHook: string;
  weakness: string;
  clickabilityFix: string;
  recommendedLengthMinutes: StudioVideoLength;
  videoPromise: string;
}

export interface ResearchPacket {
  mainSubject: string;
  timeline: string[];
  keyEvents: string[];
  keyConflicts: string[];
  turningPoints: string[];
  businessContext: string;
  psychologicalContext: string;
  culturalContext: string;
  controversies: string[];
  /** Claims the human MUST fact-check — the system never invents facts. */
  unverifiedClaims: string[];
  bestAngle: string;
  emotionalQuestion: string;
  endingIdea: string;
}

export interface TitleVariant {
  title: string;
  angle: string;
  curiosityScore: number;
  clarityScore: number;
  emotionScore: number;
  specificityScore: number;
  accuracyScore: number;
  documentaryFeelScore: number;
  personaFitScore: number;
  clickPotentialScore: number;
  reasoning: string;
  thumbnailMatch: string;
}

export interface TitleLab {
  variants: TitleVariant[];
  angleCategories: string[];
  strongest: string[]; // 3 titles
  recommended: string;
  whyRecommended: string;
}

export interface ThumbnailConcept {
  conceptName: string;
  visualDescription: string;
  textOverlayOptions: string[];
  mainEmotion: string;
  composition: string;
  background: string;
  style: string;
  mobileReadabilityScore: number;
  relevanceScore: number;
  providerPromptGemini: string;
  providerPromptCanva: string;
  negativePrompt: string;
  whyItWorks: string;
  shouldNot: string;
}

export interface ThumbnailLab {
  concepts: ThumbnailConcept[];
  recommendedConcept: string;
}

/** A saved thumbnail image/prompt pairing (Gemini, Canva, or manual upload). */
export interface ThumbnailVariant {
  id: string;
  provider: "gemini" | "canva" | "upload";
  conceptName: string;
  /** data: URL or external URL of the produced image (absent for prompt-only). */
  imageUrl?: string;
  prompt?: string;
  pairedTitle?: string;
  relevanceScore?: number;
  selected: boolean;
  createdAt: string;
}

export interface OutlineSection {
  timestamp: string; // "0:00–0:45"
  title: string;
  purpose: string;
  beats: string[];
  emotionalJob: string;
  brollIdeas: string[];
  retentionDevice: string;
  transition: string;
}

export interface StudioCritique {
  scores: Record<string, number>; // hook, titleAlignment, tension, pacing, clarity, originality, retention, ending, voiceover, channelFit, personaFit, thumbnailAlignment
  boringSections: string[];
  clickOffRisks: string[];
  needsMoreTension: string[];
  genericLines: string[];
  essayLikeParts: string[];
  cut: string[];
  expand: string[];
  factCheck: string[];
  proposedRules: Array<{ category: FeedbackRuleCategory; rule: string }>;
  warnings: string[]; // safety: living people, speculation, overpromise…
}

export type FeedbackRuleCategory =
  | "title"
  | "script"
  | "thumbnail"
  | "hook"
  | "ending"
  | "general";

/** One Script Bible entry — a reusable writing rule distilled from feedback. */
export interface FeedbackRule {
  id: string;
  category: FeedbackRuleCategory;
  rule: string;
  sourceFeedback?: string;
  active: boolean;
  createdAt: string;
}

export interface StudioFeedback {
  ratings: Partial<
    Record<"title" | "script" | "thumbnail" | "hook" | "ending" | "idea", number>
  >;
  notes: string;
}

export interface ContentProject {
  id: string;
  organizationId: string;
  channelId?: string;
  topic: string;
  status: StudioStatus;
  primaryPersona?: string;
  secondaryPersona?: string;
  videoLengthMinutes: StudioVideoLength;
  relevance?: RelevanceReport;
  research?: ResearchPacket;
  titleLab?: TitleLab;
  selectedTitle?: string;
  thumbnailLab?: ThumbnailLab;
  selectedThumbnail?: ThumbnailConcept;
  thumbnailVariants: ThumbnailVariant[];
  outline?: OutlineSection[];
  script?: string;
  critique?: StudioCritique;
  feedback?: StudioFeedback;
  linkedProductionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContentProjectInput {
  topic: string;
  channelId?: string;
  primaryPersona?: string;
  secondaryPersona?: string;
  videoLengthMinutes?: StudioVideoLength;
}

export type StudioStep =
  | "relevance"
  | "research"
  | "titles"
  | "thumbnails"
  | "outline"
  | "script"
  | "critique"
  | "personaReview";

export interface DraftResult {
  hookText: string;
  scriptBody: string;
  description: string;
  titleCandidates: TitleCandidate[];
}

export interface GeneratedIdea {
  title: string;
  description: string;
  rationale: string;
  suggestedHook?: string;
  tags: string[];
}

export interface IdeaInput {
  title: string;
  description?: string;
  channelId?: string;
  priority: IdeaPriority;
  status: IdeaStatus;
  tags: string[];
  relatedCompetitorVideoId?: string;
  relatedSopId?: string;
}

export interface CompetitorVideoInput {
  competitorChannelId: string;
  title: string;
  url?: string;
  thumbnailUrl?: string;
  publishedAt?: string;
  topic?: string;
  hook?: string;
  storyStructure?: string;
  whyItWorked?: string;
  aiObservations?: string;
  isOutlier?: boolean;
  outlierScore?: number;
  views?: number;
  viewsPerDay?: number;
}

export interface CompetitorChannelInput {
  name: string;
  url?: string;
  niche?: string;
  notes?: string;
}

/** Summary returned after scanning a competitor channel's recent uploads. */
export interface CompetitorScanResult {
  channelId: string;
  channelName: string;
  created: number;
  totalTracked: number;
  outliers: number;
  /** True when the scan was simulated (no YouTube API key wired up yet). */
  simulated: boolean;
}

export interface SopInput {
  title: string;
  category?: string;
  channelId?: string;
  purpose: string;
  whenToUse?: string;
  steps: string[];
  examples?: string;
}

export interface SopVersionInput {
  purpose: string;
  whenToUse?: string;
  steps: string[];
  examples?: string;
  changeSummary: string;
}

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

export interface AiRecommendation {
  id: string;
  organizationId: string;
  insightId?: string;
  sopId?: string;
  proposedSopVersionId?: string;
  title: string;
  rationale: string;
  status: RecommendationStatus;
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
  topic?: string;
  assigneeId?: string;
  dueDate?: string;
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
  publishedAt?: string;
  topic?: string;
  hook?: string;
  storyStructure?: string;
  whyItWorked?: string;
  views?: number;
  viewsPerDay?: number;
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

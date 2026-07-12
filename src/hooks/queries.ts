// TanStack Query hooks — the only way pages read or write data.
// Query keys are centralized so invalidation stays consistent.

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { data } from "@/lib/data";
import { getStoredApiKey } from "@/lib/youtube";
import { scanCompetitorFromYouTube } from "@/features/competitors/liveScan";
import type {
  ContentProject,
  ContentProjectInput,
  FeedbackRuleCategory,
  StudioFeedback,
  StudioStep,
  ThumbnailVariant,
  ChannelInput,
  CommentEntityType,
  CommentInput,
  DiscordConfig,
  CompetitorChannel,
  CompetitorChannelInput,
  CompetitorVideoInput,
  InviteInput,
  TaskInput,
  IdeaInput,
  Production,
  ProductionInput,
  ProductionPatch,
  RecommendationStatus,
  ReportType,
  SopInput,
  SopVersionInput,
  VideoInput,
  VideoMetricsInput,
} from "@/types";

export const keys = {
  me: ["me"] as const,
  org: ["org"] as const,
  members: ["members"] as const,
  invites: ["invites"] as const,
  channels: ["channels"] as const,
  channel: (id: string) => ["channels", id] as const,
  videos: (channelId?: string) => ["videos", channelId ?? "all"] as const,
  video: (id: string) => ["video", id] as const,
  competitorChannels: ["competitor-channels"] as const,
  competitorVideos: (onlyOutliers?: boolean) =>
    ["competitor-videos", !!onlyOutliers] as const,
  ideas: ["ideas"] as const,
  productions: ["productions"] as const,
  production: (id: string) => ["productions", id] as const,
  sops: ["sops"] as const,
  contentProjects: ["content-projects"] as const,
  contentProject: (id: string) => ["content-projects", id] as const,
  studioPersonas: ["studio-personas"] as const,
  feedbackRules: ["feedback-rules"] as const,
  sop: (id: string) => ["sops", id] as const,
  insights: ["insights"] as const,
  recommendations: ["recommendations"] as const,
  reports: ["reports"] as const,
  report: (id: string) => ["reports", id] as const,
  notifications: ["notifications"] as const,
  activity: ["activity"] as const,
};

export const useMe = () => useQuery({ queryKey: keys.me, queryFn: () => data.getCurrentUser() });
export const useOrg = () => useQuery({ queryKey: keys.org, queryFn: () => data.getOrganization() });
export const useMembers = () => useQuery({ queryKey: keys.members, queryFn: () => data.listMembers() });

export const useVideoAnalytics = (videoId: string | undefined) =>
  useQuery({
    queryKey: ["videoAnalytics", videoId],
    queryFn: () => data.getVideoAnalytics(videoId!),
    enabled: !!videoId,
    retry: false, // a missing YouTube connection is a 409, not a transient error
    staleTime: 5 * 60_000,
  });

export const useTasks = () =>
  useQuery({ queryKey: ["tasks"], queryFn: () => data.listTasks() });

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TaskInput) => data.createTask(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; patch: Partial<TaskInput> }) =>
      data.updateTask(args.id, args.patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => data.deleteTask(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export const useDiscordConfig = () =>
  useQuery({ queryKey: ["discordConfig"], queryFn: () => data.getDiscordConfig() });

export function useSaveDiscordConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (config: DiscordConfig) => data.saveDiscordConfig(config),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["discordConfig"] }),
  });
}

export function useDeleteChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => data.deleteChannel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["channels"] });
      qc.invalidateQueries({ queryKey: ["videos"] });
    },
  });
}

export function useDeleteCompetitorChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => data.deleteCompetitorChannel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.competitorChannels });
      qc.invalidateQueries({ queryKey: ["competitor-videos"] });
    },
  });
}

export function useDeleteProduction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => data.deleteProduction(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["productions"] }),
  });
}

export function useDeleteVideo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => data.deleteVideo(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["videos"] }),
  });
}

export const useComments = (entityType: CommentEntityType, entityId: string) =>
  useQuery({
    queryKey: ["comments", entityType, entityId],
    queryFn: () => data.listComments(entityType, entityId),
    enabled: !!entityId,
  });

export function useAddComment(entityType: CommentEntityType, entityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CommentInput) => data.addComment(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comments", entityType, entityId] });
      qc.invalidateQueries({ queryKey: keys.notifications });
    },
  });
}

export function useDeleteComment(entityType: CommentEntityType, entityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => data.deleteComment(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comments", entityType, entityId] }),
  });
}
export const useInvites = () => useQuery({ queryKey: keys.invites, queryFn: () => data.listInvites() });

export function useCreateInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: InviteInput) => data.createInvite(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.invites }),
  });
}

export function useRevokeInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => data.revokeInvite(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.invites }),
  });
}

export const useChannels = () =>
  useQuery({ queryKey: keys.channels, queryFn: () => data.listChannels() });
export const useChannel = (id: string) =>
  useQuery({ queryKey: keys.channel(id), queryFn: () => data.getChannel(id) });

export const useVideos = (channelId?: string) =>
  useQuery({
    queryKey: keys.videos(channelId),
    queryFn: () => data.listVideos(channelId ? { channelId } : undefined),
  });
export const useVideo = (id: string) =>
  useQuery({ queryKey: keys.video(id), queryFn: () => data.getVideo(id) });

export const useCompetitorChannels = () =>
  useQuery({ queryKey: keys.competitorChannels, queryFn: () => data.listCompetitorChannels() });
export const useCompetitorVideos = (onlyOutliers?: boolean) =>
  useQuery({
    queryKey: keys.competitorVideos(onlyOutliers),
    queryFn: () => data.listCompetitorVideos(onlyOutliers ? { onlyOutliers } : undefined),
  });

export const useIdeas = () => useQuery({ queryKey: keys.ideas, queryFn: () => data.listIdeas() });
export const useProductions = () =>
  useQuery({ queryKey: keys.productions, queryFn: () => data.listProductions() });
export const useProduction = (id: string) =>
  useQuery({ queryKey: keys.production(id), queryFn: () => data.getProduction(id) });
export const useSops = () => useQuery({ queryKey: keys.sops, queryFn: () => data.listSops() });
export const useSop = (id: string) =>
  useQuery({ queryKey: keys.sop(id), queryFn: () => data.getSop(id) });

export const useInsights = () =>
  useQuery({ queryKey: keys.insights, queryFn: () => data.listInsights() });
export const useRecommendations = () =>
  useQuery({ queryKey: keys.recommendations, queryFn: () => data.listRecommendations() });

export const useReports = () =>
  useQuery({ queryKey: keys.reports, queryFn: () => data.listReports() });
export const useReport = (id: string) =>
  useQuery({ queryKey: keys.report(id), queryFn: () => data.getReport(id) });

export const useNotifications = () =>
  useQuery({ queryKey: keys.notifications, queryFn: () => data.listNotifications() });
export const useActivity = () =>
  useQuery({ queryKey: keys.activity, queryFn: () => data.listActivity() });

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function useCreateChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ChannelInput) => data.createChannel(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.channels }),
  });
}

export function useCreateVideo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { input: VideoInput; metrics?: VideoMetricsInput }) =>
      data.createVideo(args.input, args.metrics),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["videos"] }),
  });
}

export function useAddVideoSnapshot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { videoId: string; metrics: VideoMetricsInput }) =>
      data.addVideoSnapshot(args.videoId, args.metrics),
    onSuccess: (_res, args) => {
      qc.invalidateQueries({ queryKey: ["videos"] });
      qc.invalidateQueries({ queryKey: keys.video(args.videoId) });
    },
  });
}

export function useCreateIdea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: IdeaInput) => data.createIdea(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.ideas }),
  });
}

/** AI teardown of a competitor outlier → why it worked + a producible idea. */
export function useGenerateTeardown() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { competitorVideoId: string; targetChannelId?: string }) =>
      data.generateTeardown(args.competitorVideoId, args.targetChannelId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["competitor-videos"] }),
  });
}

export function useUpdateIdea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; patch: Partial<IdeaInput> }) =>
      data.updateIdea(args.id, args.patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.ideas }),
  });
}

export function useGenerateIdeas() {
  return useMutation({
    mutationFn: (args: { channelId?: string; count?: number }) =>
      data.generateIdeas(args.channelId, args.count),
  });
}

export function useCreateCompetitorVideo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CompetitorVideoInput) => data.createCompetitorVideo(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["competitor-videos"] }),
  });
}

export function useCreateCompetitorChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CompetitorChannelInput) => data.createCompetitorChannel(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.competitorChannels }),
  });
}

/**
 * Scan a whole competitor channel. With a stored YouTube API key we run a real
 * client-side scan (public Data API); otherwise we fall back to the provider —
 * demo simulates a believable batch, live mode routes to the edge function.
 */
export function useScanCompetitorChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (channel: CompetitorChannel) => {
      const apiKey = getStoredApiKey();
      if (apiKey && (channel.url || channel.handle || channel.youtubeChannelId)) {
        return scanCompetitorFromYouTube(channel, apiKey);
      }
      return data.scanCompetitorChannel(channel.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.competitorChannels });
      qc.invalidateQueries({ queryKey: ["competitor-videos"] });
    },
  });
}

export function useCreateProduction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ProductionInput) => data.createProduction(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.productions }),
  });
}

export function useUpdateProduction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; patch: ProductionPatch }) =>
      data.updateProduction(args.id, args.patch),
    onSuccess: (result) => {
      qc.setQueryData(keys.production(result.id), result);
      qc.invalidateQueries({ queryKey: keys.productions });
    },
  });
}

export function useDraftProduction() {
  return useMutation({
    mutationFn: (production: Production) => data.draftProduction(production),
  });
}

export function useDeriveShorts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { productionId: string; count: number }) =>
      data.deriveShorts(args.productionId, args.count),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.productions });
      qc.invalidateQueries({ queryKey: keys.activity });
    },
  });
}

export function useSearchBroll() {
  return useMutation({
    mutationFn: (query: string) => data.searchBroll(query),
  });
}

export function usePublishToYouTube() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => data.publishToYouTube(id),
    onSuccess: (_res, id) => {
      qc.invalidateQueries({ queryKey: keys.production(id) });
      qc.invalidateQueries({ queryKey: keys.productions });
      qc.invalidateQueries({ queryKey: ["videos"] });
      qc.invalidateQueries({ queryKey: keys.activity });
    },
  });
}

export function usePublishProduction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => data.publishProduction(id),
    onSuccess: (result) => {
      qc.setQueryData(keys.production(result.id), result);
      qc.invalidateQueries({ queryKey: keys.productions });
      qc.invalidateQueries({ queryKey: ["videos"] });
      qc.invalidateQueries({ queryKey: keys.activity });
    },
  });
}

export function useCreateSop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SopInput) => data.createSop(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.sops }),
  });
}

export function useAddSopVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { sopId: string; input: SopVersionInput }) =>
      data.addSopVersion(args.sopId, args.input),
    onSuccess: (_res, args) => {
      qc.invalidateQueries({ queryKey: keys.sops });
      qc.invalidateQueries({ queryKey: keys.sop(args.sopId) });
    },
  });
}

export function useSetRecommendationStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; status: RecommendationStatus }) =>
      data.setRecommendationStatus(args.id, args.status),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.recommendations }),
  });
}

/** Approve a recommendation → applies its SOP change as a new version. */
export function useApproveRecommendation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => data.approveRecommendation(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.recommendations });
      qc.invalidateQueries({ queryKey: keys.sops });
    },
  });
}

export function useGenerateReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      type: ReportType;
      channelId?: string;
      periodStart: string;
      periodEnd: string;
    }) => data.generateReport(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.reports }),
  });
}

export function useRunLearningLoop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => data.runLearningLoop(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.insights });
      qc.invalidateQueries({ queryKey: keys.recommendations });
      qc.invalidateQueries({ queryKey: keys.notifications });
      qc.invalidateQueries({ queryKey: keys.activity });
    },
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => data.markNotificationRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.notifications }),
  });
}

// ---------------------------------------------------------------------------
// Modern Ambition Content Studio
// ---------------------------------------------------------------------------

export const useContentProjects = () =>
  useQuery({ queryKey: keys.contentProjects, queryFn: () => data.listContentProjects() });

export const useContentProject = (id: string) =>
  useQuery({
    queryKey: keys.contentProject(id),
    queryFn: () => data.getContentProject(id),
    enabled: !!id,
  });

export const useStudioPersonas = () =>
  useQuery({ queryKey: keys.studioPersonas, queryFn: () => data.listStudioPersonas() });

export const useFeedbackRules = () =>
  useQuery({ queryKey: keys.feedbackRules, queryFn: () => data.listFeedbackRules() });

export function useCreateContentProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ContentProjectInput) => data.createContentProject(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.contentProjects }),
  });
}

export function useUpdateContentProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; patch: Partial<ContentProject> }) =>
      data.updateContentProject(args.id, args.patch),
    onSuccess: (result) => {
      qc.setQueryData(keys.contentProject(result.id), result);
      qc.invalidateQueries({ queryKey: keys.contentProjects });
    },
  });
}

export function useDeleteContentProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => data.deleteContentProject(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.contentProjects }),
  });
}

export function useRunStudioStep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { projectId: string; step: StudioStep }) =>
      data.runStudioStep(args.projectId, args.step),
    onSuccess: (result) => {
      qc.setQueryData(keys.contentProject(result.id), result);
      qc.invalidateQueries({ queryKey: keys.contentProjects });
      qc.invalidateQueries({ queryKey: keys.studioPersonas });
    },
  });
}

export function useSubmitStudioFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { projectId: string; feedback: StudioFeedback }) =>
      data.submitStudioFeedback(args.projectId, args.feedback),
    onSuccess: ({ project }) => {
      qc.setQueryData(keys.contentProject(project.id), project);
      qc.invalidateQueries({ queryKey: keys.contentProjects });
      qc.invalidateQueries({ queryKey: keys.feedbackRules });
      qc.invalidateQueries({ queryKey: keys.studioPersonas });
    },
  });
}

export function useAddFeedbackRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { category: FeedbackRuleCategory; rule: string; sourceFeedback?: string }) =>
      data.addFeedbackRule(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.feedbackRules }),
  });
}

export function useSetFeedbackRuleActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; active: boolean }) =>
      data.setFeedbackRuleActive(args.id, args.active),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.feedbackRules }),
  });
}

export function useDeleteFeedbackRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => data.deleteFeedbackRule(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.feedbackRules }),
  });
}

export function useSaveThumbnailVariant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { projectId: string; variant: Omit<ThumbnailVariant, "id" | "createdAt"> }) =>
      data.saveThumbnailVariant(args.projectId, args.variant),
    onSuccess: (result) => {
      qc.setQueryData(keys.contentProject(result.id), result);
    },
  });
}

export function useGenerateThumbnailImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { projectId: string; conceptName: string }) =>
      data.generateThumbnailImage(args.projectId, args.conceptName),
    onSuccess: (result) => {
      qc.setQueryData(keys.contentProject(result.id), result);
    },
  });
}

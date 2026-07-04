// TanStack Query hooks — the only way pages read or write data.
// Query keys are centralized so invalidation stays consistent.

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { data } from "@/lib/data";
import type {
  ChannelInput,
  CompetitorVideoInput,
  IdeaInput,
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
  channels: ["channels"] as const,
  channel: (id: string) => ["channels", id] as const,
  videos: (channelId?: string) => ["videos", channelId ?? "all"] as const,
  video: (id: string) => ["video", id] as const,
  competitorChannels: ["competitor-channels"] as const,
  competitorVideos: (onlyOutliers?: boolean) =>
    ["competitor-videos", !!onlyOutliers] as const,
  ideas: ["ideas"] as const,
  sops: ["sops"] as const,
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

export function useUpdateIdea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; patch: Partial<IdeaInput> }) =>
      data.updateIdea(args.id, args.patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.ideas }),
  });
}

export function useCreateCompetitorVideo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CompetitorVideoInput) => data.createCompetitorVideo(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["competitor-videos"] }),
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

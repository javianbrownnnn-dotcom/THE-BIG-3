// Per-channel YouTube sync orchestrator. Resolves the channel once (and
// stores the canonical UC… id), pulls all uploads with current stats, and
// lands them through the DataProvider: unknown videos are created, known
// videos get a new metric snapshot appended — same append-only model as
// every other data source.

import { data } from "@/lib/data";
import { fetchUploads, resolveChannel, type YtVideo } from "@/lib/youtube";
import { titleKey } from "@/features/videos/importer";
import type { Channel } from "@/types";

export interface SyncResult {
  channelTitle: string;
  channelId: string;
  subscriberCount?: number;
  /** What YouTube says the channel has publicly — vs. what we could fetch. */
  reportedVideoCount?: number;
  created: number;
  snapshotsAppended: number;
  totalFetched: number;
}

function videoIdFromUrl(url: string | undefined): string | undefined {
  return url?.match(/[?&]v=([A-Za-z0-9_-]{6,})/)?.[1];
}

export async function syncChannelFromYouTube(
  channel: Channel,
  ref: string,
  apiKey: string,
): Promise<SyncResult> {
  const yt = await resolveChannel(ref, apiKey);

  // Persist the canonical channel id so future syncs skip resolution.
  if (channel.youtubeChannelId !== yt.id) {
    await data.updateChannel(channel.id, { youtubeChannelId: yt.id });
  }

  const uploads = await fetchUploads(yt.uploadsPlaylistId, apiKey);

  const existing = await data.listVideos({ channelId: channel.id });
  const byVideoId = new Map<string, string>();
  const byTitle = new Map<string, string>();
  for (const v of existing) {
    const vid = videoIdFromUrl(v.url);
    if (vid) byVideoId.set(vid, v.id);
    byTitle.set(titleKey(v.title), v.id);
  }

  let created = 0;
  let snapshotsAppended = 0;
  for (const upload of uploads) {
    const existingId =
      byVideoId.get(upload.videoId) ?? byTitle.get(titleKey(upload.title));
    if (existingId) {
      await data.addVideoSnapshot(existingId, { views: upload.views });
      snapshotsAppended++;
    } else {
      await data.createVideo(
        {
          channelId: channel.id,
          title: upload.title,
          url: `https://www.youtube.com/watch?v=${upload.videoId}`,
          thumbnailUrl: upload.thumbnailUrl,
          publishedAt: upload.publishedAt,
          durationSeconds: upload.durationSeconds,
          // YouTube treats ≤3min vertical as Shorts; duration is the best
          // signal available from the Data API.
          format: upload.durationSeconds > 0 && upload.durationSeconds <= 180
            ? "short"
            : "long_form",
        },
        { views: upload.views },
      );
      created++;
    }
  }

  return {
    channelTitle: yt.title,
    channelId: yt.id,
    subscriberCount: yt.subscriberCount,
    reportedVideoCount: yt.videoCount,
    created,
    snapshotsAppended,
    totalFetched: uploads.length,
  };
}

export type { YtVideo };

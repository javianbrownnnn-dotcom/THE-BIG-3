// Live competitor scan: pull a channel's recent uploads from the YouTube Data
// API (public data, API-key only) and land them through the DataProvider —
// the client-side twin of the demo simulation and the server-side edge scan.
// Mirrors src/features/channels/sync.ts, but for competitor channels.

import { data } from "@/lib/data";
import { fetchUploads, resolveChannel } from "@/lib/youtube";
import { aggregateChannelStats, uploadsToCompetitorVideos } from "./scan";
import type { CompetitorChannel, CompetitorScanResult } from "@/types";

const videoIdFromUrl = (url?: string) => url?.match(/[?&]v=([A-Za-z0-9_-]{6,})/)?.[1];

/** How many recent uploads to pull per scan — enough for a stable baseline, cheap on quota. */
const MAX_UPLOADS = 60;

export async function scanCompetitorFromYouTube(
  channel: CompetitorChannel,
  apiKey: string,
): Promise<CompetitorScanResult> {
  const ref = channel.url || channel.handle || channel.youtubeChannelId || channel.name;
  const yt = await resolveChannel(ref, apiKey);
  const uploads = await fetchUploads(yt.uploadsPlaylistId, apiKey, MAX_UPLOADS);
  const mapped = uploadsToCompetitorVideos(channel.id, uploads);

  // Dedupe against already-tracked videos for this channel.
  const existing = await data.listCompetitorVideos();
  const mine = existing.filter((v) => v.competitorChannelId === channel.id);
  const seenIds = new Set(mine.map((v) => videoIdFromUrl(v.url)).filter(Boolean));
  const seenTitles = new Set(mine.map((v) => v.title.toLowerCase()));

  let created = 0;
  for (const row of mapped) {
    if (seenIds.has(videoIdFromUrl(row.url)) || seenTitles.has(row.title.toLowerCase())) continue;
    await data.createCompetitorVideo(row);
    created++;
  }

  // Recompute channel-level headline stats over the full tracked set.
  const all = [...mine, ...mapped];
  const stats = aggregateChannelStats(all);
  await data.updateCompetitorChannel(channel.id, {
    ...stats,
    youtubeChannelId: yt.id,
    subscriberCount: yt.subscriberCount,
    lastScannedAt: new Date().toISOString(),
  });

  return {
    channelId: channel.id,
    channelName: yt.title,
    created,
    totalTracked: all.length,
    outliers: mapped.filter((m) => m.isOutlier).length,
    simulated: false,
  };
}

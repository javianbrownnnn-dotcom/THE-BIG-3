// Competitor channel scanning — pure logic shared by the live scan (real
// YouTube API) and the demo simulation. No `data` or network imports here so
// both the provider and the UI orchestrator can use it.

import type { CompetitorChannel, CompetitorVideoInput } from "@/types";
import type { YtVideo } from "@/lib/youtube";

const DAY_MS = 86_400_000;

export function daysSince(iso: string | undefined): number {
  if (!iso) return 1;
  return Math.max(1, (Date.now() - new Date(iso).getTime()) / DAY_MS);
}

/** Views-per-day is the fair cross-age comparison — raw views punish new uploads. */
export function viewsPerDay(views: number | undefined, publishedAt: string | undefined): number {
  if (!views) return 0;
  return Math.round(views / daysSince(publishedAt));
}

/**
 * Flag statistical outliers within a single channel: videos whose views/day is
 * ≥ 2 standard deviations above the channel's own mean. Grading each channel
 * against its own baseline is what makes "outlier" mean "unusually good for
 * them", not just "a big channel". Returns z-scores for the flagged rows.
 */
export function flagOutliers<T extends { viewsPerDay?: number }>(
  rows: T[],
): Array<T & { isOutlier: boolean; outlierScore?: number }> {
  const vpds = rows.map((r) => r.viewsPerDay ?? 0);
  const n = vpds.length;
  if (n < 3) return rows.map((r) => ({ ...r, isOutlier: false }));
  const mean = vpds.reduce((a, b) => a + b, 0) / n;
  const variance = vpds.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  const sd = Math.sqrt(variance);
  return rows.map((r) => {
    if (sd === 0) return { ...r, isOutlier: false };
    const z = ((r.viewsPerDay ?? 0) - mean) / sd;
    return z >= 2
      ? { ...r, isOutlier: true, outlierScore: +z.toFixed(1) }
      : { ...r, isOutlier: false };
  });
}

/** Median helper (channel-level headline stat, robust to a viral spike). */
function median(nums: number[]): number {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

/** Average days between consecutive uploads (upload cadence). */
export function uploadCadenceDays(publishDates: Array<string | undefined>): number | undefined {
  const times = publishDates
    .filter((d): d is string => !!d)
    .map((d) => new Date(d).getTime())
    .sort((a, b) => b - a);
  if (times.length < 2) return undefined;
  let sum = 0;
  for (let i = 0; i < times.length - 1; i++) sum += times[i] - times[i + 1];
  return +(sum / (times.length - 1) / DAY_MS).toFixed(1);
}

/**
 * Seeded CI-research rows carry illustrative stats (marked so in their
 * aiObservations) — they must never mix into channel statistics once real
 * scanned data exists. They're identifiable by their stable seed ids.
 */
export function isResearchRow(v: { id?: string }): boolean {
  return !!v.id && (v.id.startsWith("cv_ci_") || v.id.startsWith("cv_cx_"));
}

/** Roll a channel's tracked videos up into the headline stats shown on its card. */
export function aggregateChannelStats(
  videos: Array<{ viewsPerDay?: number; isOutlier?: boolean; publishedAt?: string }>,
): Partial<CompetitorChannel> {
  return {
    trackedVideoCount: videos.length,
    outlierCount: videos.filter((v) => v.isOutlier).length,
    medianViewsPerDay: median(videos.map((v) => v.viewsPerDay ?? 0)),
    uploadCadenceDays: uploadCadenceDays(videos.map((v) => v.publishedAt)),
  };
}

/** Map real YouTube uploads to competitor-video inputs (views/day computed, outliers flagged). */
export function uploadsToCompetitorVideos(
  channelId: string,
  uploads: YtVideo[],
): CompetitorVideoInput[] {
  const withVpd = uploads.map((u) => ({
    upload: u,
    viewsPerDay: viewsPerDay(u.views, u.publishedAt),
  }));
  const flagged = flagOutliers(withVpd);
  return flagged.map((f) => ({
    competitorChannelId: channelId,
    title: f.upload.title,
    url: `https://www.youtube.com/watch?v=${f.upload.videoId}`,
    thumbnailUrl: f.upload.thumbnailUrl,
    publishedAt: f.upload.publishedAt,
    views: f.upload.views,
    viewsPerDay: f.viewsPerDay,
    isOutlier: f.isOutlier,
    outlierScore: f.outlierScore,
  }));
}

// ---------------------------------------------------------------------------
// Demo simulation — believable uploads for a channel when no API key exists.
// ---------------------------------------------------------------------------

const HOOKS = ["story_cold_open", "bold_claim", "question", "contrarian", "statistic"];
const STRUCTURES = ["rise_and_fall", "case_study", "chronological", "problem_solution", "listicle"];
const TITLE_SHAPES = [
  "The {n} That {v}",
  "Why {n} {v}",
  "How {n} Really {v}",
  "The Untold Story of {n}",
  "{n}: What Nobody Tells You",
  "Inside the {n} {v}",
];

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length];
}

/**
 * Generate a plausible batch of recent uploads for a channel, skipping titles
 * already tracked. Deterministic-ish per call; outliers are flagged with the
 * same z-score logic as a real scan so the demo mirrors production behaviour.
 */
export function simulateChannelScan(
  channel: CompetitorChannel,
  existingTitles: Set<string>,
  count = 8,
): CompetitorVideoInput[] {
  const niche = channel.niche ?? "the niche";
  const subjects = [
    channel.name.split(/[\s(]/)[0],
    niche,
    "the industry giant",
    "a forgotten pioneer",
    "the $1B mistake",
    "the founder",
    "the collapse",
    "the monopoly",
  ];
  const verbs = ["Changed Everything", "Went Wrong", "Fooled Everyone", "Broke the Rules", "Won"];
  const baseVpd = 6_000 + Math.floor(Math.random() * 30_000);

  const rows: CompetitorVideoInput[] = [];
  let attempts = 0;
  while (rows.length < count && attempts < count * 4) {
    const seed = Math.floor(Math.random() * 100_000);
    attempts++;
    const shape = pick(TITLE_SHAPES, seed);
    const title = shape
      .replace("{n}", pick(subjects, seed * 3))
      .replace("{v}", pick(verbs, seed * 7));
    if (existingTitles.has(title.toLowerCase())) continue;
    existingTitles.add(title.toLowerCase());
    const age = Math.round(5 + Math.random() * 120);
    // Most videos cluster near the channel baseline; a couple spike (→ outliers).
    const spike = Math.random() < 0.2 ? 2.2 + Math.random() * 2 : 0.5 + Math.random() * 1.1;
    const vpd = Math.round(baseVpd * spike);
    rows.push({
      competitorChannelId: channel.id,
      title,
      publishedAt: new Date(Date.now() - age * DAY_MS).toISOString(),
      topic: niche,
      hook: pick(HOOKS, seed * 11),
      storyStructure: pick(STRUCTURES, seed * 13),
      views: vpd * age,
      viewsPerDay: vpd,
    });
  }

  // Flag outliers across the fresh batch with the shared z-score rule.
  const flagged = flagOutliers(rows);
  return flagged.map((f) => ({
    ...f,
    aiObservations: f.isOutlier
      ? "Statistical outlier vs. this channel's views/day baseline (z ≥ 2)."
      : undefined,
  }));
}

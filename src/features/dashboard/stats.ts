import type { Channel, Video } from "@/types";

const DAY = 86_400_000;

export interface WindowStats {
  published: number;
  avgCtr?: number;
  avgViewDurationSecs?: number;
  avgPercentViewed?: number;
  watchTimeHours: number;
  subscribersGained: number;
}

function avg(xs: number[]): number | undefined {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : undefined;
}

export function windowStats(videos: Video[], fromMs: number, toMs: number): WindowStats {
  const inWindow = videos.filter((v) => {
    if (!v.publishedAt) return false;
    const t = new Date(v.publishedAt).getTime();
    return t >= fromMs && t < toMs;
  });
  const m = inWindow.map((v) => v.metrics).filter(Boolean);
  return {
    published: inWindow.length,
    avgCtr: avg(m.map((x) => x!.ctr).filter((x): x is number => x != null)),
    avgViewDurationSecs: avg(
      m.map((x) => x!.avgViewDurationSecs).filter((x): x is number => x != null),
    ),
    avgPercentViewed: avg(
      m.map((x) => x!.avgPercentViewed).filter((x): x is number => x != null),
    ),
    watchTimeHours: m.reduce((a, x) => a + (x!.watchTimeHours ?? 0), 0),
    subscribersGained: m.reduce((a, x) => a + (x!.subscribersGained ?? 0), 0),
  };
}

export function pctDelta(now?: number, prior?: number): number | undefined {
  if (now == null || prior == null || prior === 0) return undefined;
  return ((now - prior) / prior) * 100;
}

/** Per-month averages of a metric, one series per channel, last `months` months. */
export function monthlyByChannel(
  videos: Video[],
  channels: Channel[],
  metric: (v: Video) => number | undefined,
  months = 6,
): Array<Record<string, string | number | undefined>> {
  const now = new Date();
  const rows: Array<Record<string, string | number | undefined>> = [];
  for (let i = months - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const row: Record<string, string | number | undefined> = {
      label: start.toLocaleDateString("en", { month: "short" }),
    };
    for (const ch of channels) {
      const values = videos
        .filter((v) => {
          if (v.channelId !== ch.id || !v.publishedAt) return false;
          const t = new Date(v.publishedAt).getTime();
          return t >= start.getTime() && t < end.getTime();
        })
        .map(metric)
        .filter((x): x is number => x != null);
      row[ch.id] = values.length
        ? +(values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)
        : undefined;
    }
    rows.push(row);
  }
  return rows;
}

export function last30Spark(videos: Video[], metric: (v: Video) => number | undefined): number[] {
  return videos
    .filter((v) => v.publishedAt)
    .sort((a, b) => a.publishedAt!.localeCompare(b.publishedAt!))
    .slice(-10)
    .map(metric)
    .filter((x): x is number => x != null);
}

/** Mean of a metric grouped by a video attribute, sorted descending. */
export function metricByGroup(
  videos: Video[],
  group: (v: Video) => string | undefined,
  metric: (v: Video) => number | undefined,
): Array<{ label: string; value: number; n: number }> {
  const buckets = new Map<string, number[]>();
  for (const v of videos) {
    const g = group(v);
    const m = metric(v);
    if (!g || m == null) continue;
    buckets.set(g, [...(buckets.get(g) ?? []), m]);
  }
  return [...buckets.entries()]
    .map(([label, xs]) => ({
      label,
      value: +(xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(2),
      n: xs.length,
    }))
    .sort((a, b) => b.value - a.value);
}

export const THIRTY_DAYS = 30 * DAY;

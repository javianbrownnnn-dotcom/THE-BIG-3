// CSV import core: header guessing + value parsing, independent of any UI.
// Built for YouTube Studio's analytics exports but forgiving enough for other
// tools — each target field carries a list of header aliases, and anything
// unmatched can be mapped by hand in the dialog.

import type { VideoMetricsInput } from "@/types";

export const IMPORT_FIELDS = [
  "title",
  "publishedAt",
  "durationSeconds",
  "views",
  "impressions",
  "ctr",
  "avgViewDurationSecs",
  "avgPercentViewed",
  "watchTimeHours",
  "subscribersGained",
] as const;

export type ImportField = (typeof IMPORT_FIELDS)[number];

export const FIELD_LABELS: Record<ImportField, string> = {
  title: "Title",
  publishedAt: "Publish date",
  durationSeconds: "Duration",
  views: "Views",
  impressions: "Impressions",
  ctr: "CTR %",
  avgViewDurationSecs: "Avg view duration",
  avgPercentViewed: "Avg % viewed",
  watchTimeHours: "Watch time (hours)",
  subscribersGained: "Subscribers gained",
};

// Aliases are compared after normalization (lowercase, alphanumerics only),
// so "Impressions click-through rate (%)" matches "impressionsclickthroughrate".
const ALIASES: Record<ImportField, string[]> = {
  title: ["video title", "title", "content title", "video", "name"],
  publishedAt: [
    "video publish time", "publish time", "published", "publish date",
    "date published", "upload date", "date",
  ],
  durationSeconds: ["duration", "video duration", "length"],
  views: ["views", "view count", "video views"],
  impressions: ["impressions", "thumbnail impressions"],
  ctr: [
    "impressions click through rate", "impressions ctr", "click through rate",
    "ctr", "thumbnail ctr",
  ],
  avgViewDurationSecs: ["average view duration", "avg view duration", "avd"],
  avgPercentViewed: [
    "average percentage viewed", "average percent viewed", "avg percent viewed",
    "average viewed", "apv",
  ],
  watchTimeHours: ["watch time hours", "watch time", "watchtime"],
  subscribersGained: ["subscribers", "subscribers gained", "net subscribers", "subs"],
};

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Guess which CSV header feeds each field. Exact alias match wins; then prefix. */
export function guessMapping(headers: string[]): Partial<Record<ImportField, string>> {
  const normalized = headers.map((h) => ({ raw: h, norm: normalize(h) }));
  const mapping: Partial<Record<ImportField, string>> = {};
  const taken = new Set<string>();

  for (const field of IMPORT_FIELDS) {
    const aliases = ALIASES[field].map(normalize);
    const exact = normalized.find((h) => !taken.has(h.raw) && aliases.includes(h.norm));
    const hit =
      exact ??
      normalized.find(
        (h) => !taken.has(h.raw) && aliases.some((a) => h.norm.startsWith(a)),
      );
    if (hit) {
      mapping[field] = hit.raw;
      taken.add(hit.raw);
    }
  }
  return mapping;
}

/** "1,234" → 1234; "4.5%" → 4.5; "" → undefined */
export function parseNumber(value: string | undefined): number | undefined {
  if (value == null) return undefined;
  const cleaned = value.replace(/[,%\s"]/g, "");
  if (cleaned === "") return undefined;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : undefined;
}

/** "0:04:35" → 275; "4:35" → 275; "275" → 275 */
export function parseDurationSecs(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (/^\d+(\.\d+)?$/.test(trimmed)) return Math.round(Number(trimmed));
  const parts = trimmed.split(":").map((p) => Number(p));
  if (parts.some((p) => !Number.isFinite(p))) return undefined;
  return parts.reduce((acc, p) => acc * 60 + p, 0);
}

/** YouTube exports "Mar 15, 2026" or ISO dates. */
export function parseDate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

export interface ImportedRow {
  title: string;
  publishedAt?: string;
  durationSeconds?: number;
  metrics: VideoMetricsInput;
}

/**
 * Apply a header mapping to raw CSV records. Rows without a title and
 * aggregate rows ("Total") are dropped — YouTube exports include one.
 */
export function extractRows(
  records: Array<Record<string, string>>,
  mapping: Partial<Record<ImportField, string>>,
): ImportedRow[] {
  const get = (rec: Record<string, string>, field: ImportField) => {
    const header = mapping[field];
    return header ? rec[header] : undefined;
  };

  const rows: ImportedRow[] = [];
  for (const rec of records) {
    const title = get(rec, "title")?.trim();
    if (!title || normalize(title) === "total") continue;
    rows.push({
      title,
      publishedAt: parseDate(get(rec, "publishedAt")),
      durationSeconds: parseDurationSecs(get(rec, "durationSeconds")),
      metrics: {
        views: parseNumber(get(rec, "views")),
        impressions: parseNumber(get(rec, "impressions")),
        ctr: parseNumber(get(rec, "ctr")),
        avgViewDurationSecs: parseDurationSecs(get(rec, "avgViewDurationSecs")),
        avgPercentViewed: parseNumber(get(rec, "avgPercentViewed")),
        watchTimeHours: parseNumber(get(rec, "watchTimeHours")),
        subscribersGained: parseNumber(get(rec, "subscribersGained")),
      },
    });
  }
  return rows;
}

/** Titles match case/punctuation-insensitively when deduplicating. */
export const titleKey = normalize;

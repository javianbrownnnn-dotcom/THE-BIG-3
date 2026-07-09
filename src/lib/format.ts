import { formatDistanceToNowStrict, format as formatDate } from "date-fns";

/** 1234567 → "1.2M", 45300 → "45.3K" */
export function compactNumber(n: number | undefined | null): string {
  if (n == null) return "—";
  return Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function percent(n: number | undefined | null, digits = 1): string {
  if (n == null) return "—";
  return `${n.toFixed(digits)}%`;
}

/** 754 → "12:34" */
export function duration(seconds: number | undefined | null): string {
  if (seconds == null) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function relativeTime(iso: string | undefined | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Math.abs(Date.now() - date.getTime()) < 60_000) return "just now";
  return formatDistanceToNowStrict(date, { addSuffix: true });
}

export function shortDate(iso: string | undefined | null): string {
  if (!iso) return "—";
  return formatDate(new Date(iso), "MMM d, yyyy");
}

/** "story_cold_open" → "Story cold open" */
export function humanize(s: string | undefined | null): string {
  if (!s) return "—";
  const spaced = s.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

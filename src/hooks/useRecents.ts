import { useEffect } from "react";

// Recently viewed entities, persisted locally, surfaced in the ⌘K palette.

export interface RecentItem {
  to: string;
  label: string;
  kind: "video" | "sop" | "channel" | "report";
}

const STORAGE_KEY = "big3.recents";
const MAX = 8;

export function getRecents(): RecentItem[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

/** Record a visit to a detail page. Call from the page once data is loaded. */
export function useRecordRecent(item: RecentItem | null) {
  useEffect(() => {
    if (!item) return;
    const rest = getRecents().filter((r) => r.to !== item.to);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([item, ...rest].slice(0, MAX)));
  }, [item?.to, item?.label]); // eslint-disable-line react-hooks/exhaustive-deps
}

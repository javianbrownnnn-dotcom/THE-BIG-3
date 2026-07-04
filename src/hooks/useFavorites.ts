import { useCallback, useSyncExternalStore } from "react";

// Starred entity ids, persisted locally, shared across all subscribers.

const STORAGE_KEY = "big3.favorites";
const listeners = new Set<() => void>();
let cache: string | null = null;

function read(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"));
  } catch {
    return new Set();
  }
}

function snapshot(): string {
  if (cache === null) cache = localStorage.getItem(STORAGE_KEY) ?? "[]";
  return cache;
}

export function useFavorites() {
  const raw = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    snapshot,
  );

  const favorites = new Set<string>(JSON.parse(raw) as string[]);

  const toggle = useCallback((id: string) => {
    const next = read();
    if (next.has(id)) next.delete(id);
    else next.add(id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
    cache = null;
    listeners.forEach((cb) => cb());
  }, []);

  return { favorites, toggle };
}

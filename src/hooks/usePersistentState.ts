import { useEffect, useState } from "react";

/**
 * useState that survives reloads via localStorage. For remembering
 * lightweight UI preferences (filters, toggles) — not data.
 */
export function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage full or blocked — the state still works for this session */
    }
  }, [key, value]);

  return [value, setValue] as const;
}

import { useEffect, useState } from "react";

/**
 * useState that survives the app being killed (iOS reclaims backgrounded PWAs
 * aggressively): every change mirrors to localStorage, and the initial value
 * restores from it. Call the returned clear() after a successful submit so
 * stale drafts don't haunt the next open.
 */
export function usePersistedState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw != null) {
        const parsed = JSON.parse(raw) as T;
        // Object drafts merge over the initial shape so new fields added in
        // later app versions don't come back undefined.
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          return { ...initial, ...parsed };
        }
        return parsed;
      }
    } catch {
      // corrupted draft — fall through to the initial value
    }
    return initial;
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // storage full/blocked — typing still works, it just won't survive a kill
    }
  }, [key, value]);

  const clear = () => {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
    setValue(initial);
  };

  return [value, setValue, clear] as const;
}

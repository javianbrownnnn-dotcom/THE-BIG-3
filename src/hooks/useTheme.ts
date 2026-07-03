import { useCallback, useSyncExternalStore } from "react";

// Dark mode first: dark is the default; light is the stored exception.
const STORAGE_KEY = "big3.theme";
const listeners = new Set<() => void>();

function isDark(): boolean {
  return document.documentElement.classList.contains("dark");
}

export function useTheme() {
  const dark = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    isDark,
  );

  const toggle = useCallback(() => {
    const next = !isDark();
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
    listeners.forEach((cb) => cb());
  }, []);

  return { dark, toggle };
}

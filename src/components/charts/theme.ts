import { useSyncExternalStore } from "react";

// Recharts sets SVG presentation attributes, where CSS var() doesn't resolve,
// so chart colors are read from the design tokens at runtime and re-read when
// the theme class flips. Series slots are assigned in FIXED order (slot 1 is
// always slot 1) — a CVD-safety property of the palette, never cycled.

export interface ChartTheme {
  grid: string;
  axis: string;
  tick: string;
  surface: string;
  series: string[];
  statusGood: string;
  statusWarning: string;
  statusSerious: string;
  statusCritical: string;
  deltaUp: string;
  deltaDown: string;
}

function readTheme(): ChartTheme {
  const styles = getComputedStyle(document.documentElement);
  const v = (name: string) => styles.getPropertyValue(name).trim();
  return {
    grid: v("--chart-grid"),
    axis: v("--chart-axis"),
    tick: v("--chart-tick"),
    surface: v("--chart-surface"),
    series: [1, 2, 3, 4, 5, 6].map((i) => v(`--series-${i}`)),
    statusGood: v("--status-good"),
    statusWarning: v("--status-warning"),
    statusSerious: v("--status-serious"),
    statusCritical: v("--status-critical"),
    deltaUp: v("--delta-up"),
    deltaDown: v("--delta-down"),
  };
}

let cached: { key: string; theme: ChartTheme } | null = null;

function getSnapshot(): ChartTheme {
  const key = document.documentElement.className;
  if (!cached || cached.key !== key) {
    cached = { key, theme: readTheme() };
  }
  return cached.theme;
}

function subscribe(callback: () => void): () => void {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
}

export function useChartTheme(): ChartTheme {
  return useSyncExternalStore(subscribe, getSnapshot);
}

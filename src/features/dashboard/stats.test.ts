import { describe, expect, it } from "vitest";
import { metricByGroup, pctDelta, windowStats } from "./stats";
import type { Video } from "@/types";

const DAY = 86_400_000;
const now = Date.now();

function video(overrides: Partial<Video> & { ctr?: number; pct?: number }): Video {
  const { ctr, pct, ...rest } = overrides;
  return {
    id: Math.random().toString(36),
    channelId: "ch",
    title: "t",
    format: "long_form",
    createdAt: new Date().toISOString(),
    publishedAt: new Date(now - 5 * DAY).toISOString(),
    metrics: {
      capturedAt: new Date().toISOString(),
      ctr,
      avgPercentViewed: pct,
      watchTimeHours: 100,
      subscribersGained: 10,
    },
    ...rest,
  };
}

describe("windowStats", () => {
  it("aggregates only videos inside the window", () => {
    const inside = video({ ctr: 6 });
    const outside = video({ ctr: 2, publishedAt: new Date(now - 90 * DAY).toISOString() });
    const stats = windowStats([inside, outside], now - 30 * DAY, now);
    expect(stats.published).toBe(1);
    expect(stats.avgCtr).toBe(6);
    expect(stats.watchTimeHours).toBe(100);
    expect(stats.subscribersGained).toBe(10);
  });

  it("averages across videos and skips missing metrics", () => {
    const stats = windowStats(
      [video({ ctr: 4 }), video({ ctr: 8 }), video({ ctr: undefined })],
      now - 30 * DAY,
      now,
    );
    expect(stats.published).toBe(3);
    expect(stats.avgCtr).toBe(6);
  });
});

describe("pctDelta", () => {
  it("computes percent change", () => {
    expect(pctDelta(6, 5)).toBeCloseTo(20);
    expect(pctDelta(4, 5)).toBeCloseTo(-20);
  });
  it("returns undefined without a valid prior", () => {
    expect(pctDelta(6, undefined)).toBeUndefined();
    expect(pctDelta(undefined, 5)).toBeUndefined();
    expect(pctDelta(6, 0)).toBeUndefined();
  });
});

describe("metricByGroup", () => {
  it("groups, averages, and sorts descending", () => {
    const rows = metricByGroup(
      [
        video({ hookType: "question", ctr: 4 }),
        video({ hookType: "question", ctr: 6 }),
        video({ hookType: "story_cold_open", ctr: 9 }),
        video({ hookType: undefined, ctr: 99 }), // no group → excluded
      ],
      (v) => v.hookType,
      (v) => v.metrics?.ctr,
    );
    expect(rows).toEqual([
      { label: "story_cold_open", value: 9, n: 1 },
      { label: "question", value: 5, n: 2 },
    ]);
  });
});

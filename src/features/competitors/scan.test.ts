import { describe, expect, it } from "vitest";
import {
  aggregateChannelStats,
  isResearchRow,
  flagOutliers,
  simulateChannelScan,
  uploadCadenceDays,
  uploadsToCompetitorVideos,
  viewsPerDay,
} from "./scan";
import type { CompetitorChannel } from "@/types";
import type { YtVideo } from "@/lib/youtube";

describe("viewsPerDay", () => {
  it("normalizes views by age", () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 86_400_000).toISOString();
    expect(viewsPerDay(1000, tenDaysAgo)).toBe(100);
  });
  it("is zero without views", () => {
    expect(viewsPerDay(undefined, new Date().toISOString())).toBe(0);
  });
});

describe("flagOutliers", () => {
  it("flags a value ≥2 SD above the channel mean", () => {
    // A tight baseline of a dozen videos plus one clear spike. (With too few
    // points z can't mathematically reach 2 — real scans pull ~60 uploads.)
    const rows = [
      ...Array.from({ length: 12 }, (_, i) => ({ viewsPerDay: 100 + (i % 3) * 5 })),
      { viewsPerDay: 900 }, // the spike
    ];
    const flagged = flagOutliers(rows);
    const outliers = flagged.filter((r) => r.isOutlier);
    expect(outliers).toHaveLength(1);
    expect(outliers[0].viewsPerDay).toBe(900);
    expect(outliers[0].outlierScore).toBeGreaterThanOrEqual(2);
  });

  it("flags nothing when the sample is too small", () => {
    const flagged = flagOutliers([{ viewsPerDay: 10 }, { viewsPerDay: 9999 }]);
    expect(flagged.every((r) => !r.isOutlier)).toBe(true);
  });

  it("flags nothing when every value is identical (SD = 0)", () => {
    const flagged = flagOutliers([
      { viewsPerDay: 50 },
      { viewsPerDay: 50 },
      { viewsPerDay: 50 },
    ]);
    expect(flagged.every((r) => !r.isOutlier)).toBe(true);
  });
});

describe("uploadCadenceDays", () => {
  it("averages the gaps between uploads", () => {
    const now = Date.now();
    const dates = [
      new Date(now).toISOString(),
      new Date(now - 7 * 86_400_000).toISOString(),
      new Date(now - 14 * 86_400_000).toISOString(),
    ];
    expect(uploadCadenceDays(dates)).toBe(7);
  });
  it("returns undefined with fewer than two dates", () => {
    expect(uploadCadenceDays([new Date().toISOString()])).toBeUndefined();
  });
});

describe("aggregateChannelStats", () => {
  it("rolls videos up into headline stats", () => {
    const stats = aggregateChannelStats([
      { viewsPerDay: 100, isOutlier: false, publishedAt: new Date().toISOString() },
      { viewsPerDay: 300, isOutlier: true, publishedAt: new Date(Date.now() - 5 * 86_400_000).toISOString() },
      { viewsPerDay: 200, isOutlier: false, publishedAt: new Date(Date.now() - 10 * 86_400_000).toISOString() },
    ]);
    expect(stats.trackedVideoCount).toBe(3);
    expect(stats.outlierCount).toBe(1);
    expect(stats.medianViewsPerDay).toBe(200);
  });
});

describe("uploadsToCompetitorVideos", () => {
  it("maps YouTube uploads and flags outliers", () => {
    const day = 86_400_000;
    const ago = new Date(Date.now() - 10 * day).toISOString();
    const uploads: YtVideo[] = [
      ...Array.from({ length: 12 }, (_, i) => ({
        videoId: `v${i}`,
        title: `Baseline ${i}`,
        publishedAt: ago,
        durationSeconds: 600,
        views: 1000 + (i % 3) * 50,
      })),
      { videoId: "spike", title: "Spike", publishedAt: ago, durationSeconds: 600, views: 90_000 },
    ];
    const rows = uploadsToCompetitorVideos("cc_1", uploads);
    expect(rows).toHaveLength(13);
    expect(rows.every((r) => r.competitorChannelId === "cc_1")).toBe(true);
    expect(rows.find((r) => r.title === "Spike")?.isOutlier).toBe(true);
    expect(rows.find((r) => r.title === "Spike")?.url).toContain("watch?v=spike");
  });
});

describe("simulateChannelScan", () => {
  const channel: CompetitorChannel = {
    id: "cc_1",
    organizationId: "org_1",
    name: "Test Channel",
    niche: "Business",
  };

  it("generates the requested number of unique videos", () => {
    const rows = simulateChannelScan(channel, new Set(), 8);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBeLessThanOrEqual(8);
    const titles = new Set(rows.map((r) => r.title));
    expect(titles.size).toBe(rows.length);
    expect(rows.every((r) => r.competitorChannelId === "cc_1")).toBe(true);
    expect(rows.every((r) => (r.viewsPerDay ?? 0) > 0)).toBe(true);
  });

  it("skips titles already tracked", () => {
    const seen = new Set<string>();
    const first = simulateChannelScan(channel, seen, 6);
    const second = simulateChannelScan(channel, seen, 6);
    const overlap = second.filter((r) => first.some((f) => f.title === r.title));
    expect(overlap).toHaveLength(0);
  });
});

describe("isResearchRow", () => {
  it("identifies seeded CI research rows by id", () => {
    expect(isResearchRow({ id: "cv_ci_coldfusion_1" })).toBe(true);
    expect(isResearchRow({ id: "cv_cx_hochelaga_2" })).toBe(true);
    expect(isResearchRow({ id: "cv_0001" })).toBe(false); // seeded demo (non-CI)
    expect(isResearchRow({ id: "cv_lx2abc" })).toBe(false); // runtime-created
    expect(isResearchRow({})).toBe(false);
  });
});

describe("aggregateChannelStats with research rows excluded", () => {
  it("real rows alone drive the stats a live scan writes", () => {
    const research = [
      { id: "cv_ci_x_1", viewsPerDay: 999_999, isOutlier: true, publishedAt: "2026-01-01T00:00:00Z" },
    ];
    const real = [
      { id: "cv_a", viewsPerDay: 1000, isOutlier: false, publishedAt: "2026-06-01T00:00:00Z" },
      { id: "cv_b", viewsPerDay: 2000, isOutlier: false, publishedAt: "2026-06-08T00:00:00Z" },
      { id: "cv_c", viewsPerDay: 3000, isOutlier: true, publishedAt: "2026-06-15T00:00:00Z" },
    ];
    const all = [...research, ...real];
    const onlyReal = all.filter((v) => !isResearchRow(v));
    const stats = aggregateChannelStats(onlyReal);
    expect(stats.trackedVideoCount).toBe(3);
    expect(stats.medianViewsPerDay).toBe(2000); // untouched by the 999,999 research row
    expect(stats.outlierCount).toBe(1);
    expect(stats.uploadCadenceDays).toBe(7);
  });
});

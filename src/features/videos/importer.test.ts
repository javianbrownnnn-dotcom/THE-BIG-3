import { describe, expect, it } from "vitest";
import {
  extractRows,
  guessMapping,
  parseDurationSecs,
  parseNumber,
} from "./importer";

// Headers exactly as YouTube Studio's "Content" analytics export writes them.
const YT_HEADERS = [
  "Content",
  "Video title",
  "Video publish time",
  "Duration",
  "Views",
  "Impressions",
  "Impressions click-through rate (%)",
  "Average view duration",
  "Average percentage viewed (%)",
  "Watch time (hours)",
  "Subscribers",
];

describe("guessMapping", () => {
  it("maps a YouTube Studio export automatically", () => {
    const m = guessMapping(YT_HEADERS);
    expect(m.title).toBe("Video title");
    expect(m.publishedAt).toBe("Video publish time");
    expect(m.durationSeconds).toBe("Duration");
    expect(m.views).toBe("Views");
    expect(m.impressions).toBe("Impressions");
    expect(m.ctr).toBe("Impressions click-through rate (%)");
    expect(m.avgViewDurationSecs).toBe("Average view duration");
    expect(m.avgPercentViewed).toBe("Average percentage viewed (%)");
    expect(m.watchTimeHours).toBe("Watch time (hours)");
    expect(m.subscribersGained).toBe("Subscribers");
  });

  it("handles generic third-party headers", () => {
    const m = guessMapping(["Title", "Date", "View Count", "CTR"]);
    expect(m.title).toBe("Title");
    expect(m.publishedAt).toBe("Date");
    expect(m.views).toBe("View Count");
    expect(m.ctr).toBe("CTR");
  });
});

describe("value parsing", () => {
  it("parses formatted numbers", () => {
    expect(parseNumber("1,234,567")).toBe(1234567);
    expect(parseNumber("4.5%")).toBe(4.5);
    expect(parseNumber("")).toBeUndefined();
    expect(parseNumber("n/a")).toBeUndefined();
  });

  it("parses durations in H:MM:SS, MM:SS, and seconds", () => {
    expect(parseDurationSecs("0:04:35")).toBe(275);
    expect(parseDurationSecs("4:35")).toBe(275);
    expect(parseDurationSecs("275")).toBe(275);
    expect(parseDurationSecs("bogus")).toBeUndefined();
  });
});

describe("extractRows", () => {
  it("builds rows and drops the Total aggregate", () => {
    const mapping = guessMapping(YT_HEADERS);
    const rows = extractRows(
      [
        {
          "Video title": "Total",
          Views: "999999",
        },
        {
          "Video title": "The collapse of WeWork",
          "Video publish time": "Mar 15, 2026",
          Duration: "0:16:40",
          Views: "120,401",
          Impressions: "2,010,332",
          "Impressions click-through rate (%)": "5.99",
          "Average view duration": "0:07:02",
          "Average percentage viewed (%)": "42.2",
          "Watch time (hours)": "14,113.5",
          Subscribers: "861",
        },
      ],
      mapping,
    );
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row.title).toBe("The collapse of WeWork");
    expect(row.publishedAt).toMatch(/^2026-03-15/);
    expect(row.durationSeconds).toBe(1000);
    expect(row.metrics.views).toBe(120401);
    expect(row.metrics.ctr).toBe(5.99);
    expect(row.metrics.avgViewDurationSecs).toBe(422);
    expect(row.metrics.avgPercentViewed).toBe(42.2);
    expect(row.metrics.watchTimeHours).toBe(14113.5);
    expect(row.metrics.subscribersGained).toBe(861);
  });
});

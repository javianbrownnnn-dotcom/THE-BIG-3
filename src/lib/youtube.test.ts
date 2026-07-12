import { describe, expect, it } from "vitest";
import { isoDurationToSecs, mapVideoItem, parseChannelRef } from "./youtube";

describe("parseChannelRef", () => {
  it("understands channel URLs, handles, and raw ids", () => {
    expect(parseChannelRef("https://www.youtube.com/@MagnatesMedia")).toEqual({
      handle: "MagnatesMedia",
    });
    expect(parseChannelRef("@MagnatesMedia")).toEqual({ handle: "MagnatesMedia" });
    expect(parseChannelRef("MagnatesMedia")).toEqual({ handle: "MagnatesMedia" });
    expect(
      parseChannelRef("https://youtube.com/channel/UC_x5XG1OV2P6uZZ5FSM9Ttw"),
    ).toEqual({ channelId: "UC_x5XG1OV2P6uZZ5FSM9Ttw" });
    expect(parseChannelRef("UC_x5XG1OV2P6uZZ5FSM9Ttw")).toEqual({
      channelId: "UC_x5XG1OV2P6uZZ5FSM9Ttw",
    });
  });
});

describe("isoDurationToSecs", () => {
  it("parses ISO-8601 durations", () => {
    expect(isoDurationToSecs("PT4M35S")).toBe(275);
    expect(isoDurationToSecs("PT1H4M35S")).toBe(3875);
    expect(isoDurationToSecs("PT45S")).toBe(45);
    expect(isoDurationToSecs(undefined)).toBe(0);
  });

  it("handles day components from 24h+ streams", () => {
    expect(isoDurationToSecs("P1DT2H30M")).toBe(95_400);
    expect(isoDurationToSecs("P1D")).toBe(86_400);
    expect(isoDurationToSecs("PT0S")).toBe(0);
  });
});

describe("mapVideoItem", () => {
  it("maps a videos.list item", () => {
    const video = mapVideoItem({
      id: "abc123",
      snippet: {
        title: "The collapse of WeWork",
        publishedAt: "2026-03-15T14:00:00Z",
        thumbnails: { medium: { url: "https://i.ytimg.com/vi/abc123/mqdefault.jpg" } },
      },
      contentDetails: { duration: "PT16M40S" },
      statistics: { viewCount: "120401", likeCount: "8100", commentCount: "902" },
    });
    expect(video).toEqual({
      videoId: "abc123",
      title: "The collapse of WeWork",
      publishedAt: "2026-03-15T14:00:00Z",
      durationSeconds: 1000,
      views: 120401,
      likes: 8100,
      comments: 902,
      thumbnailUrl: "https://i.ytimg.com/vi/abc123/mqdefault.jpg",
    });
  });

  it("hidden statistics stay undefined instead of becoming NaN or 0", () => {
    // Channels can hide like counts; live streams can omit viewCount.
    const video = mapVideoItem({
      id: "xyz",
      snippet: { title: "No stats", publishedAt: "2026-01-01T00:00:00Z", thumbnails: {} },
      contentDetails: { duration: "PT10M" },
      statistics: {},
    });
    expect(video.views).toBeUndefined();
    expect(video.likes).toBeUndefined();
    expect(video.comments).toBeUndefined();
    expect(Number.isNaN(video.views as unknown as number)).toBe(false);
  });

  it("string counts from the API become numbers", () => {
    const video = mapVideoItem({
      id: "n1",
      snippet: { title: "t", publishedAt: "2026-01-01T00:00:00Z", thumbnails: {} },
      contentDetails: { duration: "PT1M" },
      statistics: { viewCount: "0" },
    });
    expect(video.views).toBe(0);
    expect(typeof video.views).toBe("number");
  });
});

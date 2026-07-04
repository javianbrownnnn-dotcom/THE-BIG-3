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
});

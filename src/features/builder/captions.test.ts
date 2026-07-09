import { describe, expect, it } from "vitest";
import type { BuilderSection } from "@/types";
import {
  buildSrt,
  cueChunks,
  estimateSeconds,
  parseSections,
  sectionSeconds,
  syncSections,
} from "./captions";

const SCRIPT = `# The Quiet Empire

<!-- Target 18 min ≈ 2500–2900 words. -->

## 0:00–1:38 — Cold Open

[Archival: courtroom steps]

She walked into JPMorgan with four million customers. Three million of them didn't exist.

## 1:38–3:16 — Promise

By the end you'll understand exactly how the machine bought the story.`;

describe("parseSections", () => {
  it("splits on ## headings, drops title/comments/stage directions", () => {
    const sections = parseSections(SCRIPT);
    expect(sections).toHaveLength(2);
    expect(sections[0].heading).toBe("0:00–1:38 — Cold Open");
    expect(sections[0].text).toContain("four million customers");
    expect(sections[0].text).not.toContain("Archival");
    expect(sections[0].text).not.toContain("Target 18 min");
  });

  it("falls back to one section for unstructured text", () => {
    const sections = parseSections("Just a plain script with no headings.");
    expect(sections).toHaveLength(1);
    expect(sections[0].heading).toBe("Full script");
  });

  it("returns nothing for an empty script", () => {
    expect(parseSections("  \n ")).toHaveLength(0);
  });
});

describe("syncSections", () => {
  it("keeps recordings when headings match after a re-parse", () => {
    const existing: BuilderSection[] = [
      {
        id: "sec_a",
        heading: "0:00–1:38 — Cold Open",
        text: "old text",
        voDataUrl: "data:audio/webm;base64,xxx",
        voDurationSec: 42,
        broll: [{ url: "u", kind: "image", source: "pexels" }],
      },
    ];
    const synced = syncSections(parseSections(SCRIPT), existing);
    expect(synced[0].id).toBe("sec_a");
    expect(synced[0].voDataUrl).toBe("data:audio/webm;base64,xxx");
    expect(synced[0].voDurationSec).toBe(42);
    expect(synced[0].broll).toHaveLength(1);
    expect(synced[0].text).toContain("four million customers"); // text refreshed
    expect(synced[1].voDataUrl).toBeUndefined();
  });
});

describe("timing", () => {
  it("estimates at 150 wpm and prefers the real recording", () => {
    const section: BuilderSection = {
      id: "s",
      heading: "h",
      text: Array(150).fill("word").join(" "),
      broll: [],
    };
    expect(estimateSeconds(section.text)).toBeCloseTo(60);
    expect(sectionSeconds(section)).toBeCloseTo(60);
    expect(sectionSeconds({ ...section, voDurationSec: 45 })).toBe(45);
  });
});

describe("cueChunks", () => {
  it("keeps short sentences whole and splits long ones", () => {
    const chunks = cueChunks(
      "Short one. " +
        "This considerably longer sentence keeps going and going with many more words than any caption should ever hold on screen.",
    );
    expect(chunks[0]).toBe("Short one.");
    expect(chunks.length).toBeGreaterThan(2);
    for (const c of chunks) expect(c.split(" ").length).toBeLessThanOrEqual(12);
  });
});

describe("buildSrt", () => {
  it("produces sequential numbered cues covering the section duration", () => {
    const srt = buildSrt([
      {
        id: "s1",
        heading: "h",
        text: "First sentence here. Second sentence follows.",
        voDurationSec: 10,
        voDataUrl: "data:",
        broll: [],
      },
    ]);
    expect(srt).toMatch(/^1\n00:00:00,000 --> /);
    expect(srt).toContain("2\n");
    expect(srt).toContain("First sentence here.");
    // last cue ends at the recorded 10s
    expect(srt).toContain("00:00:10,000");
  });
});

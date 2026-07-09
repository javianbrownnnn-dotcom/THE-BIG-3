// Captions + section parsing for the Video Builder.
//
// Sections come from the script's "## heading" structure (the studio writes
// scripts that way). Caption timing uses the real recorded narration duration
// per section when it exists, else an estimate at the standard 150 wpm.

import type { BuilderSection, VideoBuilderState } from "@/types";

export const WORDS_PER_MINUTE = 150;

export function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

export function estimateSeconds(text: string): number {
  return (wordCount(text) / WORDS_PER_MINUTE) * 60;
}

/** Effective duration of a section: real recording beats the estimate. */
export function sectionSeconds(s: BuilderSection): number {
  return s.voDurationSec ?? estimateSeconds(s.text);
}

/**
 * Parse a script (markdown-ish, "## 0:00–1:38 — Cold Open" headings) into
 * builder sections. Falls back to one section for unstructured scripts.
 * Comment lines (<!-- -->) and stage directions in [brackets] on their own
 * line are dropped — they're not narration.
 */
export function parseSections(script: string): Array<{ heading: string; text: string }> {
  const cleaned = script
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/^# .*$/m, "") // top-level title line
    .trim();
  if (!cleaned) return [];

  const parts = cleaned.split(/^##\s+/m).filter((p) => p.trim());
  if (parts.length <= 1 && !/^##\s/m.test(cleaned)) {
    return [{ heading: "Full script", text: cleaned.trim() }];
  }
  return parts.map((part) => {
    const [first, ...rest] = part.split("\n");
    const text = rest
      .filter((line) => !/^\s*\[[^\]]*\]\s*$/.test(line)) // pure stage directions
      .join("\n")
      .trim();
    return { heading: first.trim(), text };
  });
}

/** Merge a fresh parse with existing sections: recordings survive re-syncs. */
export function syncSections(
  parsed: Array<{ heading: string; text: string }>,
  existing: BuilderSection[],
): BuilderSection[] {
  return parsed.map((p, i) => {
    const match =
      existing.find((e) => e.heading === p.heading) ?? existing[i];
    return {
      id: match?.id ?? `sec_${Math.random().toString(36).slice(2, 10)}`,
      heading: p.heading,
      text: p.text,
      voDataUrl: match?.voDataUrl,
      voDurationSec: match?.voDurationSec,
      broll: match?.broll ?? [],
    };
  });
}

function srtTime(totalSec: number): string {
  const ms = Math.max(0, Math.round(totalSec * 1000));
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const frac = ms % 1000;
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(frac, 3)}`;
}

/** Split narration into caption-sized cues (aim ≤ ~9 words per cue). */
export function cueChunks(text: string): string[] {
  const sentences = text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?…])\s+/)
    .filter(Boolean);
  const chunks: string[] = [];
  for (const sentence of sentences) {
    const words = sentence.split(" ");
    if (words.length <= 12) {
      chunks.push(sentence);
      continue;
    }
    // Long sentence: break at commas first, then hard-wrap.
    for (const piece of sentence.split(/(?<=,)\s+/)) {
      const w = piece.split(" ");
      for (let i = 0; i < w.length; i += 9) {
        chunks.push(w.slice(i, i + 9).join(" "));
      }
    }
  }
  return chunks;
}

/**
 * Build an SRT file from the sections. Cues within a section share its
 * duration proportionally to word count, so a real recording stretches or
 * tightens its captions to match.
 */
export function buildSrt(sections: BuilderSection[]): string {
  const lines: string[] = [];
  let clock = 0;
  let n = 1;
  for (const section of sections) {
    const total = sectionSeconds(section);
    const chunks = cueChunks(section.text);
    const totalWords = chunks.reduce((sum, c) => sum + wordCount(c), 0) || 1;
    let offset = 0;
    for (const chunk of chunks) {
      const dur = (wordCount(chunk) / totalWords) * total;
      lines.push(
        String(n++),
        `${srtTime(clock + offset)} --> ${srtTime(clock + offset + dur)}`,
        chunk,
        "",
      );
      offset += dur;
    }
    clock += total;
  }
  return lines.join("\n");
}

/** Human-readable shot list for the edit kit (markdown). */
export function buildShotList(title: string, sections: BuilderSection[]): string {
  const fmt = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.round(sec % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  };
  let clock = 0;
  const blocks = sections.map((s, i) => {
    const dur = sectionSeconds(s);
    const start = fmt(clock);
    clock += dur;
    const vo = s.voDataUrl
      ? `recorded (${Math.round(s.voDurationSec ?? 0)}s) — file: vo-${String(i + 1).padStart(2, "0")}.webm`
      : "NOT RECORDED YET";
    const broll = s.broll.length
      ? s.broll.map((b) => `  - ${b.kind}: ${b.url}${b.credit ? ` (${b.credit})` : ""}`).join("\n")
      : "  - (no b-roll attached)";
    return [
      `## ${start} — ${s.heading}`,
      `Narration: ${vo}`,
      `B-roll:`,
      broll,
      "",
      s.text,
    ].join("\n");
  });
  return [`# Edit kit — ${title}`, `Total ≈ ${fmt(clock)}. Captions in captions.srt.`, "", ...blocks].join("\n\n");
}

export function builderProgress(state: VideoBuilderState | undefined): {
  recorded: number;
  withBroll: number;
  total: number;
} {
  const sections = state?.sections ?? [];
  return {
    recorded: sections.filter((s) => s.voDataUrl).length,
    withBroll: sections.filter((s) => s.broll.length > 0).length,
    total: sections.length,
  };
}

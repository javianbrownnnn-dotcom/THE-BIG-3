// AI drafting + critique for the video doc.
//
// "AI drafts, humans polish": one tap produces a first-pass hook, outline,
// description, and title candidates. In demo mode this is a template engine
// grounded in the team's own SOPs and performance data (best hook type by
// actual CTR) — honest about being a starting point, never fabricated stats.
// With the real backend, the same call routes through Claude via the
// ai-coach edge function for full-quality drafts.

import type { Production, ProductionStage, Sop, Video } from "@/types";

export interface DraftResult {
  hookText: string;
  scriptBody: string;
  description: string;
  titleCandidates: Array<{ text: string; starred: boolean }>;
}

function bestHookType(videos: Video[]): string {
  const groups = new Map<string, number[]>();
  for (const v of videos) {
    if (v.hookType && v.metrics?.ctr != null) {
      groups.set(v.hookType, [...(groups.get(v.hookType) ?? []), v.metrics.ctr]);
    }
  }
  let best = "story_cold_open";
  let bestMean = 0;
  for (const [k, xs] of groups) {
    const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
    if (mean > bestMean) {
      best = k;
      bestMean = mean;
    }
  }
  return best;
}

export function draftFromTemplates(
  production: Production,
  videos: Video[],
): DraftResult {
  const topic = production.topic || production.title;
  const hookStyle = bestHookType(videos);

  const hookText =
    hookStyle === "story_cold_open"
      ? `[COLD OPEN — drop into one concrete scene from "${topic}", mid-action. One character, one problem, no context.]\n\nThen stakes in two sentences: why does this matter to the viewer watching right now?\n\n(Draft scaffold from your Hook Writing SOP — your data says ${hookStyle.replace(/_/g, " ")} hooks lead your CTR. Replace every bracket with a real scene.)`
      : `[Open with a ${hookStyle.replace(/_/g, " ")} on "${topic}" — your channel's strongest opener by CTR.]\n\nState the stakes within two sentences. No intro, no "in this video".`;

  const scriptBody = `ACT 1 — The setup: what the audience believes about "${topic}" before you complicate it.\n\nACT 2 — The turn: the discovery, contradiction, or mechanism that changes the picture. End the act on an open question.\n\nACT 3 — The payoff: resolve the question, land the insight, connect it back to the opening scene.\n\n(Structure from your Story Structure SOP — rise-and-fall/case-study beats. Write ~150 words per minute of target runtime.)`;

  const description = `${topic} — [one-sentence version of the hook, no spoilers].\n\n[2-3 sentences: what the viewer will learn and why it matters.]\n\nChapters:\n0:00 [Hook]\n\n[CTA per your packaging SOP: one ask, made once.]`;

  const base = topic.replace(/\.$/, "");
  const titleCandidates = [
    { text: base, starred: false },
    { text: `The Truth About ${base}`, starred: false },
    { text: `What Nobody Tells You About ${base}`, starred: false },
    { text: `How ${base} Actually Works`, starred: false },
    { text: `${base}: The Untold Story`, starred: false },
  ].map((t) => ({ ...t, text: t.text.length > 55 ? t.text.slice(0, 55) : t.text }));

  return { hookText, scriptBody, description, titleCandidates };
}

// ---------------------------------------------------------------------------
// Critique: rule-based checks against the team's own SOPs. Fast, honest,
// and identical in demo and production modes.
// ---------------------------------------------------------------------------

export interface CritiqueFinding {
  severity: "warn" | "good";
  message: string;
}

const WPM = 150;

export function wordCount(text: string | undefined): number {
  return text?.trim() ? text.trim().split(/\s+/).length : 0;
}

export function estimatedRuntime(production: Production): number {
  const words =
    wordCount(production.hookText) +
    wordCount(production.scriptHook) +
    wordCount(production.scriptBody) +
    wordCount(production.scriptOutro);
  return Math.round((words / WPM) * 60); // seconds
}

export function critique(production: Production): CritiqueFinding[] {
  const findings: CritiqueFinding[] = [];
  const hook = production.hookText ?? "";

  if (!hook.trim()) {
    findings.push({ severity: "warn", message: "No hook written yet — it's the highest-leverage 30 seconds (Hook Writing SOP)." });
  } else {
    const hookWords = wordCount(hook);
    if (hookWords > 90) {
      findings.push({ severity: "warn", message: `Hook is ${hookWords} words (~${Math.round((hookWords / WPM) * 60)}s read aloud). Your SOP says cut anything over 20 seconds in half.` });
    } else {
      findings.push({ severity: "good", message: `Hook length OK (${hookWords} words ≈ ${Math.round((hookWords / WPM) * 60)}s).` });
    }
    if (/^\s*[\d$€£%]/.test(hook)) {
      findings.push({ severity: "warn", message: "Hook opens with a number — statistic-led openers are your weakest hook type org-wide. Open on a scene instead." });
    }
    if (/in this video|today we/i.test(hook)) {
      findings.push({ severity: "warn", message: `Hook contains "in this video / today we" — your SOP bans context-setting openers.` });
    }
  }

  const longTitles = production.titleCandidates.filter((t) => t.text.length > 55);
  if (longTitles.length) {
    findings.push({ severity: "warn", message: `${longTitles.length} title candidate${longTitles.length > 1 ? "s" : ""} over 55 characters — will truncate on mobile.` });
  }
  if (production.titleCandidates.length > 0 && !production.titleCandidates.some((t) => t.starred)) {
    findings.push({ severity: "warn", message: "No finalist starred among the title candidates." });
  }
  if (production.titleCandidates.length >= 5) {
    findings.push({ severity: "good", message: `${production.titleCandidates.length} title candidates drafted — matches the packaging SOP.` });
  }

  if (!production.thumbnailConcept?.trim() && production.stage !== "scripting") {
    findings.push({ severity: "warn", message: "No thumbnail concept yet — packaging SOP wants it written before the edit locks." });
  }
  if (!production.goal?.trim()) {
    findings.push({ severity: "warn", message: "No measurable goal set — without one, the loop can't score this video after publish." });
  }

  const runtime = estimatedRuntime(production);
  if (runtime > 0) {
    findings.push({
      severity: "good",
      message: `Estimated runtime from script: ~${Math.floor(runtime / 60)}:${String(runtime % 60).padStart(2, "0")} at ${WPM} wpm.`,
    });
  }

  return findings;
}

// ---------------------------------------------------------------------------
// Per-stage SOP checklist wiring: which SOP guides each stage.
// ---------------------------------------------------------------------------

export const STAGE_SOP_TITLES: Partial<Record<ProductionStage, string[]>> = {
  scripting: ["Hook Writing (First 30 Seconds)", "Hook Writing"],
  editing: ["Retention Editing Pass"],
  packaging: ["Title & Thumbnail Packaging", "Thumbnail Design", "Title Writing"],
  scheduled: ["Publish & Data Logging Checklist"],
};

export function sopForStage(stage: ProductionStage, sops: Sop[]): Sop | undefined {
  const wanted = STAGE_SOP_TITLES[stage] ?? [];
  for (const title of wanted) {
    const hit = sops.find((s) => s.title.toLowerCase() === title.toLowerCase());
    if (hit) return hit;
  }
  return undefined;
}

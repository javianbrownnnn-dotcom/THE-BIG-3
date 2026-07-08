import type { Channel, CompetitorVideo, Sop, Video } from "@/types";
import { humanize, percent } from "@/lib/format";
import { CHANNEL_IDENTITY } from "@/features/studio/personas";

function mean(nums: number[]): number | undefined {
  if (!nums.length) return undefined;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function groupPerf(
  videos: Video[],
  key: (v: Video) => string | undefined,
  metric: (v: Video) => number | undefined,
): Array<{ label: string; avg: number; n: number }> {
  const groups = new Map<string, number[]>();
  for (const v of videos) {
    const k = key(v);
    const m = metric(v);
    if (!k || m == null) continue;
    (groups.get(k) ?? groups.set(k, []).get(k)!).push(m);
  }
  return [...groups.entries()]
    .map(([label, vals]) => ({ label: humanize(label), avg: mean(vals)!, n: vals.length }))
    .sort((a, b) => b.avg - a.avg);
}

/**
 * A compact, self-contained markdown brief of the company's actual performance
 * — written to be pasted into (or fetched by) an outside AI like ChatGPT so it
 * can brainstorm video ideas with real context instead of guesses.
 */
export function buildIdeaBrief(input: {
  orgName: string;
  channels: Channel[];
  videos: Video[];
  competitorVideos: CompetitorVideo[];
  sops: Sop[];
}): string {
  const { orgName, channels, videos, competitorVideos, sops } = input;
  const lines: string[] = [];

  lines.push(`# ${orgName} — Modern Ambition Documentary idea brief`);
  lines.push("");
  lines.push(
    "You are the idea strategist for this channel. The full channel identity is below — " +
      "follow it exactly. After the identity comes the channel's REAL performance data; " +
      "ground every suggestion in it and avoid topics already covered.",
    "",
    "## Channel identity (follow this exactly)",
    CHANNEL_IDENTITY,
    "",
    "HARD RULES for every idea:",
    "1. It must be about a REAL, NAMED subject — an actual founder, company, brand, " +
      "or documented event. \"How Tai Lopez Invented the Modern Online Guru\" is valid; " +
      "\"a guru who sold courses\" is NOT. No template angles, no hypotheticals.",
    "2. Only real, widely documented stories — never invent people, events, or numbers. " +
      "If you are not confident the story is real, do not pitch it.",
    "3. Each idea needs the winning formula: specific subject + emotional tension + " +
      "hidden money machine.",
  );

  lines.push("", "## Channels");
  for (const c of channels) {
    const cv = videos.filter((v) => v.channelId === c.id);
    const ctr = mean(cv.map((v) => v.metrics?.ctr).filter((x): x is number => x != null));
    const viewed = mean(
      cv.map((v) => v.metrics?.avgPercentViewed).filter((x): x is number => x != null),
    );
    lines.push(
      `- **${c.name}**${c.niche ? ` — niche: ${c.niche}` : ""}. ` +
        `${cv.length} tracked videos, avg CTR ${percent(ctr)}, avg viewed ${percent(viewed)}.`,
    );
  }

  const hooks = groupPerf(videos, (v) => v.hookType, (v) => v.metrics?.ctr);
  if (hooks.length) {
    lines.push("", "## What works — hooks (avg CTR)");
    for (const h of hooks) lines.push(`- ${h.label}: ${percent(h.avg)} (n=${h.n})`);
  }

  const structures = groupPerf(
    videos,
    (v) => v.storyStructure,
    (v) => v.metrics?.avgPercentViewed,
  );
  if (structures.length) {
    lines.push("", "## What works — story structures (avg % viewed)");
    for (const s of structures) lines.push(`- ${s.label}: ${percent(s.avg)} (n=${s.n})`);
  }

  const top = [...videos]
    .filter((v) => v.metrics?.views != null)
    .sort((a, b) => (b.metrics?.views ?? 0) - (a.metrics?.views ?? 0))
    .slice(0, 5);
  if (top.length) {
    lines.push("", "## Our top videos");
    for (const v of top) {
      const c = channels.find((x) => x.id === v.channelId);
      lines.push(
        `- "${v.title}" (${c?.name ?? "—"}) — ${v.metrics?.views?.toLocaleString()} views` +
          `${v.metrics?.ctr != null ? `, CTR ${percent(v.metrics.ctr)}` : ""}` +
          `${v.hookType ? `, hook: ${humanize(v.hookType)}` : ""}`,
      );
    }
  }

  const outliers = competitorVideos.filter((v) => v.isOutlier).slice(0, 8);
  if (outliers.length) {
    lines.push("", "## Competitor outliers (proven demand in our niches)");
    for (const v of outliers) {
      lines.push(
        `- "${v.title}" (${v.competitorChannelName ?? "competitor"})` +
          `${v.viewsPerDay ? ` — ${Math.round(v.viewsPerDay).toLocaleString()} views/day` : ""}` +
          `${v.hook ? `, hook: ${humanize(v.hook)}` : ""}` +
          `${v.whyItWorked ? `. Why it worked: ${v.whyItWorked}` : ""}`,
      );
    }
  }

  const covered = videos.map((v) => v.topic || v.title).filter(Boolean);
  if (covered.length) {
    lines.push("", "## Topics already covered (do not repeat)");
    lines.push(covered.map((t) => `${t}`).join(" · "));
  }

  const activeSops = sops.filter((s) => s.status === "active");
  if (activeSops.length) {
    lines.push("", "## Our production rules (SOPs ideas must fit)");
    for (const s of activeSops.slice(0, 8)) {
      lines.push(`- ${s.title}${s.currentVersion?.purpose ? `: ${s.currentVersion.purpose}` : ""}`);
    }
  }

  lines.push(
    "",
    "## What to give back",
    "8-12 documentary angles (not broad topics), rotating buckets so consecutive ideas " +
      "never share a bucket or subject archetype. For EACH idea give:",
    "1. Working title (must NAME the subject; use the title styles from the identity)",
    "2. Specific subject/person/company",
    "3. Content bucket (Guru Economy / Status Economy / Creator CEOs / Ambition Anxiety / Dream Sellers)",
    "4. Core tension",
    "5. Hidden machine or business model",
    "6. The documented story beat the video hangs on (a real decision, scandal, collapse, or turning point)",
    "7. Suggested hook structure (one of the five from the identity)",
    "8. Thumbnail concept (visualizable immediately, premium documentary feel)",
    "9. Why it should work for this channel given the data above",
    "10. Priority: high (would bet a production budget), medium, or low",
    "Reject and replace your own idea if it could apply to more than one company or person, " +
      "if it reads like a school report, or if a strong-idea checklist score (from the " +
      "identity) lands under 4.",
  );

  return lines.join("\n");
}

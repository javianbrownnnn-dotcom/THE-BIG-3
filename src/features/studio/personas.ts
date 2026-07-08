// Modern Ambition channel identity + built-in viewer personas.
// These ship in code (the channel's DNA); AI-proposed personas unlock at 30
// and 100 completed studio projects and live in the content_personas table —
// five personas maximum, refined as feedback accumulates.

import type { StudioPersona, StudioVideoLength } from "@/types";

export const CHANNEL_IDENTITY = `Modern Ambition is a faceless YouTube documentary channel about ambition, founders, empires, wealth, status, obsession, business, reinvention, downfall, and the psychology of success.
Tone: cinematic, intelligent, mature, emotionally sharp, professional, premium, strategically dramatic, clear and easy to follow.
NOT: generic motivational, hustle-bro, corny, overly academic, fake deep, clickbait, robotic, boring essay.
Core creative question every video must answer: "What did ambition create, and what did it cost?"`;

export const BUILTIN_PERSONAS: StudioPersona[] = [
  {
    id: "young_builder",
    name: "The Young Builder",
    ageRange: "18–28",
    description:
      "Wants to become successful but is tired of shallow hustle content. Watches videos about founders, money, status, business, discipline, and personal reinvention. Wants stories that make them feel smarter, more focused, and more ambitious.",
    respondsTo: [
      "Ambition",
      "Wealth",
      "Status",
      "Obsession",
      "Betrayal",
      "Personal sacrifice",
      "What it really takes to win",
    ],
    source: "builtin",
    active: true,
  },
  {
    id: "strategic_dreamer",
    name: "The Strategic Dreamer",
    description:
      "Fascinated by business, psychology, power, and culture. May not be building a company yet, but loves understanding how empires are built and why powerful people make the choices they make.",
    respondsTo: [
      "Hidden psychology",
      "Rise-and-fall stories",
      "Power games",
      "Identity",
      "Cultural influence",
      "Business strategy",
      "Human flaws behind success",
    ],
    source: "builtin",
    active: true,
  },
  {
    id: "self_improvement_skeptic",
    name: "The Self-Improvement Skeptic",
    description:
      "Used to watch motivational content but now finds most of it corny. Still cares about growth, money, and becoming better, but wants sharper, more honest storytelling — ambition explained through real people, real consequences, and real tradeoffs.",
    respondsTo: [
      "The cost of success",
      "The dark side of ambition",
      "Winning but losing yourself",
      "Fame",
      "Pressure",
      "Loneliness",
      "Moral conflict",
    ],
    source: "builtin",
    active: true,
  },
];

/** New personas unlock at these completed-project counts; five max, ever. */
export const PERSONA_UNLOCKS = [30, 100];
export const MAX_PERSONAS = 5;

export const VIDEO_LENGTHS: StudioVideoLength[] = [15, 18, 20, 25];

/** Flexible word ranges per length — guidance, not law. */
export const WORD_RANGES: Record<StudioVideoLength, [number, number]> = {
  15: [2100, 2400],
  18: [2500, 2900],
  20: [2900, 3300],
  25: [3500, 4100],
};

/** The emotional arc every outline preserves; longer cuts add middle beats. */
export const OUTLINE_BEATS_15 = [
  { timestamp: "0:00–0:45", title: "Cold Open" },
  { timestamp: "0:45–1:15", title: "Promise" },
  { timestamp: "1:15–3:00", title: "Origin" },
  { timestamp: "3:00–5:30", title: "Rise" },
  { timestamp: "5:30–8:00", title: "Pressure" },
  { timestamp: "8:00–10:00", title: "Turning Point" },
  { timestamp: "10:00–12:30", title: "Cost" },
  { timestamp: "12:30–14:15", title: "Meaning" },
  { timestamp: "14:15–15:00", title: "Final Line" },
];

export const EXTENDED_BEAT_NAMES = [
  "Cold Open",
  "Promise",
  "Origin",
  "Rise",
  "Complication",
  "Pressure",
  "Turning Point",
  "Consequences",
  "Deeper Psychology",
  "Cultural / Business Meaning",
  "Final Thought",
];

export const BANNED_PHRASES = [
  "Little did he know",
  "Everything changed forever",
  "This was only the beginning",
  "Against all odds",
  "The rest is history",
  "In today's video",
  "Smash that like button",
  "Subscribe for more",
];

export const STEP_LABELS: Record<string, string> = {
  relevance: "Relevance",
  research: "Research",
  titles: "Title Lab",
  thumbnail: "Thumbnail",
  outline: "Outline",
  script: "Script",
  critique: "Critique",
  feedback: "Feedback",
  done: "Done",
};

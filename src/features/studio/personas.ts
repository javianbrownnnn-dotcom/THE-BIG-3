// Modern Ambition channel identity + built-in viewer personas.
// These ship in code (the channel's DNA); AI-proposed personas unlock at 30
// and 100 completed studio projects and live in the content_personas table —
// five personas maximum, refined as feedback accumulates.

import type { StudioPersona, StudioVideoLength } from "@/types";

export const CHANNEL_IDENTITY = `Modern Ambition Documentary is a faceless YouTube documentary channel studying the people, companies, platforms, and online machines selling success to a generation afraid of falling behind.
It lives at the intersection of ambition, internet culture, psychology, money, status, creators, online gurus, self-improvement, masculinity, personal branding, attention, and modern success culture. The feel: business documentaries with emotional tension.

CORE THESIS — every video answers: who is selling ambition, who is buying it, and what is the hidden machine underneath? (Its older twin still applies: what did ambition create, and what did it cost?)

WINNING FORMULA: specific person/company/product + emotional tension + hidden money machine. Concrete beats conceptual: "How Tai Lopez Invented the Modern Online Guru" — never "the attention economy", "the future of work", or "why people feel behind".

CONTENT BUCKETS (all eight carry weight; rotate so consecutive ideas never share a bucket or subject archetype):
1. The Guru Economy — the people selling wealth, discipline, masculinity, sales, agencies, mindset, escape-the-9-to-5 (Hormozi, Gadzhi, Tai Lopez, Cardone, Gary Vee, Dan Lok, Bet-David, course/agency/trading/real-estate sellers). The angle is never "this person got famous" — explain the MACHINE they represent.
2. The Status Economy — how status is manufactured, rented, displayed, and sold (rented Lamborghinis, fake jets, luxury-apartment content, millionaire theater, LinkedIn flex culture). Tension: how much of modern success is real, and how much is performance?
3. Creator CEOs — how a personality becomes a corporation (MrBeast, Logan Paul, KSI, Kai Cenat, Emma Chamberlain, Nelk, creator-led brands).
4. Ambition Anxiety — businesses profiting from making people feel late, broke, undisciplined, weak, or behind (productivity apps, monk mode, dopamine detox, looksmaxxing, discipline culture, masculine self-improvement, money Twitter). Tension: is this helping people grow, or keeping them insecure enough to buy?
5. The Dream Sellers — the promise of escape (college, the 9-to-5, being broke, being average, obscurity): investigate the dream, the seller, the buyer, and the system underneath.
6. The Platform Machines — the picks-and-shovels layer profiting from creator ambition (Skool, Whop, prop-trading firms, dropshipping SaaS, YouTube-automation agencies, course platforms). The machine behind the machines: who gets paid whether or not the dream comes true?
7. The Aftermath — what happens after the dream: course buyers a year later, failed agency owners, burned-out creators, FTC cases and settlements. The receipts bucket — documented consequences with paper trails.
8. The Old Playbook — today's machine is a century old: Napoleon Hill, Dale Carnegie, Amway and the MLM lineage, late-night infomercials, Trump University. Connect the modern guru to the historical script they are running.

A STRONG IDEA has at least 4 of: a recognizable person/company/platform/product; a clear emotional conflict; a hidden business model; a group of people being sold to; a rise, fall, controversy, transformation, or contradiction; a title that creates curiosity in under one second; a thumbnail that can be visualized immediately; a reason it matters to young ambitious people; a proven connection to money, status, identity, or power.
NEVER: broad essay topics, vague motivation topics, random founder biographies, plain "how X got rich" stories, school-report ideas, topics with no villain/contradiction/machine, anything disconnected from modern ambition culture.

RECENCY: prefer subjects at a culturally alive moment — an ongoing arc, a fresh controversy, a story the audience half-knows and wants decoded. Older stories need an explicit reason they matter today.

TITLE STYLES: "How [Person] Turned [Emotion] Into [Business Empire]" · "The [Industry/Product] Selling [Dream] to [Audience]" · "The Fake [Status Symbol] Economy" · "How [Person] Became the Face of [Movement]" · "The Rise and Fall of [X]" · "How [X] Made Millions From [Insecurity/Desire]" · "The Business Behind [Common Online Behavior]" · "Why [Group] Can't Stop Buying [Dream]" · "The Man Who Made [Behavior] Go Viral" · "The Billion-Dollar Business of [Emotional Mechanism]".

HOOK STRUCTURES (pick the one that fits the idea; the first 30 seconds open with tension, never background):
1. Contradiction — show what looks inspiring, then reveal the darker mechanism beneath it.
2. Machine — start on the person, zoom out to the blueprint they represent.
3. Emotional Economy — start on the feeling being monetized ("if you constantly feel behind, that feeling is not an accident").
4. Rise/Fall — start at the peak, then introduce the crack.
5. Status Illusion — start with the image of success, then question what is real.

EDGE & SAFETY — investigate the machine, not the man: ask hard questions about business models, incentives, and numbers; every claim about a living person must be documented and framed as a question or as reporting, never as an accusation; mark anything unverified for human fact-checking; never invent receipts, quotes, or numbers.

TONE: cinematic, intelligent, mature, emotionally sharp, professional, premium, strategically dramatic, clear and easy to follow. NOT: generic motivational, hustle-bro, corny, overly academic, fake deep, clickbait, robotic, boring essay.`;

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
  {
    id: "culture_watcher",
    name: "The Culture Watcher",
    description:
      "Not trying to get rich — finds internet money culture fascinating as anthropology. Watches to understand why gurus, flex culture, and online empires exist and why people fall for them.",
    respondsTo: [
      "Status theater",
      "Virality mechanics",
      "Subculture deep-dives",
      "Internet history",
      "Why things blow up",
      "The psychology of audiences",
    ],
    source: "builtin",
    active: true,
  },
  {
    id: "quiet_builder",
    name: "The Quiet Builder",
    ageRange: "22–35",
    description:
      "Actually building something — a job plus a side project — and allergic to hype. Watches to extract real mechanics and dodge traps: what they actually did versus what they sell.",
    respondsTo: [
      "Real numbers",
      "Business-model breakdowns",
      "What they did vs what they sell",
      "Avoiding traps",
      "Unit economics",
      "Execution details",
    ],
    source: "builtin",
    active: true,
  },
];

/** All five persona slots are filled by built-ins; the 30/100-video reviews
 *  now refine existing personas instead of adding new ones. */
export const PERSONA_UNLOCKS = [30, 100];
export const MAX_PERSONAS = 5;

// Picker options — the channel standard is 18–20 min. 15/25 remain valid
// StudioVideoLength values for older projects, just not offered for new ones.
export const VIDEO_LENGTHS: StudioVideoLength[] = [18, 20];
export const DEFAULT_VIDEO_LENGTH: StudioVideoLength = 18;

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

// Demo provider: seeded, deterministic in-memory data for the three-person
// company. Lets the whole product run — and be evaluated — with zero backend
// setup. Patterns are intentionally baked into the data (hook types and story
// structures have real effect sizes) so analysis features have something
// true to find.

import type {
  BuilderBrollItem,
  ActivityItem,
  AiInsight,
  AiRecommendation,
  AppNotification,
  Channel,
  ChannelInput,
  ChatMessage,
  CoachReply,
  CompetitorChannel,
  CompetitorChannelInput,
  Comment,
  CommentEntityType,
  CommentInput,
  DiscordConfig,
  CompetitorScanResult,
  CompetitorTeardown,
  CompetitorVideo,
  CompetitorVideoInput,
  DraftResult,
  Invite,
  InviteInput,
  GeneratedIdea,
  Idea,
  IdeaInput,
  Member,
  Organization,
  Production,
  ProductionInput,
  ProductionPatch,
  Profile,
  RecommendationStatus,
  Report,
  Sop,
  SopInput,
  SopVersion,
  RetentionPoint,
  SopVersionInput,
  SopWithHistory,
  Task,
  TaskInput,
  TrafficSource,
  Video,
  VideoAnalytics,
  VideoInput,
  VideoMetrics,
  VideoMetricsInput,
  VideoWithHistory,
} from "@/types";
import type {
  ContentProject,
  ContentProjectInput,
  FeedbackRule,
  FeedbackRuleCategory,
  StudioFeedback,
  StudioPersona,
  StudioStep,
  ThumbnailVariant,
} from "@/types";
import type { DataProvider } from "./provider";
import { draftFromTemplates, shortsFromScript } from "@/features/production/draft";
import { BUILTIN_PERSONAS, MAX_PERSONAS, PERSONA_UNLOCKS } from "@/features/studio/personas";
import { extractScriptClaims, mergeFactChecks } from "@/features/studio/factChecks";
import {
  templateCritique,
  templateFeedbackRule,
  templateOutline,
  templateRelevance,
  templateResearch,
  templateScript,
  templateThumbnails,
  templateTitles,
} from "@/features/studio/templates";
import { aggregateChannelStats, simulateChannelScan } from "@/features/competitors/scan";
import {
  ciCompetitorChannels,
  ciCompetitorVideos,
  ciIdeas,
  ciInsights,
  founderRealityChannel,
  magnatesMediaIntel,
  magnatesTeardowns,
} from "./ciBusinessSeed";
import {
  cxCompetitorChannels,
  cxCompetitorVideos,
  cxIdeas,
  cxInsights,
  esotericaIntel,
  mythMeaningCiGoals,
  religionTeardowns,
  rfbIntel,
} from "./ciChristianitySeed";

// ---------------------------------------------------------------------------
// Seeded PRNG — data is identical on every load.
// ---------------------------------------------------------------------------
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260703);
const between = (lo: number, hi: number) => lo + rand() * (hi - lo);
const pick = <T,>(xs: T[]): T => xs[Math.floor(rand() * xs.length)];
let idCounter = 0;
const uid = (prefix: string) => `${prefix}_${(++idCounter).toString(36).padStart(4, "0")}`;

const NOW = Date.now();
const DAY = 86_400_000;
const daysAgo = (n: number) => new Date(NOW - n * DAY).toISOString();

// ---------------------------------------------------------------------------
// Org & people
// ---------------------------------------------------------------------------
const org: Organization = { id: "org_demo", name: "The Big 3", slug: "the-big-3" };

const members: Member[] = [
  { id: "user_javian", displayName: "Javian", role: "owner" },
  { id: "user_robert", displayName: "Robert", role: "admin" },
  { id: "user_amara", displayName: "Amara", role: "editor" },
];
const currentUser: Profile = members[0];
const invites: Invite[] = [];

// "story_cold_open" → "Story cold open"
function hz(token: string): string {
  const s = token.replace(/_/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Short, unambiguous invite code (no 0/O/1/I).
function randomCode(len = 8): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

// ---------------------------------------------------------------------------
// Channels
// ---------------------------------------------------------------------------
const channels: Channel[] = [
  {
    id: "ch_biz",
    organizationId: org.id,
    name: "Business Storytelling",
    ownerId: "user_javian",
    ownerName: "Javian",
    brand: "Founders & Fortunes",
    niche: "Business documentaries & founder stories",
    uploadCadence: "1 long-form / week",
    description: "Deeply researched stories about how companies rise and fall.",
    goals: [
      { id: uid("goal"), channelId: "ch_biz", metric: "ctr", targetValue: 6, period: "monthly" },
      { id: uid("goal"), channelId: "ch_biz", metric: "avg_percent_viewed", targetValue: 45, period: "monthly" },
    ],
    createdAt: daysAgo(320),
  },
  {
    id: "ch_rel",
    organizationId: org.id,
    name: "Ancient Religions & Storytelling",
    ownerId: "user_robert",
    ownerName: "Robert",
    brand: "Myth & Meaning",
    niche: "Ancient religion, mythology, comparative storytelling",
    uploadCadence: "2 long-form / month",
    description: "Long-form explorations of ancient belief systems and the stories they left behind.",
    goals: [
      { id: uid("goal"), channelId: "ch_rel", metric: "ctr", targetValue: 5.5, period: "monthly" },
      { id: uid("goal"), channelId: "ch_rel", metric: "watch_time_hours", targetValue: 30000, period: "monthly" },
      // Christianity CI cycle (Jul 2026): 12-month projection as goals.
      ...mythMeaningCiGoals,
    ],
    createdAt: daysAgo(280),
  },
  {
    id: "ch_sales",
    organizationId: org.id,
    name: "Sales Psychology",
    ownerId: "user_amara",
    ownerName: "Amara",
    brand: "The Persuasion Lab",
    niche: "Sales psychology, negotiation, influence",
    uploadCadence: "1 long-form + 2 shorts / week",
    description: "Applied psychology for sellers: tactics, teardowns, and experiments.",
    goals: [
      { id: uid("goal"), channelId: "ch_sales", metric: "ctr", targetValue: 7, period: "monthly" },
      { id: uid("goal"), channelId: "ch_sales", metric: "subscribers_gained", targetValue: 4000, period: "monthly" },
    ],
    createdAt: daysAgo(240),
  },
  // The CI report's flagship recommendation (docs/COMPETITIVE_INTELLIGENCE_BUSINESS.md §9).
  founderRealityChannel,
];

// ---------------------------------------------------------------------------
// Videos — patterns are real: hook type and story structure carry effect sizes.
// ---------------------------------------------------------------------------
const HOOKS = ["story_cold_open", "question", "bold_claim", "statistic", "contrarian"] as const;
const STRUCTURES = ["rise_and_fall", "case_study", "chronological", "problem_solution", "listicle"] as const;

// Effect sizes the learning loop / coach should be able to detect.
const HOOK_CTR_BOOST: Record<string, number> = {
  story_cold_open: 1.35, bold_claim: 1.15, question: 1.0, contrarian: 0.95, statistic: 0.78,
};
const STRUCTURE_RETENTION_BOOST: Record<string, number> = {
  rise_and_fall: 1.25, case_study: 1.1, problem_solution: 1.0, chronological: 0.9, listicle: 0.8,
};

const TOPICS: Record<string, string[]> = {
  ch_biz: [
    "The collapse of WeWork", "How Costco breaks every retail rule", "Enron: anatomy of a fraud",
    "Why Kodak invented — then killed — digital", "The LEGO turnaround", "Red Bull's media empire",
    "How Zara ships in 2 weeks", "The fall of Blockbuster", "Nintendo's near-death decade",
    "How Rolex manufactures scarcity", "The Boeing culture collapse", "IKEA's cult of cost",
    "Patagonia's anti-growth playbook", "The rise of Trader Joe's",
  ],
  ch_rel: [
    "The forgotten gods of Sumer", "Why Rome feared the cult of Dionysus", "Zoroastrianism: the first apocalypse",
    "The real Epic of Gilgamesh", "Egypt's heretic pharaoh", "The Norse myth Christianity absorbed",
    "Göbekli Tepe and the birth of ritual", "The Eleusinian Mysteries", "How Buddhism crossed the Silk Road",
    "The goddess Rome erased", "Death rites of the Aztecs", "The Gnostic gospels",
  ],
  ch_sales: [
    "The 3-second pricing trick", "Why top closers never pitch", "Mirroring: FBI negotiation tactics",
    "The psychology of the discount", "Cold calls that actually work", "Loss aversion in the wild",
    "How luxury brands sell status", "The anchoring experiment", "Why 'no' opens doors",
    "Scarcity done ethically", "The follow-up formula", "Reading buyer hesitation",
  ],
};

// Channel baselines: [ctr, pctViewed, viewBase]
const CHANNEL_BASE: Record<string, [number, number, number]> = {
  ch_biz: [5.2, 42, 90_000],
  ch_rel: [4.8, 48, 55_000],
  ch_sales: [6.1, 38, 32_000],
};

interface VideoRow extends Video {
  snapshots: VideoMetrics[];
}

function makeSnapshots(
  ageDays: number, views: number, ctr: number, pct: number,
  durationSecs: number, subs: number,
): VideoMetrics[] {
  // Views accumulate on a decaying curve; CTR decays slightly as the video
  // exits browse; retention is stable. Snapshot cadence: d1, d7, d30, now.
  const points = [1, 7, 30, ageDays].filter((d) => d <= ageDays);
  const uniq = [...new Set(points)].sort((a, b) => a - b);
  return uniq.map((d) => {
    const frac = 1 - Math.exp(-d / 14);
    const v = Math.round(views * frac);
    const avd = (pct / 100) * durationSecs;
    return {
      capturedAt: daysAgo(ageDays - d),
      views: v,
      impressions: Math.round(v / (ctr / 100)),
      ctr: +(ctr * (1 + 0.06 * Math.exp(-d / 10))).toFixed(2),
      avgViewDurationSecs: Math.round(avd),
      avgPercentViewed: +pct.toFixed(1),
      watchTimeHours: Math.round((v * avd) / 3600),
      subscribersGained: Math.round(subs * frac),
    };
  });
}

const videos: VideoRow[] = [];
for (const ch of channels) {
  // Channels without baselines (Founder Reality is pre-launch) have no videos.
  if (!CHANNEL_BASE[ch.id]) continue;
  const [baseCtr, basePct, baseViews] = CHANNEL_BASE[ch.id];
  const topics = TOPICS[ch.id];
  const count = topics.length;
  for (let i = 0; i < count; i++) {
    const ageDays = Math.round(6 + (i * 175) / count + between(-3, 3));
    const hook = pick([...HOOKS]);
    const structure = pick([...STRUCTURES]);
    const ctr = +(baseCtr * HOOK_CTR_BOOST[hook] * between(0.85, 1.15)).toFixed(2);
    const pct = +(basePct * STRUCTURE_RETENTION_BOOST[structure] * between(0.9, 1.1)).toFixed(1);
    // Views correlate with CTR (packaging) and a topic lottery.
    const views = Math.round(baseViews * (ctr / baseCtr) * between(0.5, 2.2));
    const durationSecs = Math.round(between(600, 1500));
    const subs = Math.round(views * between(0.004, 0.009));
    const id = uid("vid");
    const snapshots = makeSnapshots(ageDays, views, ctr, pct, durationSecs, subs);
    videos.push({
      id,
      channelId: ch.id,
      title: topics[i],
      url: `https://youtube.com/watch?v=demo_${id}`,
      publishedAt: daysAgo(ageDays),
      topic: topics[i].split(":")[0],
      hookType: hook,
      storyStructure: structure,
      durationSeconds: durationSecs,
      format: "long_form",
      manualNotes: i % 4 === 0 ? "Thumbnail A/B tested — variant B won by 0.8pp." : undefined,
      aiObservations:
        hook === "story_cold_open"
          ? "Cold-open hook outperforming the channel CTR baseline; consistent with the org-wide pattern."
          : hook === "statistic"
            ? "Statistic-led hook underperforming baseline CTR; consider reworking per Hook Writing SOP v3."
            : undefined,
      metrics: snapshots[snapshots.length - 1],
      createdAt: daysAgo(ageDays + 5),
      snapshots,
    });
  }
}
videos.sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));

// ---------------------------------------------------------------------------
// Competitors
// ---------------------------------------------------------------------------
const competitorChannels: CompetitorChannel[] = [
  // Extended in place with the CI report's channel intelligence (same channel
  // the report calls "MagnatesMedia") — one row, not a duplicate.
  { id: "cc_mag", organizationId: org.id, name: "Magnates Media", niche: "Business documentaries", ...magnatesMediaIntel },
  { id: "cc_hoc", organizationId: org.id, name: "How History Works", niche: "Business / history hybrid" },
  // Both religion rows extended in place with the Christianity CI cycle's
  // channel intelligence — one row each, not duplicates.
  { id: "cc_rfb", organizationId: org.id, name: "ReligionForBreakfast", niche: "Academic religion", ...rfbIntel },
  { id: "cc_eso", organizationId: org.id, name: "Esoterica", niche: "Esoteric religious history", ...esotericaIntel },
  { id: "cc_chris", organizationId: org.id, name: "Chris Voss (MasterClass clips)", niche: "Negotiation" },
  // 34 business-niche rows from the July 2026 CI research cycle (35 total
  // with Magnates Media above).
  ...ciCompetitorChannels,
  // 33 Christianity-niche rows from the July 2026 CI research cycle (35
  // total with ReligionForBreakfast and Esoterica above).
  ...cxCompetitorChannels,
];

const competitorVideos: CompetitorVideo[] = [];
{
  const seedRows: Array<[string, string, string, string, string, number, boolean, string?]> = [
    // [ccId, title, topic, hook, structure, viewsPerDay, outlier, whyItWorked]
    ["cc_mag", "The Man Who Owns Everything", "Berkshire Hathaway", "story_cold_open", "rise_and_fall", 95_000, true,
      "Mystery-box title + cold open on a single scene. Zero jargon in the first 30s."],
    ["cc_mag", "How Mr Beast Built a Candy Empire", "MrBeast Feastables", "bold_claim", "case_study", 41_000, false, undefined],
    ["cc_mag", "The Company That Owns Your Face", "Luxottica", "question", "rise_and_fall", 78_000, true,
      "Consumer-anger angle. Thumbnail: single object + accusatory copy."],
    ["cc_hoc", "Why Planes Don't Fly Faster", "Aviation economics", "question", "problem_solution", 36_000, false, undefined],
    ["cc_hoc", "The Scam That Broke Japan", "1980s bubble", "story_cold_open", "chronological", 88_000, true,
      "National-scale stakes + 'scam' framing. Retention curve nearly flat to 8 min."],
    ["cc_rfb", "What Ancient Christians Actually Believed", "Early Christianity", "contrarian", "case_study", 22_000, false, undefined],
    ["cc_rfb", "The Bible's Forgotten Goddess", "Asherah", "story_cold_open", "chronological", 61_000, true,
      "Forbidden-knowledge framing on an academic topic. Huge search tail."],
    ["cc_eso", "The Book Chained in the Vatican", "Grimoires", "story_cold_open", "chronological", 47_000, true,
      "Object-mystery cold open. Title implies suppression without claiming conspiracy."],
    ["cc_eso", "Hermeticism Explained", "Hermeticism", "statistic", "listicle", 9_000, false, undefined],
    ["cc_chris", "Never Split the Difference in 12 Minutes", "Negotiation", "bold_claim", "listicle", 33_000, false, undefined],
    ["cc_chris", "The 7-38-55 Rule Is Wrong", "Communication myths", "contrarian", "problem_solution", 52_000, true,
      "Attacking a belief the audience holds. Comments = free distribution."],
  ];
  for (const [ccId, title, topic, hook, structure, vpd, outlier, why] of seedRows) {
    const age = Math.round(between(5, 90));
    competitorVideos.push({
      id: uid("cv"),
      competitorChannelId: ccId,
      competitorChannelName: competitorChannels.find((c) => c.id === ccId)?.name,
      title,
      url: `https://youtube.com/watch?v=comp_${title.slice(0, 6).replace(/\W/g, "")}`,
      publishedAt: daysAgo(age),
      topic,
      hook,
      storyStructure: structure,
      whyItWorked: why,
      aiObservations: outlier
        ? "Statistical outlier vs. this channel's trailing views/day baseline (z ≥ 2)."
        : undefined,
      isOutlier: outlier,
      outlierScore: outlier ? +between(2.1, 4.6).toFixed(1) : undefined,
      views: Math.round(vpd * age * between(0.6, 1.1)),
      viewsPerDay: vpd,
      velocity: +between(-0.2, 0.6).toFixed(2),
    });
  }
}

// Business-niche CI teardown cycle (July 2026): outlier videos for the new
// competitor set, plus teardowns for the two existing Magnates Media outliers
// — attached in place so the originals keep their ids and stats.
competitorVideos.push(...ciCompetitorVideos, ...cxCompetitorVideos);
for (const cv of competitorVideos) {
  const td = magnatesTeardowns[cv.title] ?? religionTeardowns[cv.title];
  if (td && cv.isOutlier && !cv.teardown) {
    cv.teardown = td;
    cv.teardownAt = daysAgo(0);
  }
}

// ---------------------------------------------------------------------------
// SOPs — versioned, append-only, some AI-authored versions.
// ---------------------------------------------------------------------------
interface SopRow extends Sop {
  versions: SopVersion[];
}

function sopWithVersions(
  base: Omit<Sop, "currentVersion" | "linkedVideoIds" | "linkedCompetitorVideoIds" | "createdAt">,
  versionSpecs: Array<Partial<SopVersion> & { purpose: string; steps: string[] }>,
  linkedVideoIds: string[] = [],
  linkedCompetitorVideoIds: string[] = [],
): SopRow {
  const versions = versionSpecs.map((v, i) => ({
    id: uid("sopv"),
    sopId: base.id,
    versionNumber: i + 1,
    purpose: v.purpose,
    whenToUse: v.whenToUse,
    steps: v.steps,
    examples: v.examples,
    changeSummary: v.changeSummary,
    source: v.source ?? "human",
    createdAt: v.createdAt ?? daysAgo(150 - i * 45),
  })) as SopVersion[];
  versions.reverse(); // newest first
  return {
    ...base,
    currentVersion: versions[0],
    linkedVideoIds,
    linkedCompetitorVideoIds,
    createdAt: daysAgo(160),
    versions,
  };
}

const coldOpenVideos = videos.filter((v) => v.hookType === "story_cold_open").map((v) => v.id);
const outlierCompIds = competitorVideos.filter((c) => c.isOutlier).map((c) => c.id);
// CI teardown evidence links: each updated SOP version cites the torn-down
// competitor videos that motivated its new rules.
const ciTeardowns = competitorVideos.filter((c) => c.id.startsWith("cv_ci_"));
const ciIdsWhere = (pred: (c: CompetitorVideo) => boolean, n: number) =>
  ciTeardowns.filter(pred).slice(0, n).map((c) => c.id);
const cxTeardowns = competitorVideos.filter((c) => c.id.startsWith("cv_cx_"));
const cxIdsWhere = (pred: (c: CompetitorVideo) => boolean, n: number) =>
  cxTeardowns.filter(pred).slice(0, n).map((c) => c.id);

const sops: SopRow[] = [
  sopWithVersions(
    {
      id: "sop_hooks", organizationId: org.id, title: "Hook Writing",
      category: "hooks", status: "active", reviewFrequencyDays: 30,
      nextReviewAt: daysAgo(-12),
    },
    [
      {
        purpose: "Write the first 30 seconds so a browsing viewer commits to the video.",
        whenToUse: "Every video, before scripting the body.",
        steps: [
          "Draft 5 hook options before writing anything else.",
          "Open with the most concrete, visual moment in the story.",
          "State the stakes within the first two sentences.",
          "Cut every word that isn't doing work; target under 60 words.",
        ],
        examples: "\"In 1997, a man walked into a bank with a business plan written on a napkin...\"",
      },
      {
        purpose: "Write the first 30 seconds so a browsing viewer commits to the video.",
        whenToUse: "Every video, before scripting the body.",
        steps: [
          "Draft 5 hook options before writing anything else.",
          "Open with the most concrete, visual moment in the story.",
          "State the stakes within the first two sentences.",
          "Never open with a statistic — numbers before context underperform.",
          "Cut every word that isn't doing work; target under 60 words.",
        ],
        changeSummary: "Added the 'no statistic openers' rule after Q1 data showed statistic hooks at 0.78x baseline CTR.",
        examples: "\"In 1997, a man walked into a bank with a business plan written on a napkin...\"",
      },
      {
        purpose: "Write the first 30 seconds so a browsing viewer commits to the video.",
        whenToUse: "Every video, before scripting the body.",
        steps: [
          "Draft 5 hook options before writing anything else.",
          "Default to a story cold open: drop the viewer inside a single scene, mid-action.",
          "State the stakes within the first two sentences.",
          "Never open with a statistic — numbers before context underperform.",
          "Read the hook aloud; if it takes over 20 seconds, cut it in half.",
        ],
        changeSummary: "Made story cold opens the default. Cold-open videos run ~1.35x channel baseline CTR across all three channels (n=14).",
        source: "ai",
        examples: "\"The vault door was already open when the auditors arrived...\"",
      },
      {
        purpose: "Write the first 30 seconds so a browsing viewer commits to the video.",
        whenToUse: "Every video, before scripting the body.",
        steps: [
          "Draft 5 hook options before writing anything else.",
          "Default to a story cold open: drop the viewer inside a single scene, mid-action.",
          "Business/founder videos: use proof-then-promise — concrete proof in the first 5 seconds, payoff by second 15, commitment by 30. Holds 78% at 30s in the CI sample vs 67% for question hooks.",
          "Deliver the title's promise by second 15 — the 10–20s retention cliff is unrecoverable.",
          "Never open with a statistic — numbers before context underperform.",
          "Read the hook aloud; if it takes over 20 seconds, cut it in half.",
        ],
        changeSummary:
          "July 2026 CI teardown cycle (per-channel pass over the business competitor set): added the proof-then-promise default for business/founder content and the 15-second delivery rule. Evidence: MagnatesMedia, ColdFusion, Internet Historian and How Money Works outlier teardowns.",
        source: "ai",
        createdAt: daysAgo(0),
        examples:
          "\"The vault door was already open when the auditors arrived...\" · Proof-then-promise: \"He turned down $50M. [proof] By the end of this video you'll know exactly why — and whether he was right. [promise]\"",
      },
    ],
    coldOpenVideos.slice(0, 6),
    [
      ...outlierCompIds.slice(0, 3),
      ...ciIdsWhere((c) => c.hook === "story_cold_open" || c.hook === "bold_claim", 5),
    ],
  ),
  sopWithVersions(
    {
      id: "sop_thumbs", organizationId: org.id, title: "Thumbnail Design",
      category: "thumbnails", status: "active", reviewFrequencyDays: 30,
      nextReviewAt: daysAgo(2), // overdue → shows up in "needs review"
    },
    [
      {
        purpose: "Design thumbnails that earn the click without misleading.",
        whenToUse: "After the title is locked, before scheduling.",
        steps: [
          "One focal object or face; no more than 3 visual elements.",
          "Max 4 words of text, readable at 120px wide.",
          "Test against the 6 competing thumbnails in the niche this week.",
        ],
      },
      {
        purpose: "Design thumbnails that earn the click without misleading.",
        whenToUse: "After the title is locked, before scheduling.",
        steps: [
          "One focal object or face; no more than 3 visual elements.",
          "Max 4 words of text, readable at 120px wide.",
          "Prefer a single object + tension copy over a collage (see Luxottica outlier).",
          "Test against the 6 competing thumbnails in the niche this week.",
          "A/B test when expected views > 50k.",
        ],
        changeSummary: "Added single-object guidance from competitor outlier analysis; added A/B threshold.",
      },
      {
        purpose: "Design thumbnails that earn the click without misleading.",
        whenToUse: "After the title is locked, before scheduling.",
        steps: [
          "One focal object or face; no more than 3 visual elements.",
          "Business/founder videos: face on the left third + a ≤3-word claim on the right, orange/blue palette — the CI sample's winning pattern (72% success, +25–30% CTR).",
          "Check readability on a phone first — 70% of niche views are mobile; max 4 words, readable at 120px wide.",
          "Prefer a single object + tension copy over a collage (see Luxottica outlier).",
          "Never text-heavy: the algorithm favors visual hierarchy; the text-first pattern is declining (28% success).",
          "Test against the 6 competing thumbnails in the niche this week.",
          "A/B test when expected views > 50k.",
        ],
        changeSummary:
          "July 2026 CI teardown cycle: added the face-left / ≤3-word-claim / orange-blue formula and the mobile-first check. Evidence: face-centered outliers across MagnatesMedia, ColdFusion, MrBeast and Fortune teardowns.",
        source: "ai",
        createdAt: daysAgo(0),
      },
    ],
    [],
    [...outlierCompIds.slice(0, 2), ...ciIdsWhere((c) => c.isOutlier, 4)],
  ),
  sopWithVersions(
    {
      id: "sop_structure", organizationId: org.id, title: "Story Structure Selection",
      category: "storytelling", status: "active", reviewFrequencyDays: 45,
      nextReviewAt: daysAgo(-30),
    },
    [
      {
        purpose: "Pick the narrative spine that maximizes retention for the topic.",
        whenToUse: "At outline stage, after research is complete.",
        steps: [
          "Default to rise-and-fall for company/institution stories.",
          "Use case study structure for tactic/method topics.",
          "Avoid listicles for long-form — retention runs ~0.8x baseline.",
          "Write the midpoint reversal before writing anything else.",
        ],
        changeSummary: undefined,
      },
      {
        purpose: "Pick the narrative spine that maximizes retention for the topic.",
        whenToUse: "At outline stage, after research is complete.",
        steps: [
          "Default to rise-and-fall for company/institution stories (1.25x baseline retention, n=11).",
          "Use case study structure for tactic/method topics.",
          "Avoid listicles for long-form — retention runs ~0.8x baseline.",
          "Write the midpoint reversal before writing anything else.",
          "End every act on an open question.",
        ],
        changeSummary: "Quantified the rise-and-fall advantage; added act-break rule from retention curve analysis.",
        source: "ai",
      },
      {
        purpose: "Pick the narrative spine that maximizes retention for the topic.",
        whenToUse: "At outline stage, after research is complete.",
        steps: [
          "Default to rise-and-fall for company/institution stories (1.25x baseline retention, n=11).",
          "Founder/person stories: hero's journey with failures integrated — 74% completion in the CI sample. Never success-only; integrated failures beat inspiration.",
          "Plan 3–5 emotional beats (setback → revelation → triumph) per 12–18 minutes — beats outperform flat narratives by 15–20% retention regardless of spine.",
          "Use case study structure for tactic/method topics.",
          "Avoid listicles for long-form — retention runs ~0.8x baseline.",
          "Write the midpoint reversal before writing anything else.",
          "End every act on an open question.",
        ],
        changeSummary:
          "July 2026 CI teardown cycle: added the hero's-journey-with-failures default for founder stories and the emotional-beat rule. Evidence: Internet Historian, Real Stories and Wendover teardowns; pattern analysis §3.4.",
        source: "ai",
        createdAt: daysAgo(0),
      },
    ],
    videos.filter((v) => v.storyStructure === "rise_and_fall").slice(0, 4).map((v) => v.id),
    ciIdsWhere((c) => c.storyStructure === "rise_and_fall" || c.storyStructure === "case_study", 4),
  ),
  sopWithVersions(
    {
      id: "sop_research", organizationId: org.id, title: "Topic Research & Validation",
      category: "research", status: "active", reviewFrequencyDays: 60,
      nextReviewAt: daysAgo(-45),
    },
    [
      {
        purpose: "Only greenlight topics with demonstrated demand.",
        whenToUse: "Weekly idea review, before any topic enters production.",
        steps: [
          "Find 3+ comparable videos with above-baseline views/day in the niche.",
          "Check search volume for the core query.",
          "Log the comparable videos in the competitor database.",
          "Score the idea 1-5 on demand, differentiation, and production cost.",
        ],
      },
      {
        purpose: "Only greenlight topics with demonstrated demand.",
        whenToUse: "Weekly idea review, before any topic enters production.",
        steps: [
          "Find 3+ comparable videos with above-baseline views/day in the niche.",
          "Check the CI saturation map before greenlight: generic founder stories and generic advice are declining (−15–30% YoY); the open gaps are failure analysis, female/international founders, creator-economy founders, and AI × founders.",
          "Name the competitor blind spot the topic exploits — if no tracked channel is weak where this topic is strong, rescore it.",
          "Check search volume for the core query.",
          "Log the comparable videos in the competitor database.",
          "Score the idea 1-5 on demand, differentiation, and production cost.",
        ],
        changeSummary:
          "July 2026 CI teardown cycle: added the saturation-map gate and the blind-spot requirement. Evidence: per-channel blind-spot notes across all 25 deep-dived competitors (20/25 are AdSense-only, most are success-only).",
        source: "ai",
        createdAt: daysAgo(0),
      },
    ],
    [],
    ciIdsWhere((c) => Boolean(c.teardown), 3),
  ),
  sopWithVersions(
    {
      id: "sop_titles", organizationId: org.id, title: "Title Writing",
      category: "packaging", status: "active", reviewFrequencyDays: 30,
      nextReviewAt: daysAgo(-20),
    },
    [
      {
        purpose: "Write titles that create an open loop the thumbnail doesn't close.",
        whenToUse: "Before thumbnail design; title leads.",
        steps: [
          "Write 10 title candidates; sleep on it; pick 2 finalists.",
          "Under 55 characters so nothing truncates.",
          "Title and thumbnail must not repeat the same words.",
          "Say the title out loud — if it sounds like a headline, rewrite it like a story.",
        ],
      },
      {
        purpose: "Write titles that create an open loop the thumbnail doesn't close.",
        whenToUse: "Before thumbnail design; title leads.",
        steps: [
          "Write 10 title candidates; sleep on it; pick 2 finalists.",
          "Business/founder videos: draft against [Number/Claim] – [Benefit] – [Curiosity]; numbers add +34% CTR, personal pronouns +18%, honest parentheticals +12%.",
          "Front-load the first 40 characters — mobile truncates there; keep the whole title under 55.",
          "Never write a claim the video can't cash — audience trust damage is permanent (CI threat #13).",
          "Title and thumbnail must not repeat the same words.",
          "Say the title out loud — if it sounds like a headline, rewrite it like a story.",
        ],
        changeSummary:
          "July 2026 CI teardown cycle: added the number/benefit/curiosity formula and the 40-character mobile rule. Evidence: title-pattern analysis across MagnatesMedia, Company Man, How Money Works and Wall Street Millennial teardowns.",
        source: "ai",
        createdAt: daysAgo(0),
      },
    ],
    [],
    ciIdsWhere((c) => c.hook === "question" || c.hook === "contrarian", 4),
  ),
  sopWithVersions(
    {
      id: "sop_retention", organizationId: org.id, title: "Retention Editing Pass",
      category: "editing", status: "draft", reviewFrequencyDays: 30,
      nextReviewAt: daysAgo(-25),
    },
    [
      {
        purpose: "A dedicated edit pass focused purely on watch-time.",
        whenToUse: "After picture lock, before color/sound.",
        steps: [
          "Cut anything that doesn't advance the story or raise a question.",
          "First 3 minutes: a visual change every 3-5 seconds.",
          "Add a curiosity re-hook every 2 minutes ('but that's not the strange part').",
          "Watch at 2x with fresh eyes; note every moment attention drifts.",
        ],
      },
      {
        purpose: "A dedicated edit pass focused purely on watch-time.",
        whenToUse: "After picture lock, before color/sound.",
        steps: [
          "Cut anything that doesn't advance the story or raise a question.",
          "Target a 6–8s average shot length for the 18–45 core; hold longer only on emotional beats.",
          "Audit the 10–20s window frame by frame — the CI retention cliff; the hook must have paid off by second 15.",
          "First 3 minutes: a visual change every 3-5 seconds.",
          "Add a curiosity re-hook every 2 minutes ('but that's not the strange part').",
          "Sponsor reads go mid-roll, natively integrated — intro reads over 20s cost 5–10% retention.",
          "Watch at 2x with fresh eyes; note every moment attention drifts.",
        ],
        changeSummary:
          "July 2026 CI teardown cycle: added the 6–8s pacing target, the 10–20s cliff audit, and the mid-roll sponsor rule. Evidence: pacing analysis across ColdFusion (8–15s, slow), MagnatesMedia (4–8s) and MrBeast (2–4s) teardowns; monetization patterns §4.2.",
        source: "ai",
        createdAt: daysAgo(0),
      },
    ],
  ),

  // -------------------------------------------------------------------------
  // Per-niche SOPs — distilled from each niche's CI teardown cycle. The six
  // SOPs above stay generic/org-wide; niche-specific rules live here, scoped
  // to a channel so each niche reads its own playbook. The two niches
  // genuinely conflict (face-led vs artifact-led packaging, proof-then-promise
  // vs artifact cold-opens), which is why these are separate SOPs.
  // -------------------------------------------------------------------------
  sopWithVersions(
    {
      id: "sop_biz_hooks", organizationId: org.id, channelId: "ch_founder",
      title: "Hooks — Business niche", category: "hooks", status: "active",
      reviewFrequencyDays: 45, nextReviewAt: daysAgo(-45),
    },
    [
      {
        purpose: "Open business/founder videos so a browsing viewer commits inside 15 seconds.",
        whenToUse: "Every Founder Reality / Business Storytelling video, before scripting the body.",
        steps: [
          "Default to proof-then-promise: concrete proof in the first 5 seconds, payoff by second 15, commitment by 30 (78% retention at 30s vs 67% for question hooks in the CI sample).",
          "Deliver the title's promise by second 15 — the 10–20s retention cliff is unrecoverable.",
          "Prefer a direct claim over scene-setting; use first person where honest (+8–12% engagement).",
          "Open cold inside a decision moment or a single scene of the empire — never a biography preamble (MagnatesMedia teardowns).",
          "Never open with a statistic without context; read the hook aloud and cut it if it runs past 20 seconds.",
        ],
        changeSummary:
          "Created from the July 2026 business teardown cycle (25 channels): proof-then-promise default, 15-second delivery rule, decision-moment cold opens. Evidence: MagnatesMedia, ColdFusion, How Money Works, Internet Historian teardowns.",
        source: "ai",
        createdAt: daysAgo(0),
      },
    ],
    [],
    ciIdsWhere((c) => c.hook === "story_cold_open" || c.hook === "bold_claim", 4),
  ),
  sopWithVersions(
    {
      id: "sop_biz_packaging", organizationId: org.id, channelId: "ch_founder",
      title: "Packaging — Business niche", category: "packaging", status: "active",
      reviewFrequencyDays: 45, nextReviewAt: daysAgo(-45),
    },
    [
      {
        purpose: "Title + thumbnail packaging tuned to what wins in the business/founder niche.",
        whenToUse: "After the script locks, before scheduling, on business-niche videos.",
        steps: [
          "Thumbnail: face on the left third + a ≤3-word claim on the right, orange/blue palette (72% success pattern, +25–30% CTR); check on a phone first — 70% of views are mobile.",
          "Title: draft against [Number/Claim] – [Benefit] – [Curiosity]; numbers +34% CTR, personal pronouns +18%; front-load the first 40 characters.",
          "Identity-mystery framing ('the man who…', 'the company that…') when the subject genuinely carries it (Magnates Media mechanism).",
          "Implicate the viewer ('your…') only when the story literally touches them (Luxottica mechanism) — never overclaim; trust damage is permanent.",
          "Title and thumbnail must not repeat the same words.",
        ],
        changeSummary:
          "Created from the July 2026 business teardown cycle: face-left formula, number/benefit/curiosity titles, identity-mystery and viewer-implication mechanisms. Evidence: MagnatesMedia, Fortune, Company Man, Wall Street Millennial teardowns.",
        source: "ai",
        createdAt: daysAgo(0),
      },
    ],
    [],
    ciIdsWhere((c) => c.hook === "question" || c.hook === "contrarian", 4),
  ),
  sopWithVersions(
    {
      id: "sop_biz_structure", organizationId: org.id, channelId: "ch_founder",
      title: "Story Structure — Business niche", category: "storytelling", status: "active",
      reviewFrequencyDays: 45, nextReviewAt: daysAgo(-45),
    },
    [
      {
        purpose: "Pick the narrative spine and pacing that maximize retention on founder/company stories.",
        whenToUse: "At outline stage on business-niche videos.",
        steps: [
          "Founder/person stories: hero's journey with failures integrated (74% completion in the CI sample) — never success-only.",
          "Company stories: rise-and-fall (most shareable, 70% completion).",
          "Plan 3–5 emotional beats (setback → revelation → triumph) per 12–18 minutes; beats outperform flat narratives by 15–20% retention regardless of spine.",
          "Pacing: 6–8s average shot length for the 18–45 core; hold longer only on emotional beats.",
          "Keep one concrete question open across the whole video; end every act on it.",
        ],
        changeSummary:
          "Created from the July 2026 business teardown cycle: failures-integrated default, emotional-beat rule, 6–8s pacing. Evidence: Modern MBA, Internet Historian, Real Stories, Wendover teardowns; patterns §3.4–3.5.",
        source: "ai",
        createdAt: daysAgo(0),
      },
    ],
    [],
    ciIdsWhere((c) => c.storyStructure === "rise_and_fall" || c.storyStructure === "case_study", 4),
  ),
  sopWithVersions(
    {
      id: "sop_biz_topics", organizationId: org.id, channelId: "ch_founder",
      title: "Topic Selection — Business niche", category: "research", status: "active",
      reviewFrequencyDays: 60, nextReviewAt: daysAgo(-60),
    },
    [
      {
        purpose: "Greenlight only business topics with demonstrated demand and a named competitor blind spot.",
        whenToUse: "Weekly idea review for the business niche.",
        steps: [
          "Check the CI saturation map: generic founder stories and generic advice are declining (−15–30% YoY); the open gaps are failure analysis, female/international founders, creator-economy founders, AI × founders.",
          "Name the competitor blind spot the topic exploits (20/25 deep-dived channels are AdSense-only and success-only) — if no tracked channel is weak here, rescore.",
          "Find 3+ comparable videos with above-baseline views/day; log them in the competitor database.",
          "Score 1-5 on demand, differentiation, and production cost; packaging (title + thumbnail concept) drafted at idea stage.",
        ],
        changeSummary:
          "Created from the July 2026 business teardown cycle: saturation-map gate + blind-spot requirement, sourced from all 25 deep-dive blind-spot lists.",
        source: "ai",
        createdAt: daysAgo(0),
      },
    ],
    [],
    ciIdsWhere((c) => Boolean(c.teardown), 3),
  ),
  sopWithVersions(
    {
      id: "sop_rel_hooks", organizationId: org.id, channelId: "ch_rel",
      title: "Hooks — Religion & History niche", category: "hooks", status: "active",
      reviewFrequencyDays: 45, nextReviewAt: daysAgo(-45),
    },
    [
      {
        purpose: "Open religious-history videos so curiosity is honest and the promise lands early.",
        whenToUse: "Every Myth & Meaning video, before scripting the body.",
        steps: [
          "Open cold on an artifact, a scene, or a primary-source line — drop the viewer inside the ancient world, not inside a thesis.",
          "Deliver the title's promise early and honestly; this audience punishes bait permanently.",
          "Question hooks must be resolved with scholarship by the end — never leave a 'mystery' the video can't cash (the anti-Gnostic-Informant rule).",
          "State what scholars actually know vs what is debated within the first minute on contested topics.",
          "Read the hook aloud; atmosphere is allowed to breathe here — slower than business-niche pacing, but every sentence still earns its place.",
        ],
        changeSummary:
          "Created from the July 2026 Christianity teardown cycle (25 channels): artifact/scene cold-opens, honest-promise delivery, resolve-with-scholarship rule. Evidence: Hochelaga, Voices of the Past, Fall of Civilizations, Gnostic Informant teardowns.",
        source: "ai",
        createdAt: daysAgo(0),
      },
    ],
    [],
    cxIdsWhere((c) => c.hook === "story_cold_open" || c.hook === "question", 4),
  ),
  sopWithVersions(
    {
      id: "sop_rel_packaging", organizationId: org.id, channelId: "ch_rel",
      title: "Packaging — Religion & History niche", category: "packaging", status: "active",
      reviewFrequencyDays: 45, nextReviewAt: daysAgo(-45),
    },
    [
      {
        purpose: "Title + thumbnail packaging tuned to what wins in the religious-history niche — the opposite of the business playbook.",
        whenToUse: "After the script locks, before scheduling, on religion-niche videos.",
        steps: [
          "Thumbnail: artifact/manuscript/icon-led with ≤3 words — faces win only in interview/debate lanes, which we are not in. No arrows, no shocked faces.",
          "Visibly non-clickbait packaging is itself a trust signal this audience rewards — restraint converts.",
          "Winning title shapes: 'What X Actually Believed', 'The Forgotten/Lost X', questions the video resolves with scholarship.",
          "'Banned/forbidden' only when literally descriptive (Book of Enoch), never conspiratorial; watch advertiser sensitivity on contested framings.",
          "Title and thumbnail must not repeat the same words; check artifact readability at 120px.",
        ],
        changeSummary:
          "Created from the July 2026 Christianity teardown cycle: artifact-led thumbnails (inverse of the business niche), no-clickbait trust packaging, honest 'forbidden' rule. Evidence: Hochelaga, UsefulCharts, Esoterica, ReligionForBreakfast teardowns.",
        source: "ai",
        createdAt: daysAgo(0),
      },
    ],
    [],
    cxIdsWhere((c) => c.isOutlier, 4),
  ),
  sopWithVersions(
    {
      id: "sop_rel_structure", organizationId: org.id, channelId: "ch_rel",
      title: "Story Structure — Religion & History niche", category: "storytelling", status: "active",
      reviewFrequencyDays: 45, nextReviewAt: daysAgo(-45),
    },
    [
      {
        purpose: "Pick the narrative spine that carries scholarship as story on religious-history topics.",
        whenToUse: "At outline stage on religion-niche videos.",
        steps: [
          "Default spines: mystery-reveal (discoveries), biography-of-a-god/text (franchise entries), textual-detective (manuscript stories).",
          "Serialize: number arc episodes and end each on a hook into the next — serialization is this niche's patronage engine.",
          "Voice-act primary sources instead of paraphrasing the narrator over them (Voices of the Past mechanism, with the scholarly framing he omits).",
          "Hedge reconstruction claims explicitly — 'we think', 'the evidence suggests' — this audience checks.",
          "Runtimes breathe here: 40–75 min is normal at the top of the niche; cut for tension, not for length.",
        ],
        changeSummary:
          "Created from the July 2026 Christianity teardown cycle: mystery-reveal/biography/detective spines, serialization rule, voice-acted sources. Evidence: Fall of Civilizations, Voices of the Past, History Time, Crecganford teardowns.",
        source: "ai",
        createdAt: daysAgo(0),
      },
    ],
    [],
    cxIdsWhere((c) => c.storyStructure === "chronological" || c.storyStructure === "rise_and_fall", 4),
  ),
  sopWithVersions(
    {
      id: "sop_rel_credibility", organizationId: org.id, channelId: "ch_rel",
      title: "Research & Credibility — Religion & History niche", category: "research", status: "active",
      reviewFrequencyDays: 60, nextReviewAt: daysAgo(-60),
    },
    [
      {
        purpose: "Protect the channel's credibility — the leading indicator of everything in this niche.",
        whenToUse: "Every religion-niche video, from topic selection through publish.",
        steps: [
          "Sources on screen — the visible contrast with sensationalist channels IS the brand.",
          "Scholar-review pass required on high-stakes scripts (Yahweh/Asherah/monotheism cluster, anything contested).",
          "Stay neutral under comment pressure: never be claimed by the apologetics or counter-apologetics camp — the curious middle is the audience.",
          "Zero-retraction standard: one bad correction does permanent damage with this audience; when scholarship is divided, present the division.",
          "No conspiracy framing ever — cover apocrypha and 'lost' texts rigorously and inherit sensationalist channels' maturing viewers.",
        ],
        changeSummary:
          "Created from the July 2026 Christianity teardown cycle: sources-on-screen rule, scholar-review gate, neutrality discipline, zero-retraction standard. Evidence: Gnostic Informant (cautionary), ReligionForBreakfast, Kipp Davis, MythVision teardowns.",
        source: "ai",
        createdAt: daysAgo(0),
      },
    ],
    [],
    cxIdsWhere((c) => Boolean(c.teardown), 3),
  ),
];

// ---------------------------------------------------------------------------
// Ideas
// ---------------------------------------------------------------------------
const ideas: Idea[] = [
  {
    id: uid("idea"), organizationId: org.id, channelId: "ch_biz",
    title: "The company that owns every guitar brand", description: "Fender/Gibson consolidation story — mystery-box angle like the Luxottica outlier.",
    priority: "high", status: "approved", tags: ["rise_and_fall", "consolidation"],
    relatedCompetitorVideoId: competitorVideos[2]?.id, relatedSopId: "sop_research",
    createdAt: daysAgo(9),
  },
  {
    id: uid("idea"), organizationId: org.id, channelId: "ch_biz",
    title: "How Ferrero quietly conquered breakfast", description: "Nutella empire; family secrecy angle.",
    priority: "medium", status: "researching", tags: ["food", "family_business"], createdAt: daysAgo(15),
  },
  {
    id: uid("idea"), organizationId: org.id, channelId: "ch_rel",
    title: "The religion that banned writing its own name", description: "Test forbidden-knowledge framing (RFB goddess outlier) on a Mystery cults topic.",
    priority: "high", status: "inbox", tags: ["mystery_cults", "forbidden_knowledge"],
    relatedCompetitorVideoId: competitorVideos[6]?.id, createdAt: daysAgo(4),
  },
  {
    id: uid("idea"), organizationId: org.id, channelId: "ch_rel",
    title: "What the Dead Sea Scrolls actually say", description: "High search volume; needs cold-open scene selection.",
    priority: "medium", status: "approved", tags: ["scrolls", "search_tail"], relatedSopId: "sop_hooks",
    createdAt: daysAgo(21),
  },
  {
    id: uid("idea"), organizationId: org.id, channelId: "ch_sales",
    title: "I cold-called 100 CEOs with one script", description: "Experiment format — original data beats explainer format in the niche.",
    priority: "urgent", status: "in_production", tags: ["experiment", "original_data"], createdAt: daysAgo(11),
  },
  {
    id: uid("idea"), organizationId: org.id, channelId: "ch_sales",
    title: "The psychology of 'let me think about it'", description: "Objection-handling deep dive; contrarian hook candidate.",
    priority: "medium", status: "inbox", tags: ["objections"], createdAt: daysAgo(2),
  },
  {
    id: uid("idea"), organizationId: org.id, channelId: "ch_biz",
    title: "Why airport food costs so much", description: "Consumer-anger angle, proven by competitor data.",
    priority: "low", status: "inbox", tags: ["consumer_anger"], createdAt: daysAgo(1),
  },
  {
    id: uid("idea"), organizationId: org.id, channelId: "ch_rel",
    title: "The oldest prayer ever written", description: "Sumerian tablet cold open; strong scene material.",
    priority: "low", status: "archived", tags: ["sumer"], createdAt: daysAgo(60),
  },
  // The deduplicated CI ideas: 19 niche-level opportunities + the 20-video
  // Founder Reality launch slate (opportunity #1 became the channel itself).
  ...ciIdeas,
  // Christianity cycle: 20 opportunities + 20 video ideas for the existing
  // Ancient Religions & Storytelling channel (no overlaps with its 3
  // pre-existing pipeline ideas — checked title-by-title).
  ...cxIdeas,
];

// ---------------------------------------------------------------------------
// AI insights & recommendations (with outcome tracking)
// ---------------------------------------------------------------------------
const insights: AiInsight[] = [
  {
    id: uid("ins"), organizationId: org.id, kind: "pattern",
    title: "Story cold opens outperform every other hook type",
    body: "Across all three channels, videos opening with a story cold open average ~1.35x channel-baseline CTR (n=14). The effect holds on each channel individually. Statistic-led hooks are the weakest at ~0.78x baseline (n=9).",
    confidence: 0.9, createdAt: daysAgo(6),
  },
  {
    id: uid("ins"), organizationId: org.id, kind: "pattern",
    title: "Rise-and-fall structure drives retention",
    body: "Rise-and-fall narratives average ~1.25x baseline percent-viewed vs 0.8x for listicles. Sample is concentrated on Business Storytelling (n=11); treat cross-channel claims cautiously.",
    confidence: 0.82, createdAt: daysAgo(6),
  },
  {
    id: uid("ins"), organizationId: org.id, kind: "competitor",
    title: "'Forbidden knowledge' framing is the common thread in religion-niche outliers",
    body: "3 of 4 recent outliers in the religion niche use suppression/forbidden framing (chained book, erased goddess, forgotten gospel). Myth & Meaning has not tested this framing yet.",
    confidence: 0.75, createdAt: daysAgo(12),
  },
  {
    id: uid("ins"), organizationId: org.id, channelId: "ch_sales", kind: "anomaly",
    title: "Sales Psychology CTR softening in the last 4 uploads",
    body: "Recent mean CTR 5.6% vs trailing baseline 6.3% (t=-2.1). The dip coincides with three consecutive statistic-led hooks. Recommend re-applying Hook Writing SOP v3 defaults.",
    confidence: 0.7, createdAt: daysAgo(3),
  },
  {
    id: uid("ins"), organizationId: org.id, channelId: "ch_rel", kind: "pattern",
    title: "Retention improving on Ancient Religions",
    body: "Last 4 uploads average 51% viewed vs 46% baseline (t=+2.3), coinciding with adoption of the act-break rule in Story Structure SOP v2.",
    confidence: 0.72, createdAt: daysAgo(8),
  },
  // Knowledge base from the business-niche CI research (quoted findings, not
  // app-detected statistics — see ciBusinessSeed.ts).
  ...ciInsights,
  // Knowledge base from the Christianity-niche CI research.
  ...cxInsights,
];

const recommendations: AiRecommendation[] = [
  {
    id: uid("rec"), organizationId: org.id, sopId: "sop_hooks",
    proposedSopVersionId: sops[0].versions[0].id,
    title: "Make story cold opens the default hook",
    rationale: "Cold-open videos run ~1.35x baseline CTR across channels (n=14). Proposed Hook Writing v3 codifies it as the default and adds a read-aloud length check.",
    status: "validated",
    measuredImpact: { metric: "ctr", before: 5.1, after: 6.4, nBefore: 12, nAfter: 8, tStat: 2.6 },
    outcomeNotes: "CTR improved on 7 of 8 videos published under v3.",
    createdAt: daysAgo(48),
  },
  {
    id: uid("rec"), organizationId: org.id, sopId: "sop_thumbs",
    title: "Test 'forbidden knowledge' packaging on Myth & Meaning",
    rationale: "3 of 4 religion-niche competitor outliers use suppression framing. Test on the next 3 uploads with topics that support it honestly (Gnostic gospels, Asherah).",
    status: "testing", createdAt: daysAgo(12),
  },
  {
    id: uid("rec"), organizationId: org.id, sopId: "sop_structure",
    title: "Quantify structure guidance in the SOP",
    rationale: "Retention deltas by structure are now statistically stable; bake the numbers into the SOP so selection stops being taste-based.",
    status: "accepted", createdAt: daysAgo(20),
  },
  {
    id: uid("rec"), organizationId: org.id, sopId: "sop_hooks",
    title: "Sales Psychology: stop statistic-led hooks",
    rationale: "The current CTR dip coincides with three statistic-led hooks in a row — the weakest hook type org-wide (0.78x). Re-apply the SOP default on the next upload.",
    status: "proposed", createdAt: daysAgo(3),
    proposedChange: {
      sopId: "sop_hooks",
      sopTitle: "Hook Writing",
      category: "hooks",
      purpose: "Write the first 30 seconds so a browsing viewer commits to the video.",
      whenToUse: "Every video, before scripting the body.",
      steps: [
        "Draft 5 hook options before writing anything else.",
        "Default to a story cold open: drop the viewer inside a single scene, mid-action.",
        "State the stakes within the first two sentences.",
        "Never open with a statistic — numbers before context underperform (0.78x baseline CTR, n=9).",
        "If a number matters, earn it: give it a scene first, then the figure.",
        "Read the hook aloud; if it takes over 20 seconds, cut it in half.",
      ],
      examples: "\"The vault door was already open when the auditors arrived...\"",
      changeSummary: "Hardened the no-statistic-opener rule after three statistic-led hooks drove the current CTR dip, and added a 'earn the number' fallback so data still has a place.",
    },
  },
  {
    id: uid("rec"), organizationId: org.id,
    title: "Add end-screen experiment to lift subscriber conversion",
    rationale: "Subs-per-view on Business Storytelling (0.45%) lags the other channels (0.6-0.7%) despite higher views. Test a narrative end-screen CTA for 4 uploads.",
    status: "rejected", outcomeNotes: "Team judged the CTA off-brand; revisit next quarter.",
    createdAt: daysAgo(30),
  },
];

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------
const reports: Report[] = [
  {
    id: uid("rep"), organizationId: org.id, type: "monthly",
    title: "Monthly report — all channels — June 2026",
    periodStart: "2026-06-01", periodEnd: "2026-06-30",
    source: "ai", createdAt: daysAgo(3),
    contentMd: `# Monthly report — all channels — June 2026

## Summary
The portfolio published 9 videos in June. Org-wide CTR rose to 5.9% (+0.4pp vs May), driven almost entirely by Hook Writing SOP v3 adoption. Ancient Religions posted its best retention month on record (51% avg viewed). Sales Psychology is the soft spot: CTR fell for a third straight upload cycle, correlated with statistic-led hooks.

## What worked
- **Story cold opens** — 6 of 6 June uploads using them beat channel CTR baseline.
- **Rise-and-fall structures** on Business Storytelling: 47% avg viewed vs 42% baseline.
- Act-break rule (Story Structure v2) is holding on Myth & Meaning.

## What didn't
- Statistic-led hooks on Sales Psychology: 5.4% CTR vs 6.1% baseline.
- Listicle-format long-form continues to underperform on retention (0.8x).

## Competitor landscape
Four new outliers flagged. Common threads: mystery/suppression framing and single-object thumbnails.

## Experiments & SOP changes
- Hook Writing v3 **validated**: CTR 5.1% → 6.4% across 8 post-adoption uploads (t=2.6).
- 'Forbidden knowledge' packaging test on Myth & Meaning: 1 of 3 uploads in; too early to call.

## Recommended focus for next period
1. Sales Psychology returns to cold-open hooks immediately.
2. Ship the two approved mystery-framing topics on Myth & Meaning.
3. Start the end-screen CTA experiment decision (currently rejected — revisit with softer creative).`,
  },
  {
    id: uid("rep"), organizationId: org.id, channelId: "ch_sales", type: "channel",
    title: "Channel report — Sales Psychology — June 2026",
    periodStart: "2026-06-01", periodEnd: "2026-06-30",
    source: "ai", createdAt: daysAgo(3),
    contentMd: `# Channel report — Sales Psychology — June 2026

## Summary
CTR declined to 5.6% (baseline 6.3%, t=-2.1) across the last four uploads while retention held at 38%. The decline is fully explained by hook selection: all three underperformers opened with statistics, the weakest hook type org-wide.

## What worked
- "Why top closers never pitch" (cold open) — 7.1% CTR, best of the month.

## What didn't
- Three consecutive statistic-led hooks: 5.2%, 5.5%, 5.4% CTR.

## Recommended focus for next period
Return to the Hook Writing SOP v3 default (story cold open) for the next 3 uploads, then re-measure.`,
  },
  {
    id: uid("rep"), organizationId: org.id, type: "competitor",
    title: "Competitor analysis — Q2 2026",
    periodStart: "2026-04-01", periodEnd: "2026-06-30",
    source: "ai", createdAt: daysAgo(10),
    contentMd: `# Competitor analysis — Q2 2026

## Summary
Six statistical outliers detected across five tracked channels this quarter. Two repeatable mechanisms dominate: (1) suppression/forbidden framing in the religion niche, (2) consumer-anger consolidation stories in business.

## Patterns
- Outlier thumbnails: 5 of 6 use a single object with tension copy — no collages.
- Outlier hooks: 4 of 6 are story cold opens.
- Median outlier velocity: +0.4 (views/day still accelerating at flag time).

## Opportunities
1. Myth & Meaning: forbidden-knowledge topics (already in the ideas queue).
2. Founders & Fortunes: "the company that owns X" consolidation format.
3. The Persuasion Lab: myth-busting contrarian format ("The 7-38-55 Rule Is Wrong" model).`,
  },
];

// ---------------------------------------------------------------------------
// Notifications & activity
// ---------------------------------------------------------------------------
const notifications: AppNotification[] = [
  {
    id: uid("ntf"), organizationId: org.id, type: "ai_recommendation",
    title: "New recommendation: Sales Psychology: stop statistic-led hooks",
    body: "The current CTR dip coincides with three statistic-led hooks in a row.",
    entityType: "recommendation", createdAt: daysAgo(3),
  },
  {
    id: uid("ntf"), organizationId: org.id, type: "ctr_drop",
    title: "CTR trending down on Sales Psychology",
    body: "Recent mean 5.6% vs baseline 6.3% (t=-2.1).",
    entityType: "channel", entityId: "ch_sales", createdAt: daysAgo(3),
  },
  {
    id: uid("ntf"), organizationId: org.id, type: "competitor_outlier",
    title: "Competitor outlier: The Man Who Owns Everything",
    body: "Magnates Media at 95,000 views/day (z=3.8).",
    entityType: "competitor_video", createdAt: daysAgo(5),
  },
  {
    id: uid("ntf"), organizationId: org.id, type: "sop_review_due",
    title: "SOP review overdue: Thumbnail Design",
    body: "Scheduled review passed 2 days ago.",
    entityType: "sop", entityId: "sop_thumbs", createdAt: daysAgo(2),
  },
  {
    id: uid("ntf"), organizationId: org.id, type: "retention_improved",
    title: "Retention improving on Ancient Religions",
    body: "Last 4 uploads: 51% viewed vs 46% baseline (t=+2.3).",
    entityType: "channel", entityId: "ch_rel", readAt: daysAgo(6), createdAt: daysAgo(8),
  },
  {
    id: uid("ntf"), organizationId: org.id, type: "experiment_complete",
    title: "Experiment validated: story cold opens as default hook",
    body: "CTR 5.1% → 6.4% across 8 post-adoption uploads.",
    entityType: "recommendation", readAt: daysAgo(20), createdAt: daysAgo(25),
  },
];

const activity: ActivityItem[] = [
  { id: uid("act"), actorName: "AI Coach", action: "proposed", entityType: "recommendation", entityLabel: "Sales Psychology: stop statistic-led hooks", createdAt: daysAgo(3) },
  { id: uid("act"), actorName: "Javian", action: "published", entityType: "video", entityLabel: videos[0]?.title ?? "video", createdAt: daysAgo(4) },
  { id: uid("act"), actorName: "Amara", action: "moved to production", entityType: "idea", entityLabel: "I cold-called 100 CEOs with one script", createdAt: daysAgo(5) },
  { id: uid("act"), actorName: "AI Coach", action: "flagged outlier", entityType: "competitor_video", entityLabel: "The Man Who Owns Everything", createdAt: daysAgo(5) },
  { id: uid("act"), actorName: "Robert", action: "accepted", entityType: "recommendation", entityLabel: "Quantify structure guidance in the SOP", createdAt: daysAgo(7) },
  { id: uid("act"), actorName: "AI Coach", action: "generated", entityType: "report", entityLabel: "Monthly report — all channels — June 2026", createdAt: daysAgo(3) },
  { id: uid("act"), actorName: "Javian", action: "created version 3 of", entityType: "sop", entityLabel: "Hook Writing", createdAt: daysAgo(48) },
  { id: uid("act"), actorName: "Robert", action: "added", entityType: "idea", entityLabel: "The religion that banned writing its own name", createdAt: daysAgo(4) },
];

// ---------------------------------------------------------------------------
// Productions — the shared video docs moving through the pipeline.
// ---------------------------------------------------------------------------
const productions: Production[] = [
  {
    id: "prod_guitar",
    organizationId: org.id,
    channelId: "ch_biz",
    title: "The company that owns every guitar brand",
    stage: "scripting",
    format: "long_form",
    assigneeId: "user_javian",
    dueDate: daysAgo(-6).slice(0, 10),
    topic: "Music industry consolidation",
    goal: "CTR ≥ 6% in the first week",
    goalMetric: "ctr",
    goalTarget: 6,
    hookText:
      "Walk into any guitar store in the world. Fender on the left, Gibson on the right, a wall of brands in between. Now here's the strange part — most of those logos answer to the same three companies. And one of them nearly went bankrupt selling... exercise bikes.",
    scriptHook: "",
    scriptBody:
      "ACT 1 — The illusion of choice: the brand wall vs the ownership map.\nACT 2 — How consolidation happened: the 90s buyouts, the Fender near-death story.\nACT 3 — The exercise bike detour and what it reveals about the business of 'authenticity'.",
    scriptOutro: "",
    description:
      "The guitar industry looks like a hundred competing brands. It's three companies wearing a hundred masks.",
    titleCandidates: [
      { text: "The Company That Owns Every Guitar Brand", starred: true },
      { text: "Guitar Brands Are A Lie", starred: false },
      { text: "Three Companies Own Your Guitar", starred: false },
    ],
    thumbnailConcept: "Single guitar headstock, logos peeling off like stickers. Copy: 'one owner?'",
    referenceLinks: ["https://youtube.com/watch?v=comp_TheCom"],
    voStatus: "not_started",
    assetLinks: [],
    checklists: { scripting: [true, true, false, false, false, false] },
    notes: "Validated by the Luxottica outlier — same 'the company that owns X' mechanism.",
    createdAt: daysAgo(2),
    updatedAt: daysAgo(0),
  },
  {
    id: "prod_scrolls",
    organizationId: org.id,
    channelId: "ch_rel",
    title: "What the Dead Sea Scrolls actually say",
    stage: "editing",
    format: "long_form",
    assigneeId: "user_robert",
    dueDate: daysAgo(-10).slice(0, 10),
    topic: "Dead Sea Scrolls",
    goal: "Beat channel avg retention (48%)",
    goalMetric: "avg_percent_viewed",
    goalTarget: 48,
    hookText:
      "In 1947, a shepherd threw a rock into a cave and heard something shatter. Inside the broken jar: a library that had been waiting two thousand years for someone to read it.",
    scriptBody: "Full script locked — see doc history. VO generated with channel voice.",
    description: "What the scrolls contain, what they don't, and why it took 40 years to publish them.",
    titleCandidates: [
      { text: "What the Dead Sea Scrolls Actually Say", starred: true },
      { text: "The Library That Waited 2,000 Years", starred: false },
    ],
    thumbnailConcept: "Torn scroll fragment with one legible glowing line.",
    referenceLinks: [],
    voStatus: "generated",
    assetLinks: [{ label: "VO master", url: "https://drive.example/vo-scrolls" }],
    checklists: { scripting: [true, true, true, true, true, true], editing: [true, false, false, false, false, false] },
    notes: "",
    createdAt: daysAgo(6),
    updatedAt: daysAgo(1),
  },
  {
    id: "prod_ceos",
    organizationId: org.id,
    channelId: "ch_sales",
    title: "I cold-called 100 CEOs with one script",
    stage: "packaging",
    format: "long_form",
    assigneeId: "user_amara",
    dueDate: daysAgo(-3).slice(0, 10),
    scheduledAt: undefined,
    topic: "Cold calling experiment",
    goal: "50k views in 30 days",
    goalMetric: "views",
    goalTarget: 50000,
    hookText:
      "CEO number 34 hung up on me in four seconds. CEO number 35 gave me eleven minutes and a job offer. Same script. I need to tell you what changed.",
    scriptBody: "Experiment structure: the script, the data, the three patterns, the rewrite.",
    description: "I cold-called 100 CEOs with one script and logged every response.",
    titleCandidates: [
      { text: "I Cold-Called 100 CEOs With One Script", starred: true },
      { text: "100 Cold Calls to CEOs. Here's the Data.", starred: false },
      { text: "What 100 CEOs Taught Me About Cold Calls", starred: false },
    ],
    thumbnailConcept: "Call log sheet with tallies, one row circled in red.",
    referenceLinks: [],
    voStatus: "recorded",
    assetLinks: [{ label: "Edit v2", url: "https://drive.example/ceos-edit" }],
    checklists: { packaging: [true, true, false, false, false, false] },
    notes: "Original-data format — expect strong comments; pin the spreadsheet.",
    createdAt: daysAgo(9),
    updatedAt: daysAgo(0),
  },
];

// A few seeded tasks so the manager shows its shape immediately.
const tasks: Task[] = [
  {
    id: uid("tsk"), organizationId: org.id, title: "Record VO for the guitar video",
    status: "doing", assigneeId: members[0].id, assigneeName: members[0].displayName,
    dueAt: daysAgo(-2), createdBy: members[1].id, createdAt: daysAgo(2),
  },
  {
    id: uid("tsk"), organizationId: org.id, title: "Thumbnail A/B for Dead Sea Scrolls",
    status: "todo", assigneeId: members[2].id, assigneeName: members[2].displayName,
    dueAt: daysAgo(-4), createdBy: members[0].id, createdAt: daysAgo(1),
  },
  {
    id: uid("tsk"), organizationId: org.id, title: "Reply to sponsor email",
    status: "done", assigneeId: members[1].id, assigneeName: members[1].displayName,
    createdBy: members[1].id, createdAt: daysAgo(3),
  },
];

// Content Studio state — starts empty; everything the user makes persists.
const contentProjects: ContentProject[] = [];
const feedbackRules: FeedbackRule[] = [];
const aiPersonas: StudioPersona[] = [];

// Seed a short discussion on the first production doc so the collaboration
// surface isn't empty in the demo.
const comments: Comment[] = [
  {
    id: uid("cmt"), entityType: "production", entityId: "prod_guitar",
    author: members[1], body: "Hook feels slow — can we open on the pawn-shop scene? @Javian",
    mentions: [members[0].id], createdAt: daysAgo(2),
  },
  {
    id: uid("cmt"), entityType: "production", entityId: "prod_guitar",
    author: members[0], body: "Agreed. Rewrote the cold open, take a look @Amara.",
    mentions: [members[2].id], createdAt: daysAgo(1),
  },
];

// ---------------------------------------------------------------------------
// Persistence — demo edits survive reloads (localStorage), so the demo is a
// usable tool, not just a showcase. Seeded arrays are replaced in place so
// every reference stays valid.
// ---------------------------------------------------------------------------
// v2: business-niche CI dataset seeded (Founder Reality channel, 35
// competitors, CI ideas + insights). v3: per-channel teardowns of the CI
// competitors' outlier videos + the CI-informed SOP versions. Bumping the key
// reseeds returning browsers; older local edits stay under the old key,
// orphaned.
// v4: Christianity-niche CI dataset seeded (35 competitors incl. two
// in-place extensions, ideas, insights, ch_rel projection goals).
// v5: Christianity teardown cycle + per-niche SOPs (business/religion).
const STORAGE_KEY = "big3.demo.v5";

function persist() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        channels, videos, competitorChannels, competitorVideos, ideas, sops, insights,
        recommendations, reports, notifications, activity, productions, invites, comments, tasks,
        contentProjects, feedbackRules, aiPersonas,
      }),
    );
  } catch {
    // Storage full or unavailable — demo keeps working in memory.
  }
}

function replaceInPlace<T>(target: T[], source: T[] | undefined) {
  if (!Array.isArray(source)) return;
  target.length = 0;
  target.push(...source);
}

(function hydrate() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const s = JSON.parse(raw);
    replaceInPlace(channels, s.channels);
    replaceInPlace(videos, s.videos);
    replaceInPlace(competitorChannels, s.competitorChannels);
    replaceInPlace(competitorVideos, s.competitorVideos);
    replaceInPlace(ideas, s.ideas);
    replaceInPlace(sops, s.sops);
    replaceInPlace(insights, s.insights);
    replaceInPlace(recommendations, s.recommendations);
    replaceInPlace(reports, s.reports);
    replaceInPlace(notifications, s.notifications);
    replaceInPlace(activity, s.activity);
    replaceInPlace(productions, s.productions);
    // Docs persisted before the Shorts feature have no format — default them.
    for (const p of productions) p.format = p.format ?? "long_form";
    replaceInPlace(invites, s.invites);
    replaceInPlace(comments, s.comments);
    replaceInPlace(tasks, s.tasks);
    replaceInPlace(contentProjects, s.contentProjects);
    replaceInPlace(feedbackRules, s.feedbackRules);
    replaceInPlace(aiPersonas, s.aiPersonas);
  } catch {
    // Corrupt state — fall back to the fresh seed.
    localStorage.removeItem(STORAGE_KEY);
  }
})();

// Ids for entities created at runtime must not collide with persisted ones
// across reloads (the seed counter restarts), so they get a time component.
const runtimeId = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;

// ---------------------------------------------------------------------------
// Demo coach — answers from the actual seeded data, so the demo is honest.
// ---------------------------------------------------------------------------
function groupStat(
  vids: VideoRow[],
  key: (v: VideoRow) => string | undefined,
  metric: (v: VideoRow) => number | undefined,
) {
  const groups = new Map<string, number[]>();
  for (const v of vids) {
    const k = key(v);
    const m = metric(v);
    if (!k || m == null) continue;
    groups.set(k, [...(groups.get(k) ?? []), m]);
  }
  return [...groups.entries()]
    .map(([k, xs]) => ({ key: k, mean: xs.reduce((a, b) => a + b, 0) / xs.length, n: xs.length }))
    .sort((a, b) => b.mean - a.mean);
}

function demoCoachAnswer(message: string): string {
  const q = message.toLowerCase();
  const fmt = (x: number) => x.toFixed(1);

  if (q.includes("working on") || q.includes("current") || q.includes("in progress") || q.includes("slate")) {
    const inFlight = productions.filter((p) => p.stage !== "published");
    const inStudio = contentProjects.filter((c) => c.status !== "done");
    if (!inFlight.length && !inStudio.length) {
      return "Nothing is in flight right now — the board and the Content Studio are both clear. Good moment to run Generate Ideas or start a Studio project.";
    }
    return [
      inFlight.length
        ? `In production (${inFlight.length}):\n` +
          inFlight.map((p) => `• "${p.title}" — ${p.stage}${p.dueDate ? `, due ${p.dueDate}` : ""}${p.format === "short" ? " (Short)" : ""}`).join("\n")
        : "",
      inStudio.length
        ? `In the Content Studio (${inStudio.length}):\n` +
          inStudio.map((c) => `• "${c.selectedTitle ?? c.topic}" — at ${c.status}`).join("\n")
        : "",
      "Ask me about any of these by name and I'll pull what the data says.",
    ].filter(Boolean).join("\n\n");
  }
  if (q.includes("hook")) {
    const stats = groupStat(videos, (v) => v.hookType, (v) => v.metrics?.ctr);
    const best = stats[0], worst = stats[stats.length - 1];
    return `**Best hook type right now: ${best.key.replace(/_/g, " ")}** — averaging ${fmt(best.mean)}% CTR across ${best.n} videos.\n\nFull ranking by average CTR:\n${stats.map((s, i) => `${i + 1}. ${s.key.replace(/_/g, " ")} — ${fmt(s.mean)}% (n=${s.n})`).join("\n")}\n\nThe gap between ${best.key.replace(/_/g, " ")} and ${worst.key.replace(/_/g, " ")} is large and consistent across channels. Hook Writing SOP v3 already codifies cold opens as the default — the fastest win is making sure Sales Psychology actually follows it (its last three uploads didn't).`;
  }
  if (q.includes("ctr") && (q.includes("drop") || q.includes("down") || q.includes("caused"))) {
    return `The CTR drop is concentrated on **Sales Psychology**: recent mean 5.6% vs 6.3% baseline (t=-2.1). The other two channels are flat-to-up.\n\nThe proximate cause is hook selection — the last three uploads all opened with statistics, the weakest hook type org-wide (~0.78x baseline). Packaging (titles/thumbnails) didn't change in the same window, so I'd assign most of the delta to hooks.\n\n**Action:** return to the Hook Writing SOP v3 default (story cold open) for the next 3 uploads, then re-measure. There's already an open recommendation for this.`;
  }
  if (q.includes("structure") || q.includes("storytelling")) {
    const stats = groupStat(videos, (v) => v.storyStructure, (v) => v.metrics?.avgPercentViewed);
    return `**Best-performing story structure: ${stats[0].key.replace(/_/g, " ")}** — ${fmt(stats[0].mean)}% average viewed (n=${stats[0].n}).\n\nRanking by average percent viewed:\n${stats.map((s, i) => `${i + 1}. ${s.key.replace(/_/g, " ")} — ${fmt(s.mean)}% (n=${s.n})`).join("\n")}\n\nCaveat: rise-and-fall samples skew toward Business Storytelling, where the format naturally fits. On Myth & Meaning, chronological structures with the act-break rule (Story Structure SOP v2) are closing the gap.`;
  }
  if (q.includes("underperform") || q.includes("worst") || q.includes("weakness")) {
    const stats = groupStat(videos, (v) => v.hookType, (v) => v.metrics?.ctr);
    return `Three consistent weak spots in the data:\n\n1. **Statistic-led hooks** — ${fmt(stats[stats.length - 1].mean)}% average CTR, the weakest openers org-wide. Sales Psychology is the main offender recently.\n2. **Listicle long-form** — ~0.8x baseline retention. Fine for shorts, a drag on long-form.\n3. **Subscriber conversion on Business Storytelling** — 0.45% subs-per-view vs 0.6-0.7% on the other channels, despite the biggest audience. The end-screen experiment was rejected once; worth revisiting with different creative.\n\nIf I had to pick one: fix hooks on Sales Psychology first — it's the cheapest change with a measured effect size.`;
  }
  if (q.includes("test") || q.includes("next month") || q.includes("experiment")) {
    return `Highest-expected-value experiments, in order:\n\n1. **Sales Psychology — cold-open hooks for 3 uploads.** Validated effect (~1.35x CTR); currently ignored. Near-zero cost.\n2. **Myth & Meaning — 'forbidden knowledge' packaging** on the two approved topics. 3 of 4 niche outliers use this framing; test is already in flight (1 of 3 uploads in).\n3. **Founders & Fortunes — "the company that owns X" consolidation format.** Two competitor outliers validate demand; "guitar brands" idea is approved and ready.\n4. **Retention Editing Pass SOP** — it's still a draft. Ship it on one video per channel and compare percent-viewed against each channel's baseline.\n\nEach one has a clear metric, a baseline, and a 3-4 upload sample — small enough to call within a month.`;
  }
  // Default: portfolio overview.
  const recent = videos.filter((v) => v.publishedAt && v.publishedAt > daysAgo(30));
  const avgCtr = recent.reduce((a, v) => a + (v.metrics?.ctr ?? 0), 0) / Math.max(recent.length, 1);
  return `Here's the portfolio picture right now:\n\n- **${recent.length} videos** published in the last 30 days, averaging **${fmt(avgCtr)}% CTR**.\n- Strongest signal: story cold opens at ~1.35x baseline CTR (validated, n=14).\n- Biggest risk: Sales Psychology's CTR slide — cause identified (statistic hooks), fix proposed.\n- Biggest opportunity: forbidden-knowledge framing on Myth & Meaning (competitor-validated, test in flight).\n\nAsk me about hooks, structures, CTR changes, underperforming topics, or what to test next — I'll answer from the actual data.`;
}

// ---------------------------------------------------------------------------
// Provider implementation
// ---------------------------------------------------------------------------
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
const delay = (ms = 120) => new Promise((r) => setTimeout(r, ms));

export class DemoProvider implements DataProvider {
  readonly isDemo = true;

  async getCurrentUser() { return clone(currentUser); }
  async getOrganization() { return clone(org); }
  async listMembers() { return clone(members); }

  async listInvites() { return clone(invites.filter((i) => !i.acceptedAt)); }

  async createInvite(input: InviteInput) {
    const invite: Invite = {
      id: runtimeId("inv"),
      code: randomCode(),
      email: input.email,
      role: input.role,
      expiresAt: new Date(Date.now() + 14 * 86_400_000).toISOString(),
      createdAt: new Date().toISOString(),
    };
    invites.unshift(invite);
    persist();
    return clone(invite);
  }

  async revokeInvite(id: string) {
    const i = invites.findIndex((x) => x.id === id);
    if (i >= 0) invites.splice(i, 1);
    persist();
  }

  async listChannels() { await delay(); return clone(channels); }
  async getChannel(id: string) {
    return clone(channels.find((c) => c.id === id) ?? null);
  }

  async createChannel(input: ChannelInput) {
    const row: Channel = {
      id: runtimeId("ch"),
      organizationId: org.id,
      ownerId: currentUser.id,
      ownerName: currentUser.displayName,
      goals: [],
      createdAt: new Date().toISOString(),
      ...input,
    };
    channels.push(row);
    persist();
    return clone(row);
  }

  async updateChannel(id: string, patch: Partial<ChannelInput>) {
    const ch = channels.find((c) => c.id === id);
    if (!ch) throw new Error("channel not found");
    Object.assign(ch, patch);
    persist();
    return clone(ch);
  }

  async listVideos(filter?: { channelId?: string }) {
    await delay();
    const rows = filter?.channelId
      ? videos.filter((v) => v.channelId === filter.channelId)
      : videos;
    return clone(rows.map(({ snapshots: _snapshots, ...v }) => v));
  }

  async getVideo(id: string): Promise<VideoWithHistory | null> {
    return clone(videos.find((v) => v.id === id) ?? null);
  }

  async createVideo(input: VideoInput, metrics?: VideoMetricsInput) {
    const snapshot: VideoMetrics | undefined = metrics
      ? { capturedAt: new Date().toISOString(), ...metrics }
      : undefined;
    const row: VideoRow = {
      id: runtimeId("vid"),
      ...input,
      metrics: snapshot,
      snapshots: snapshot ? [snapshot] : [],
      createdAt: new Date().toISOString(),
    };
    videos.unshift(row);
    persist();
    const { snapshots: _snapshots, ...video } = row;
    return clone(video);
  }

  async addVideoSnapshot(videoId: string, metrics: VideoMetricsInput) {
    const v = videos.find((x) => x.id === videoId);
    if (!v) throw new Error("video not found");
    const snap: VideoMetrics = { capturedAt: new Date().toISOString(), ...metrics };
    v.snapshots.push(snap);
    v.metrics = snap;
    persist();
  }

  async shareBrief(): Promise<string> {
    throw new Error(
      "Share links need the live backend — in demo mode use Copy and paste the brief directly.",
    );
  }

  async connectYouTubeUrl(): Promise<string> {
    throw new Error(
      "Connecting YouTube runs on your live backend. Add the Google OAuth secrets in Supabase, then use this on the deployed site.",
    );
  }

  async getVideoAnalytics(videoId: string): Promise<VideoAnalytics> {
    await delay(700);
    const v = videos.find((x) => x.id === videoId);
    if (!v) throw new Error("video not found");
    const m = v.metrics;
    // Seeded-but-deterministic-ish retention: sharp intro drop, then a gentle
    // decay, shaped by how well the video actually retained overall.
    const overall = (m?.avgPercentViewed ?? 42) / 100;
    const retention: RetentionPoint[] = [];
    for (let pct = 0; pct <= 100; pct += 5) {
      const intro = pct < 10 ? 1 - pct * 0.035 : 0.7;          // ~30% intro drop
      const decay = Math.exp(-(pct / 100) * (1.4 - overall));   // better videos flatten
      const audience = Math.max(8, Math.min(100, 100 * intro * decay));
      retention.push({ pct, audience: Math.round(audience) });
    }
    const totalViews = m?.views ?? 10000;
    const mix: Array<[string, number]> = [
      ["Browse features", 0.38], ["Suggested videos", 0.29], ["YouTube search", 0.16],
      ["External", 0.09], ["Channel pages", 0.05], ["Other", 0.03],
    ];
    const trafficSources: TrafficSource[] = mix.map(([source, share]) => ({
      source, views: Math.round(totalViews * share),
    }));

    return {
      videoId,
      retention,
      trafficSources,
      impressions: m?.impressions ?? Math.round(totalViews / ((m?.ctr ?? 6) / 100)),
      ctr: m?.ctr ?? 6,
      views: totalViews,
      avgPercentViewed: m?.avgPercentViewed ?? 42,
      source: "simulated",
    };
  }

  async listCompetitorChannels() { return clone(competitorChannels); }

  async listCompetitorVideos(filter?: { onlyOutliers?: boolean }) {
    await delay();
    const rows = filter?.onlyOutliers
      ? competitorVideos.filter((v) => v.isOutlier)
      : competitorVideos;
    return clone(
      [...rows].sort((a, b) => (b.viewsPerDay ?? 0) - (a.viewsPerDay ?? 0)),
    );
  }

  async createCompetitorVideo(input: CompetitorVideoInput) {
    const { isOutlier, outlierScore, ...rest } = input;
    const row: CompetitorVideo = {
      id: runtimeId("cv"),
      competitorChannelName: competitorChannels.find((c) => c.id === input.competitorChannelId)?.name,
      isOutlier: isOutlier ?? false,
      outlierScore,
      ...rest,
    };
    competitorVideos.unshift(row);
    persist();
    return clone(row);
  }

  async createCompetitorChannel(input: CompetitorChannelInput) {
    const row: CompetitorChannel = {
      id: runtimeId("cc"),
      organizationId: org.id,
      name: input.name,
      url: input.url,
      niche: input.niche,
      notes: input.notes,
    };
    competitorChannels.push(row);
    persist();
    return clone(row);
  }

  async updateCompetitorChannel(id: string, patch: Partial<CompetitorChannel>) {
    const chan = competitorChannels.find((c) => c.id === id);
    if (!chan) throw new Error("Competitor channel not found");
    Object.assign(chan, patch);
    persist();
    return clone(chan);
  }

  async scanCompetitorChannel(channelId: string): Promise<CompetitorScanResult> {
    await delay(1400);
    const chan = competitorChannels.find((c) => c.id === channelId);
    if (!chan) throw new Error("Competitor channel not found");
    const existing = competitorVideos.filter((v) => v.competitorChannelId === channelId);
    const seenTitles = new Set(existing.map((v) => v.title.toLowerCase()));
    const fresh = simulateChannelScan(chan, seenTitles);
    for (const row of fresh) {
      competitorVideos.unshift({
        id: runtimeId("cv"),
        competitorChannelName: chan.name,
        isOutlier: row.isOutlier ?? false,
        ...row,
      });
    }
    const all = competitorVideos.filter((v) => v.competitorChannelId === channelId);
    // Live scans pull the niche from YouTube's own channel categorization when
    // none was set by hand; the demo mirrors that with a plausible topic.
    const simulatedNiche = !chan.niche?.trim()
      ? ["Society · Knowledge", "Entertainment", "Lifestyle · Knowledge"][
          chan.name.length % 3
        ]
      : undefined;
    Object.assign(chan, aggregateChannelStats(all), {
      subscriberCount: chan.subscriberCount ?? Math.round(between(80_000, 2_400_000)),
      ...(simulatedNiche ? { niche: simulatedNiche } : {}),
      lastScannedAt: new Date().toISOString(),
    });
    persist();
    return {
      channelId,
      channelName: chan.name,
      created: fresh.length,
      totalTracked: all.length,
      outliers: fresh.filter((f) => f.isOutlier).length,
      simulated: true,
    };
  }

  async generateTeardown(
    competitorVideoId: string,
    targetChannelId?: string,
  ): Promise<CompetitorTeardown> {
    await delay(1100); // simulate the model thinking
    const v = competitorVideos.find((cv) => cv.id === competitorVideoId);
    if (!v) throw new Error("Competitor video not found");
    const channel =
      channels.find((c) => c.id === targetChannelId) ?? channels[0];

    const hook = hz(v.hook ?? "story cold open");
    const structure = hz(v.storyStructure ?? "rise and fall");
    const topic = v.topic ?? v.title;
    const teardown: CompetitorTeardown = {
      whyItWorked:
        `"${v.title}" broke out (${v.viewsPerDay ? Math.round(v.viewsPerDay).toLocaleString() + "/day, " : ""}` +
        `z=${v.outlierScore ?? "high"}) on a ${hook.toLowerCase()} paired with a ${structure.toLowerCase()} ` +
        `structure. The packaging promises a concrete payoff up front and the first 30 seconds drop the ` +
        `viewer inside a single scene rather than explaining context.`,
      observations:
        `The demand signal is the mechanism, not the topic: the ${hook.toLowerCase()} + a title that implies ` +
        `hidden stakes is what travels. Its retention almost certainly holds because the ${structure.toLowerCase()} ` +
        `keeps a question open. That transfers to ${channel.name}'s niche without copying the subject.`,
      transferableMoves: [
        `Open cold on a single vivid moment — no "in this video".`,
        `Package the promise as a payoff or a stake, echoing the ${hook.toLowerCase()}.`,
        `Hold one question open across the video using a ${structure.toLowerCase()} spine.`,
      ],
      idea: {
        title: `${channel.name}: our take on "${topic}" — ${hook} angle`,
        description:
          `Adapt the mechanism behind "${v.title}" for ${channel.name}. Find a ${channel.niche ?? "niche"} ` +
          `story where a ${hook.toLowerCase()} fits honestly, then structure it as a ${structure.toLowerCase()}. ` +
          `Lead with the single most concrete scene; make the title imply stakes without overclaiming.`,
        tags: [v.hook, v.storyStructure, "competitor_teardown"].filter(Boolean) as string[],
      },
    };

    // Persist the analysis onto the video so it sticks in the table — and the
    // full teardown, which the learning loop synthesizes every 20 teardowns.
    v.whyItWorked = teardown.whyItWorked;
    v.aiObservations = teardown.observations;
    v.teardown = teardown;
    v.teardownAt = new Date().toISOString();
    persist();
    return clone(teardown);
  }

  async listIdeas() { await delay(); return clone(ideas); }

  async createIdea(input: IdeaInput) {
    const row: Idea = {
      id: runtimeId("idea"), organizationId: org.id,
      createdAt: new Date().toISOString(), ...input,
    };
    ideas.unshift(row);
    persist();
    return clone(row);
  }

  async updateIdea(id: string, patch: Partial<IdeaInput>) {
    const idea = ideas.find((i) => i.id === id);
    if (!idea) throw new Error("idea not found");
    Object.assign(idea, patch);
    persist();
    return clone(idea);
  }

  // Demo mirror of the ai-ideas edge function: derives ideas from the seeded
  // competitor outliers (proven mechanisms) applied to the channel, avoiding
  // topics already covered. Live mode calls OpenAI instead.
  async generateIdeas(channelId?: string, count = 6): Promise<GeneratedIdea[]> {
    await delay(900);
    const covered = new Set(
      videos
        .filter((v) => !channelId || v.channelId === channelId)
        .map((v) => (v.topic ?? v.title).toLowerCase()),
    );
    // Never pitch what's already on the slate — in-flight docs and studio
    // projects count as covered (mirrors the live prompt's rule).
    for (const prod of productions) {
      if (prod.stage !== "published") covered.add((prod.topic ?? prod.title).toLowerCase());
    }
    for (const proj of contentProjects) {
      if (proj.status !== "done") covered.add((proj.selectedTitle ?? proj.topic).toLowerCase());
    }
    const targetChannels = channelId
      ? channels.filter((c) => c.id === channelId)
      : channels;
    const bestHook =
      groupStat(videos, (v) => v.hookType, (v) => v.metrics?.ctr)[0]?.key ??
      "story_cold_open";

    // Ideas name REAL subjects — actual founders, companies, documented
    // events — never template angles. Each entry: [title, real story beat].
    const ANGLES: Record<string, Array<[string, string]>> = {
      ch_biz: [
        ["How Luxottica quietly bought every glasses brand you know", "One Italian company owns Ray-Ban, Oakley, and the stores that sell them — and prices moved accordingly."],
        ["De Beers: the company that invented the engagement ring", "A 1938 ad campaign manufactured a 'tradition' and controlled diamond supply for a century."],
        ["Bernard Arnault: the hostile takeover that built LVMH", "The 1988-89 battle for control of Louis Vuitton Moët Hennessy made 'the wolf in cashmere'."],
        ["The day Howard Schultz lost Starbucks — twice", "Schultz left in 2000, watched the 2007-08 collapse, and came back to close 600 stores."],
      ],
      ch_rel: [
        ["The 40-year fight to publish the Dead Sea Scrolls", "A tiny committee controlled access for decades until a 1991 leak broke the monopoly."],
        ["The Gospel of Judas: the betrayal text that survived", "Condemned in 180 AD, lost, then surfaced in the 1970s and rotted in a bank box before restoration."],
        ["Akhenaten: the pharaoh Egypt tried to erase", "He replaced the gods with one — and his monuments were dismantled within a generation."],
        ["What actually burned at the Library of Alexandria", "The single-fire story is a myth; the real decline took centuries of budget cuts and politics."],
      ],
      ch_sales: [
        ["Joe Girard: the mailman-turned-salesman who sold 13,001 cars", "Guinness's 'greatest salesman' sent 13 greeting cards a year to every customer."],
        ["The real 'straight line': what Jordan Belfort actually taught", "Behind the movie: the script, the tonality drills, and why the SEC ended it."],
        ["How Zig Ziglar sold cookware door-to-door into a legend", "Before the stages: the routes, the demos, and the close he never changed."],
        ["The Kirby vacuum system: door-to-door's most extreme school", "In-home demos engineered to last two hours — and what that taught about commitment."],
      ],
    };

    const out: GeneratedIdea[] = [];
    const outliers = [...competitorVideos].filter((c) => c.isOutlier);
    let oi = 0;
    for (const ch of targetChannels) {
      const nicheWord = (ch.niche ?? "").split(/[ ,]/)[0] || "the niche";
      const angles = (
        ANGLES[ch.id] ??
        ([[`A named ${nicheWord} story to research`, "Pick a real founder or event in this niche."]] as Array<[string, string]>)
      ).filter(([a]) => !covered.has(a.toLowerCase()));
      const perChannel = Math.max(2, Math.ceil(count / targetChannels.length));
      for (let k = 0; k < perChannel && k < angles.length; k++) {
        const seed = outliers[oi++ % Math.max(outliers.length, 1)];
        const mechanism = seed?.whyItWorked ?? "a proven curiosity mechanism";
        // Demo relevance: outlier-backed angles score higher; z-score adds
        // confidence. Mirrors the live rubric's "demand evidence first".
        const relevanceScore = Math.min(
          9,
          (seed ? 7 : 6) + (seed?.outlierScore && seed.outlierScore >= 3 ? 1 : 0) + (k === 0 ? 1 : 0),
        );
        const [angleTitle, storyBeat] = angles[k];
        out.push({
          title: angleTitle,
          description: `Story beat: ${storyBeat}`,
          rationale: `Modeled on a competitor outlier${seed ? ` ("${seed.title}")` : ""}: ${mechanism} Open with a ${bestHook.replace(/_/g, " ")} — your highest-CTR hook type.`,
          suggestedHook: bestHook,
          tags: [nicheWord.toLowerCase(), "competitor_validated"],
          relevanceScore,
          whyRelevant: seed
            ? `Demand is proven: "${seed.title}" is a statistical outlier (z=${seed.outlierScore ?? "high"}) in your tracked niche.`
            : "Fits the channel niche and your best hook type, but no outlier backs it yet — validate before producing.",
          personaFit: `${ch.name}'s core viewer`,
        });
        if (out.length >= count) break;
      }
      if (out.length >= count) break;
    }
    out.sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0));
    return clone(out.slice(0, count));
  }

  async listProductions() {
    await delay();
    return clone(productions);
  }

  async getProduction(id: string) {
    return clone(productions.find((p) => p.id === id) ?? null);
  }

  async createProduction(input: ProductionInput) {
    const now = new Date().toISOString();
    const row: Production = {
      id: runtimeId("prod"),
      organizationId: org.id,
      stage: "scripting",
      titleCandidates: [],
      referenceLinks: [],
      assetLinks: [],
      checklists: {},
      voStatus: "not_started",
      createdAt: now,
      updatedAt: now,
      ...input,
      format: input.format ?? "long_form",
    };
    productions.unshift(row);
    persist();
    return clone(row);
  }

  async updateProduction(id: string, patch: ProductionPatch) {
    const prod = productions.find((p) => p.id === id);
    if (!prod) throw new Error("production not found");
    if (
      patch.stage &&
      (patch.stage === "scheduled" || patch.stage === "published") &&
      patch.stage !== prod.stage
    ) {
      const me = members.find((m) => m.id === currentUser.id);
      if (me && me.role !== "owner" && me.role !== "admin") {
        throw new Error(`Only an owner or admin can move a video to ${patch.stage}`);
      }
    }
    Object.assign(prod, patch, { updatedAt: new Date().toISOString() });
    persist();
    return clone(prod);
  }

  async draftProduction(production: Production): Promise<DraftResult> {
    await delay(700);
    return draftFromTemplates(production, videos);
  }

  async deriveShorts(productionId: string, count: number): Promise<Production[]> {
    await delay(900);
    const source = productions.find((p) => p.id === productionId);
    if (!source) throw new Error("production not found");
    const shorts = shortsFromScript(source, count);
    const now = new Date().toISOString();
    const created = shorts.map((s): Production => ({
      id: runtimeId("prod"),
      organizationId: org.id,
      channelId: source.channelId,
      title: s.title,
      stage: "scripting",
      format: "short",
      topic: source.topic,
      assigneeId: source.assigneeId ?? currentUser.id,
      hookText: s.hook,
      scriptBody: s.script,
      notes: [
        s.onScreenText ? `On-screen text: ${s.onScreenText}` : "",
        `Derived from: ${source.title}`,
      ].filter(Boolean).join("\n"),
      titleCandidates: [],
      referenceLinks: [],
      assetLinks: [],
      checklists: {},
      voStatus: "not_started",
      createdAt: now,
      updatedAt: now,
    }));
    productions.unshift(...created);
    activity.unshift({
      id: runtimeId("act"),
      actorName: currentUser.displayName,
      action: `derived ${created.length} short${created.length > 1 ? "s" : ""} from`,
      entityType: "production",
      entityLabel: source.title,
      createdAt: now,
    });
    persist();
    return clone(created);
  }

  async searchBroll(query: string): Promise<BuilderBrollItem[]> {
    await delay(700); // simulate the search
    // Demo mode has no Pexels key — deterministic placeholder footage keyed to
    // the query so the builder workflow is fully explorable with zero setup.
    const slug = query.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 32) || "broll";
    return Array.from({ length: 6 }, (_, i) => ({
      url: `https://picsum.photos/seed/${slug}-${i}/1280/720`,
      thumb: `https://picsum.photos/seed/${slug}-${i}/320/180`,
      kind: "image" as const,
      source: "pexels" as const,
      credit: "Simulated (demo) — live mode searches Pexels",
    }));
  }

  async publishToYouTube(productionId: string) {
    await delay(1600); // simulate the upload
    await this.publishProduction(productionId); // owner check, creates linked video
    const prod = productions.find((p) => p.id === productionId);
    const video = videos.find((v) => v.id === prod?.linkedVideoId);
    const fakeId = `demo${Math.random().toString(36).slice(2, 10)}`;
    const url = `https://www.youtube.com/watch?v=${fakeId}`;
    if (video) video.url = url;
    persist();
    return { videoUrl: url, simulated: true };
  }

  async publishProduction(id: string) {
    const prod = productions.find((p) => p.id === id);
    if (!prod) throw new Error("production not found");
    const me = members.find((m) => m.id === currentUser.id);
    if (me && me.role !== "owner" && me.role !== "admin") {
      throw new Error("Only an owner or admin can publish");
    }
    if (!prod.linkedVideoId) {
      const starred =
        prod.titleCandidates.find((t) => t.starred)?.text ?? prod.title;
      const video = await this.createVideo({
        channelId: prod.channelId,
        title: starred,
        topic: prod.topic,
        publishedAt: new Date().toISOString(),
        format: prod.format ?? "long_form",
        manualNotes: prod.goal ? `Goal: ${prod.goal}` : undefined,
      });
      prod.linkedVideoId = video.id;
    }
    prod.stage = "published";
    prod.updatedAt = new Date().toISOString();
    activity.unshift({
      id: runtimeId("act"),
      actorName: currentUser.displayName,
      action: "published",
      entityType: "video",
      entityLabel: prod.title,
      createdAt: prod.updatedAt,
    });
    persist();
    return clone(prod);
  }

  async listSops() {
    await delay();
    return clone(sops.map(({ versions: _versions, ...s }) => s));
  }

  async getSop(id: string): Promise<SopWithHistory | null> {
    return clone(sops.find((s) => s.id === id) ?? null);
  }

  async createSop(input: SopInput) {
    const id = runtimeId("sop");
    const version: SopVersion = {
      id: runtimeId("sopv"), sopId: id, versionNumber: 1,
      purpose: input.purpose, whenToUse: input.whenToUse,
      steps: input.steps, examples: input.examples,
      source: "human", createdAt: new Date().toISOString(),
    };
    const row: SopRow = {
      id, organizationId: org.id, channelId: input.channelId,
      title: input.title, category: input.category, status: "active",
      reviewFrequencyDays: 30,
      nextReviewAt: new Date(NOW + 30 * DAY).toISOString(),
      currentVersion: version, linkedVideoIds: [], linkedCompetitorVideoIds: [],
      createdAt: new Date().toISOString(), versions: [version],
    };
    sops.unshift(row);
    persist();
    const { versions: _versions, ...sop } = row;
    return clone(sop);
  }

  async addSopVersion(sopId: string, input: SopVersionInput) {
    const sop = sops.find((s) => s.id === sopId);
    if (!sop) throw new Error("SOP not found");
    const version: SopVersion = {
      id: runtimeId("sopv"), sopId,
      versionNumber: (sop.versions[0]?.versionNumber ?? 0) + 1,
      purpose: input.purpose, whenToUse: input.whenToUse, steps: input.steps,
      examples: input.examples, changeSummary: input.changeSummary,
      source: "human", createdAt: new Date().toISOString(),
    };
    sop.versions.unshift(version); // append-only: prior versions untouched
    sop.currentVersion = version;
    sop.nextReviewAt = new Date(NOW + sop.reviewFrequencyDays * DAY).toISOString();
    persist();
    return clone(sop);
  }

  async listInsights() { await delay(); return clone(insights); }
  async listRecommendations() { await delay(); return clone(recommendations); }

  async setRecommendationStatus(id: string, status: RecommendationStatus) {
    const rec = recommendations.find((r) => r.id === id);
    if (rec) {
      rec.status = status;
      persist();
    }
  }

  async approveRecommendation(id: string): Promise<SopWithHistory> {
    const rec = recommendations.find((r) => r.id === id);
    if (!rec) throw new Error("Recommendation not found");
    const pc = rec.proposedChange;
    if (!pc) throw new Error("This recommendation has no proposed SOP change to apply");

    let sop = pc.sopId ? sops.find((s) => s.id === pc.sopId) : undefined;
    if (sop) {
      // Append a new version — prior versions are never touched (append-only).
      const version: SopVersion = {
        id: runtimeId("sopv"), sopId: sop.id,
        versionNumber: (sop.versions[0]?.versionNumber ?? 0) + 1,
        purpose: pc.purpose, whenToUse: pc.whenToUse, steps: pc.steps,
        examples: pc.examples, changeSummary: pc.changeSummary,
        source: "ai", createdAt: new Date().toISOString(),
      };
      sop.versions.unshift(version);
      sop.currentVersion = version;
      sop.nextReviewAt = new Date(NOW + sop.reviewFrequencyDays * DAY).toISOString();
      rec.proposedSopVersionId = version.id;
    } else {
      // No target SOP — the approved change becomes a brand-new SOP.
      const newId = runtimeId("sop");
      const version: SopVersion = {
        id: runtimeId("sopv"), sopId: newId, versionNumber: 1,
        purpose: pc.purpose, whenToUse: pc.whenToUse, steps: pc.steps,
        examples: pc.examples, changeSummary: pc.changeSummary,
        source: "ai", createdAt: new Date().toISOString(),
      };
      sop = {
        id: newId, organizationId: org.id, title: pc.sopTitle,
        category: pc.category, status: "active", reviewFrequencyDays: 30,
        nextReviewAt: new Date(NOW + 30 * DAY).toISOString(),
        currentVersion: version, linkedVideoIds: [], linkedCompetitorVideoIds: [],
        createdAt: new Date().toISOString(), versions: [version],
      };
      sops.unshift(sop);
      rec.sopId = newId;
      rec.proposedSopVersionId = version.id;
    }
    rec.status = "accepted";
    persist();
    return clone(sop);
  }

  async listReports() { await delay(); return clone(reports); }
  async getReport(id: string) {
    return clone(reports.find((r) => r.id === id) ?? null);
  }

  async generateReport(input: {
    type: Report["type"]; channelId?: string;
    periodStart: string; periodEnd: string;
  }): Promise<Report> {
    await delay(900); // simulate generation
    const channel = channels.find((c) => c.id === input.channelId);
    const row: Report = {
      id: runtimeId("rep"), organizationId: org.id, channelId: input.channelId,
      type: input.type,
      title: `${input.type.replace(/_/g, " ")} report — ${channel?.name ?? "all channels"}`,
      periodStart: input.periodStart, periodEnd: input.periodEnd,
      source: "ai", createdAt: new Date().toISOString(),
      contentMd: `# ${input.type.replace(/_/g, " ")} report — ${channel?.name ?? "all channels"}\n\n## Summary\nDemo mode generates reports locally. Connect Supabase + the Claude API (see README) and this report is written by the generate-report edge function from your real data.\n\n## What worked\n- Story cold opens continue to lead CTR (~1.35x baseline).\n\n## What didn't\n- Statistic-led hooks remain the weakest opener.\n\n## Recommended focus for next period\nFollow the open recommendations in the AI Coach tab.`,
    };
    reports.unshift(row);
    persist();
    return clone(row);
  }

  async listNotifications() { await delay(); return clone(notifications); }

  async markNotificationRead(id: string) {
    const n = notifications.find((x) => x.id === id);
    if (n) {
      n.readAt = new Date().toISOString();
      persist();
    }
  }

  async listComments(entityType: CommentEntityType, entityId: string) {
    await delay();
    return clone(
      comments
        .filter((c) => c.entityType === entityType && c.entityId === entityId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    );
  }

  async addComment(input: CommentInput) {
    const comment: Comment = {
      id: runtimeId("cmt"),
      entityType: input.entityType,
      entityId: input.entityId,
      author: clone(currentUser),
      body: input.body,
      mentions: input.mentions ?? [],
      createdAt: new Date().toISOString(),
    };
    comments.push(comment);
    // Fan out a notification to each mentioned teammate.
    for (const userId of comment.mentions) {
      if (userId === currentUser.id) continue;
      notifications.unshift({
        id: runtimeId("ntf"), organizationId: org.id, userId,
        type: "system",
        title: `${currentUser.displayName} mentioned you`,
        body: comment.body.slice(0, 140),
        entityType: input.entityType, entityId: input.entityId,
        createdAt: comment.createdAt,
      });
    }
    persist();
    return clone(comment);
  }

  async deleteComment(id: string) {
    const i = comments.findIndex((c) => c.id === id);
    if (i >= 0) comments.splice(i, 1);
    persist();
  }

  async listTasks() {
    await delay();
    return clone(tasks);
  }

  async createTask(input: TaskInput): Promise<Task> {
    const assignee = members.find((m) => m.id === input.assigneeId);
    const task: Task = {
      id: runtimeId("tsk"), organizationId: org.id,
      title: input.title, notes: input.notes,
      status: input.status ?? "todo",
      assigneeId: input.assigneeId, assigneeName: assignee?.displayName,
      dueAt: input.dueAt, createdBy: currentUser.id,
      createdAt: new Date().toISOString(),
    };
    tasks.unshift(task);
    persist();
    return clone(task);
  }

  async updateTask(id: string, patch: Partial<TaskInput>): Promise<Task> {
    const task = tasks.find((t) => t.id === id);
    if (!task) throw new Error("Task not found");
    if (patch.title !== undefined) task.title = patch.title;
    if (patch.notes !== undefined) task.notes = patch.notes;
    if (patch.status !== undefined) task.status = patch.status;
    if (patch.dueAt !== undefined) task.dueAt = patch.dueAt;
    if (patch.assigneeId !== undefined) {
      task.assigneeId = patch.assigneeId;
      task.assigneeName = members.find((m) => m.id === patch.assigneeId)?.displayName;
    }
    persist();
    return clone(task);
  }

  async deleteTask(id: string) {
    const i = tasks.findIndex((t) => t.id === id);
    if (i >= 0) tasks.splice(i, 1);
    persist();
  }

  async getDiscordConfig(): Promise<DiscordConfig | null> {
    try {
      const raw = localStorage.getItem("big3.discord");
      return raw ? (JSON.parse(raw) as DiscordConfig) : null;
    } catch {
      return null;
    }
  }

  async saveDiscordConfig(config: DiscordConfig) {
    localStorage.setItem("big3.discord", JSON.stringify(config));
  }

  async deleteChannel(id: string) {
    const i = channels.findIndex((c) => c.id === id);
    if (i >= 0) channels.splice(i, 1);
    // A channel's videos go with it (matches the SQL cascade).
    for (let v = videos.length - 1; v >= 0; v--) {
      if (videos[v].channelId === id) videos.splice(v, 1);
    }
    persist();
  }

  async deleteCompetitorChannel(id: string) {
    const i = competitorChannels.findIndex((c) => c.id === id);
    if (i >= 0) competitorChannels.splice(i, 1);
    for (let v = competitorVideos.length - 1; v >= 0; v--) {
      if (competitorVideos[v].competitorChannelId === id) competitorVideos.splice(v, 1);
    }
    persist();
  }

  async deleteProduction(id: string) {
    const i = productions.findIndex((p) => p.id === id);
    if (i >= 0) productions.splice(i, 1);
    persist();
  }

  async listActivity() { return clone(activity); }

  async askCoach(message: string, _history: ChatMessage[]): Promise<CoachReply> {
    await delay(700);
    return { conversationId: "demo", answer: demoCoachAnswer(message) };
  }

  // Client-side mirror of the learning-loop edge function: same statistics,
  // computed over the demo dataset, so the loop is tangible without a backend.
  async runLearningLoop() {
    await delay(1100);
    const counts = { insights: 0, recommendations: 0, notifications: 0 };
    const nowIso = new Date().toISOString();

    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    const sd = (xs: number[]) => {
      const m = mean(xs);
      return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
    };
    const tStat = (a: number[], b: number[]) => {
      const va = sd(a) ** 2 / a.length;
      const vb = sd(b) ** 2 / b.length;
      return va + vb === 0 ? 0 : (mean(a) - mean(b)) / Math.sqrt(va + vb);
    };

    const addInsight = (ins: Omit<AiInsight, "id" | "organizationId" | "createdAt">) => {
      insights.unshift({
        id: runtimeId("ins"), organizationId: org.id, createdAt: nowIso, ...ins,
      });
      counts.insights++;
    };
    const notify = (type: AppNotification["type"], title: string, body: string) => {
      notifications.unshift({
        id: runtimeId("ntf"), organizationId: org.id, type, title, body, createdAt: nowIso,
      });
      counts.notifications++;
    };

    // 1. Metric shifts per channel: last 4 videos vs. the prior baseline.
    for (const ch of channels) {
      const series = videos
        .filter((v) => v.channelId === ch.id && v.metrics?.ctr != null)
        .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""))
        .map((v) => v.metrics!.ctr!) as number[];
      if (series.length < 8) continue;
      const recent = series.slice(0, 4);
      const baseline = series.slice(4);
      const t = tStat(recent, baseline);
      if (Math.abs(t) >= 2) {
        const dir = t > 0 ? "up" : "down";
        addInsight({
          channelId: ch.id,
          kind: "anomaly",
          title: `${ch.name}: CTR trending ${dir}`,
          body: `Last 4 uploads average ${mean(recent).toFixed(1)}% CTR vs ${mean(baseline).toFixed(1)}% baseline (t=${t.toFixed(1)}, n=${recent.length}/${baseline.length}).`,
          confidence: Math.min(0.9, 0.5 + Math.abs(t) / 10),
        });
        notify(
          dir === "down" ? "ctr_drop" : "retention_improved",
          `CTR trending ${dir} on ${ch.name}`,
          `Recent mean ${mean(recent).toFixed(1)}% vs baseline ${mean(baseline).toFixed(1)}% (t=${t.toFixed(1)}).`,
        );
      }
    }

    // 2. Hook-type pattern across the org.
    const hookStats = groupStat(videos, (v) => v.hookType, (v) => v.metrics?.ctr);
    if (hookStats.length >= 2) {
      const best = hookStats[0];
      const worst = hookStats[hookStats.length - 1];
      addInsight({
        kind: "pattern",
        title: `Hook check: "${best.key.replace(/_/g, " ")}" still leads at ${best.mean.toFixed(1)}% CTR`,
        body: `Across ${videos.length} videos, ${best.key.replace(/_/g, " ")} averages ${best.mean.toFixed(1)}% CTR (n=${best.n}) vs ${worst.mean.toFixed(1)}% for ${worst.key.replace(/_/g, " ")} (n=${worst.n}). Ranking is stable since the last run.`,
        confidence: 0.85,
      });

      // 3. Recommendation if any channel ignored the best hook recently.
      for (const ch of channels) {
        const lastFour = videos
          .filter((v) => v.channelId === ch.id)
          .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""))
          .slice(0, 4);
        const weakCount = lastFour.filter((v) => v.hookType === worst.key).length;
        const alreadyOpen = recommendations.some(
          (r) => r.status === "proposed" && r.title.includes(ch.name),
        );
        if (weakCount >= 2 && !alreadyOpen) {
          recommendations.unshift({
            id: runtimeId("rec"), organizationId: org.id, sopId: "sop_hooks",
            title: `${ch.name}: replace ${worst.key.replace(/_/g, " ")} hooks`,
            rationale: `${weakCount} of the last 4 uploads used "${worst.key.replace(/_/g, " ")}" — the weakest hook org-wide (${worst.mean.toFixed(1)}% vs ${best.mean.toFixed(1)}% for ${best.key.replace(/_/g, " ")}). Re-apply the Hook Writing SOP default on the next 3 uploads, then re-measure.`,
            status: "proposed", createdAt: nowIso,
          });
          notify(
            "ai_recommendation",
            `New recommendation for ${ch.name}`,
            `Replace ${worst.key.replace(/_/g, " ")} hooks on upcoming uploads.`,
          );
          counts.recommendations++;
        }
      }
    }

    // 4. Teardown synthesis: every 20 banked teardowns, distill the winning
    // mechanisms into a playbook insight + an SOP change proposal (approval
    // queue — a human closes the loop). Same gate as the live backend.
    const torn = competitorVideos.filter((v) => v.teardown);
    const SYNTHESIS_BATCH = 20;
    const lastSynth = insights
      .map((i) => /from (\d+) teardowns/.exec(i.title)?.[1])
      .filter(Boolean)
      .map(Number)
      .sort((a, b) => b - a)[0] ?? 0;
    if (
      torn.length >= SYNTHESIS_BATCH &&
      Math.floor(torn.length / SYNTHESIS_BATCH) > Math.floor(lastSynth / SYNTHESIS_BATCH)
    ) {
      const tally = (key: (v: CompetitorVideo) => string | undefined) => {
        const m = new Map<string, number>();
        for (const v of torn) {
          const k = key(v);
          if (k) m.set(k, (m.get(k) ?? 0) + 1);
        }
        return [...m.entries()].sort((a, b) => b[1] - a[1]);
      };
      const topHooks = tally((v) => v.hook).slice(0, 2);
      const topStructures = tally((v) => v.storyStructure).slice(0, 2);
      const moveCounts = new Map<string, number>();
      for (const v of torn) {
        for (const move of v.teardown?.transferableMoves ?? []) {
          moveCounts.set(move, (moveCounts.get(move) ?? 0) + 1);
        }
      }
      const topMoves = [...moveCounts.entries()]
        .sort((a, b) => b[1] - a[1]).slice(0, 5).map(([m]) => m);

      addInsight({
        kind: "competitor",
        title: `Competitor playbook updated (from ${torn.length} teardowns)`,
        body:
          `Across ${torn.length} teardowns the winning standpoints are: hooks ${topHooks
            .map(([k, n]) => `${hz(k).toLowerCase()} (${n}×)`).join(", ")}; structures ${topStructures
            .map(([k, n]) => `${hz(k).toLowerCase()} (${n}×)`).join(", ")}. ` +
          `Most repeated transferable moves: ${topMoves.slice(0, 3).join(" · ")}. ` +
          `Every AI surface (coach, drafts, ideas, shorts) is now grounded in this playbook.`,
        confidence: Math.min(0.9, 0.5 + torn.length / 100),
      });
      recommendations.unshift({
        id: runtimeId("rec"), organizationId: org.id, sopId: "sop_hooks",
        title: `Fold the competitor playbook into the Hook Writing SOP`,
        rationale:
          `${torn.length} teardowns point the same way: ${topHooks
            .map(([k, n]) => `${hz(k).toLowerCase()} (${n}×)`).join(" and ")} keep winning. ` +
          `Approving updates the SOP with the distilled moves — history preserved, old version kept.`,
        status: "proposed",
        proposedChange: {
          sopId: "sop_hooks",
          sopTitle: "Hook Writing (First 30 Seconds)",
          purpose: "Open every video with the mechanism competitor data proves out.",
          whenToUse: "Every script, before the first draft is called done.",
          steps: topMoves.length
            ? topMoves
            : ["Open cold on a single vivid moment — no context, no 'in this video'."],
          examples: `Distilled from ${torn.length} competitor teardowns on ${new Date().toLocaleDateString()}.`,
          changeSummary: `Playbook synthesis from ${torn.length} teardowns: winning hooks ${topHooks.map(([k]) => hz(k).toLowerCase()).join(", ")}.`,
        },
        createdAt: nowIso,
      });
      counts.recommendations++;
      notify(
        "ai_recommendation",
        "Competitor playbook synthesized",
        `${torn.length} teardowns distilled — an SOP update is waiting for your approval.`,
      );
    }

    activity.unshift({
      id: runtimeId("act"), actorName: "AI Coach", action: "ran the learning loop —",
      entityType: "analysis",
      entityLabel: `${counts.insights} insights, ${counts.recommendations} recommendations`,
      createdAt: nowIso,
    });
    persist();
    return counts;
  }

  // ------------------------------------------------------------------
  // Modern Ambition Content Studio (demo: honest template scaffolds)
  // ------------------------------------------------------------------

  async listContentProjects() {
    await delay();
    return clone(contentProjects);
  }

  async getContentProject(id: string) {
    return clone(contentProjects.find((c) => c.id === id) ?? null);
  }

  async createContentProject(input: ContentProjectInput) {
    const now = new Date().toISOString();
    const row: ContentProject = {
      id: runtimeId("cnt"),
      organizationId: org.id,
      channelId: input.channelId,
      topic: input.topic,
      status: "relevance",
      primaryPersona: input.primaryPersona,
      secondaryPersona: input.secondaryPersona,
      videoLengthMinutes: input.videoLengthMinutes ?? 15,
      thumbnailVariants: [],
      createdAt: now,
      updatedAt: now,
    };
    contentProjects.unshift(row);
    persist();
    return clone(row);
  }

  async updateContentProject(id: string, patch: Partial<ContentProject>) {
    const row = contentProjects.find((c) => c.id === id);
    if (!row) throw new Error("project not found");
    Object.assign(row, patch, { updatedAt: new Date().toISOString() });
    persist();
    return clone(row);
  }

  async deleteContentProject(id: string) {
    const i = contentProjects.findIndex((c) => c.id === id);
    if (i >= 0) contentProjects.splice(i, 1);
    persist();
  }

  async runStudioStep(projectId: string, step: StudioStep): Promise<ContentProject> {
    await delay(900);
    const row = contentProjects.find((c) => c.id === projectId);
    if (!row) throw new Error("project not found");
    switch (step) {
      case "relevance": {
        row.relevance = templateRelevance(row.topic);
        if (!row.primaryPersona) row.primaryPersona = row.relevance.bestPersona;
        row.videoLengthMinutes = row.relevance.recommendedLengthMinutes;
        break;
      }
      case "research":
        row.research = templateResearch(row);
        row.factChecks = mergeFactChecks(row.factChecks, row.research.unverifiedClaims, "research");
        break;
      case "titles":
        row.titleLab = templateTitles(row);
        break;
      case "thumbnails":
        row.thumbnailLab = templateThumbnails(row);
        break;
      case "outline":
        row.outline = templateOutline(row);
        break;
      case "script":
        row.script = templateScript(row);
        row.factChecks = mergeFactChecks(row.factChecks, extractScriptClaims(row.script), "script");
        break;
      case "critique":
        row.critique = templateCritique(row);
        row.factChecks = mergeFactChecks(row.factChecks, row.critique.factCheck, "critique");
        break;
      case "personaReview": {
        const done = contentProjects.filter((c) => c.status === "done").length;
        const total = BUILTIN_PERSONAS.length + aiPersonas.length;
        const unlocked = PERSONA_UNLOCKS.filter((n) => done >= n).length;
        if (total < Math.min(MAX_PERSONAS, BUILTIN_PERSONAS.length + unlocked)) {
          aiPersonas.push({
            id: runtimeId("per"),
            name: total === 3 ? "The Comeback Architect" : "The Legacy Watcher",
            description:
              "[Demo persona proposal — live mode derives it from your accumulated feedback and best-performing videos.]",
            respondsTo: ["Reinvention", "Second acts", "Proving people wrong"],
            source: "ai",
            active: true,
          });
        }
        break;
      }
    }
    row.updatedAt = new Date().toISOString();
    persist();
    return clone(row);
  }

  async listStudioPersonas(): Promise<StudioPersona[]> {
    return clone([...BUILTIN_PERSONAS, ...aiPersonas]);
  }

  async listFeedbackRules() {
    await delay();
    return clone(feedbackRules);
  }

  async addFeedbackRule(input: {
    category: FeedbackRuleCategory;
    rule: string;
    sourceFeedback?: string;
  }) {
    const row: FeedbackRule = {
      id: runtimeId("rule"),
      category: input.category,
      rule: input.rule,
      sourceFeedback: input.sourceFeedback,
      active: true,
      createdAt: new Date().toISOString(),
    };
    feedbackRules.unshift(row);
    persist();
    return clone(row);
  }

  async setFeedbackRuleActive(id: string, active: boolean) {
    const row = feedbackRules.find((r) => r.id === id);
    if (row) {
      row.active = active;
      persist();
    }
  }

  async deleteFeedbackRule(id: string) {
    const i = feedbackRules.findIndex((r) => r.id === id);
    if (i >= 0) feedbackRules.splice(i, 1);
    persist();
  }

  async submitStudioFeedback(projectId: string, feedback: StudioFeedback) {
    await delay(700);
    const row = contentProjects.find((c) => c.id === projectId);
    if (!row) throw new Error("project not found");
    row.feedback = feedback;
    row.status = "done";
    row.updatedAt = new Date().toISOString();

    // Distill each distinct note into a reusable Script Bible rule.
    const notes = feedback.notes
      .split(/\n|;/)
      .map((s) => s.trim())
      .filter(Boolean);
    const created: FeedbackRule[] = [];
    for (const note of notes) {
      const distilled = templateFeedbackRule(note);
      if (feedbackRules.some((r) => r.rule === distilled.rule)) continue;
      const rule: FeedbackRule = {
        id: runtimeId("rule"),
        ...distilled,
        sourceFeedback: note,
        active: true,
        createdAt: new Date().toISOString(),
      };
      feedbackRules.unshift(rule);
      created.push(rule);
    }
    persist();
    // Persona evolution check happens on completion milestones.
    const done = contentProjects.filter((c) => c.status === "done").length;
    if (PERSONA_UNLOCKS.includes(done)) await this.runStudioStep(projectId, "personaReview");
    return { project: clone(row), rules: clone(created) };
  }

  async saveThumbnailVariant(
    projectId: string,
    variant: Omit<ThumbnailVariant, "id" | "createdAt">,
  ) {
    const row = contentProjects.find((c) => c.id === projectId);
    if (!row) throw new Error("project not found");
    if (variant.selected) {
      for (const v of row.thumbnailVariants) v.selected = false;
    }
    row.thumbnailVariants.push({
      ...variant,
      id: runtimeId("thv"),
      createdAt: new Date().toISOString(),
    });
    row.updatedAt = new Date().toISOString();
    persist();
    return clone(row);
  }

  async generateThumbnailImage(projectId: string, conceptName: string) {
    await delay(1200);
    const row = contentProjects.find((c) => c.id === projectId);
    if (!row) throw new Error("project not found");
    const concept = row.thumbnailLab?.concepts.find((c) => c.conceptName === conceptName);
    if (!concept) throw new Error("concept not found — run the Thumbnail Studio first");
    // Demo: a labeled placeholder so the save/select flow is fully explorable.
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720">` +
      `<rect width="1280" height="720" fill="#0b0d12"/>` +
      `<rect x="40" y="40" width="1200" height="640" fill="none" stroke="#3b82f6" stroke-width="4"/>` +
      `<text x="640" y="330" fill="#e5e7eb" font-size="52" font-family="sans-serif" text-anchor="middle">${concept.conceptName.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</text>` +
      `<text x="640" y="410" fill="#9ca3af" font-size="30" font-family="sans-serif" text-anchor="middle">demo placeholder — Gemini renders this live</text>` +
      `</svg>`;
    return this.saveThumbnailVariant(projectId, {
      provider: "gemini",
      conceptName,
      imageUrl: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
      prompt: concept.providerPromptGemini,
      pairedTitle: row.selectedTitle,
      relevanceScore: concept.relevanceScore,
      selected: row.thumbnailVariants.length === 0,
    });
  }

  resetLocalData() {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  }
}

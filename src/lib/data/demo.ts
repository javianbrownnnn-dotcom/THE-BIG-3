// Demo provider: seeded, deterministic in-memory data for the three-person
// company. Lets the whole product run — and be evaluated — with zero backend
// setup. Patterns are intentionally baked into the data (hook types and story
// structures have real effect sizes) so analysis features have something
// true to find.

import type {
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
  SopVersionInput,
  SopWithHistory,
  Video,
  VideoInput,
  VideoMetrics,
  VideoMetricsInput,
  VideoWithHistory,
} from "@/types";
import type { DataProvider } from "./provider";
import { draftFromTemplates } from "@/features/production/draft";
import { aggregateChannelStats, simulateChannelScan } from "@/features/competitors/scan";

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
  { id: "cc_mag", organizationId: org.id, name: "Magnates Media", niche: "Business documentaries" },
  { id: "cc_hoc", organizationId: org.id, name: "How History Works", niche: "Business / history hybrid" },
  { id: "cc_rfb", organizationId: org.id, name: "ReligionForBreakfast", niche: "Academic religion" },
  { id: "cc_eso", organizationId: org.id, name: "Esoterica", niche: "Esoteric religious history" },
  { id: "cc_chris", organizationId: org.id, name: "Chris Voss (MasterClass clips)", niche: "Negotiation" },
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
    createdAt: daysAgo(150 - i * 45),
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
    ],
    coldOpenVideos.slice(0, 6),
    outlierCompIds.slice(0, 3),
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
    ],
    [],
    outlierCompIds.slice(0, 2),
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
    ],
    videos.filter((v) => v.storyStructure === "rise_and_fall").slice(0, 4).map((v) => v.id),
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
    ],
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
    ],
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
    ],
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
const STORAGE_KEY = "big3.demo.v1";

function persist() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        channels, videos, competitorChannels, competitorVideos, ideas, sops, insights,
        recommendations, reports, notifications, activity, productions, invites, comments,
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
    replaceInPlace(invites, s.invites);
    replaceInPlace(comments, s.comments);
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
    Object.assign(chan, aggregateChannelStats(all), {
      subscriberCount: chan.subscriberCount ?? Math.round(between(80_000, 2_400_000)),
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

    // Persist the analysis onto the video so it sticks in the table.
    v.whyItWorked = teardown.whyItWorked;
    v.aiObservations = teardown.observations;
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
    const targetChannels = channelId
      ? channels.filter((c) => c.id === channelId)
      : channels;
    const bestHook =
      groupStat(videos, (v) => v.hookType, (v) => v.metrics?.ctr)[0]?.key ??
      "story_cold_open";

    // A small pool of distinct angles per channel so the demo reads varied.
    const ANGLES: Record<string, string[]> = {
      ch_biz: [
        "The company that quietly owns an industry",
        "The empire built on a product everyone hates",
        "How a 'boring' business became untouchable",
        "The bankruptcy that made its founder richer",
      ],
      ch_rel: [
        "The belief they tried to erase from history",
        "The god a whole empire was afraid of",
        "The forbidden text that outlived its censors",
        "The ritual we still perform without knowing why",
      ],
      ch_sales: [
        "The persuasion tactic that feels illegal",
        "Why the best closers never actually pitch",
        "The one word that doubles a 'yes'",
        "What 1,000 cold calls taught me about 'no'",
      ],
    };

    const out: GeneratedIdea[] = [];
    const outliers = [...competitorVideos].filter((c) => c.isOutlier);
    let oi = 0;
    for (const ch of targetChannels) {
      const nicheWord = (ch.niche ?? "").split(/[ ,]/)[0] || "the niche";
      const angles = (ANGLES[ch.id] ?? [`A fresh ${nicheWord} angle`]).filter(
        (a) => !covered.has(a.toLowerCase()),
      );
      const perChannel = Math.max(2, Math.ceil(count / targetChannels.length));
      for (let k = 0; k < perChannel && k < angles.length; k++) {
        const seed = outliers[oi++ % Math.max(outliers.length, 1)];
        const mechanism = seed?.whyItWorked ?? "a proven curiosity mechanism";
        out.push({
          title: angles[k],
          description: `An angle for ${ch.name} built on a mechanism that's working right now in your niche.`,
          rationale: `Modeled on a competitor outlier${seed ? ` ("${seed.title}")` : ""}: ${mechanism} Open with a ${bestHook.replace(/_/g, " ")} — your highest-CTR hook type.`,
          suggestedHook: bestHook,
          tags: [nicheWord.toLowerCase(), "competitor_validated"],
        });
        if (out.length >= count) break;
      }
      if (out.length >= count) break;
    }
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
        format: "long_form",
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

    activity.unshift({
      id: runtimeId("act"), actorName: "AI Coach", action: "ran the learning loop —",
      entityType: "analysis",
      entityLabel: `${counts.insights} insights, ${counts.recommendations} recommendations`,
      createdAt: nowIso,
    });
    persist();
    return counts;
  }

  resetLocalData() {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  }
}

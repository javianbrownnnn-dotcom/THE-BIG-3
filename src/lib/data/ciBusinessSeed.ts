// Business-niche competitive intelligence seed — July 2026 research cycle.
//
// One dataset, four entities: the "Founder Reality" flagship channel concept,
// 35 competitor rows (34 here + the pre-existing Magnates Media row extended
// in place in demo.ts), the deduplicated Ideas list (19 niche-level
// opportunities + 20 scored video ideas — opportunity #1 became the channel
// itself), and the pattern insights (the Knowledge Base).
//
// Provenance: docs/COMPETITIVE_INTELLIGENCE_BUSINESS.md (consolidated report)
// and research/business-modern-ambition/ (raw research). Numbers here are
// quoted from that research, never invented — keep it that way when editing.

import type { AiInsight, Channel, CompetitorChannel, Idea } from "@/types";

const ORG_ID = "org_demo";
const NOW = Date.now();
const DAY = 86_400_000;
const daysAgo = (n: number) => new Date(NOW - n * DAY).toISOString();

// ---------------------------------------------------------------------------
// "Founder Reality" — the CI report's flagship recommendation (§9), loaded as
// a Channels entry: positioning in the description, the 12-month projection
// as channel goals.
// ---------------------------------------------------------------------------
export const founderRealityChannel: Channel = {
  id: "ch_founder",
  organizationId: ORG_ID,
  name: "Founder Reality",
  brand: "Founder Reality",
  niche: "Modern ambition / authentic founder documentaries",
  uploadCadence: "1.5 long-form / week + 2-3 clips per video",
  description:
    "We document ambitious people making real decisions. Not the polished " +
    "version. Not inspiration porn. The actual journey — with all its " +
    "failures, doubts, and messy realities. We center the founder's voice " +
    "and the specific decisions that defined their trajectory. Format: " +
    "14–16 min documentary, hero's journey with failures integrated, " +
    "distinctive human voice, minimal stock. Brand: deep blue + white + " +
    "gold; thoughtful, direct, occasionally irreverent. Why it wins: more " +
    "authentic than ColdFusion, more founder-centric than Wendover, faster " +
    "than Company Man, more accessible than Lex Fridman — with community + " +
    "multi-stream revenue from day 1. Full strategy: " +
    "docs/COMPETITIVE_INTELLIGENCE_BUSINESS.md §9.",
  goals: [
    {
      id: "goal_fr_subs", channelId: "ch_founder",
      metric: "subscribers", targetValue: 310_000, period: "month 12",
      notes: "CI projection (conservative): 28K @ mo3 → 85K @ mo6 → 175K @ mo9 → 310K @ mo12; 3M views/mo and ~$57K/mo total revenue at month 12.",
    },
    {
      id: "goal_fr_ctr", channelId: "ch_founder",
      metric: "ctr", targetValue: 7, period: "monthly",
      notes: "≥7–8% average CTR by month 3 (niche top-quartile packaging).",
    },
    {
      id: "goal_fr_completion", channelId: "ch_founder",
      metric: "avg_percent_viewed", targetValue: 65, period: "monthly",
      notes: "≥65% completion — the report's retention bar for the format.",
    },
  ],
  createdAt: daysAgo(0),
};

// ---------------------------------------------------------------------------
// Channel-level intelligence for the pre-existing Magnates Media competitor
// row (the CI report's "MagnatesMedia", rank #4) — merged into cc_mag in
// demo.ts instead of creating a duplicate row.
// ---------------------------------------------------------------------------
export const magnatesMediaIntel: Partial<CompetitorChannel> = {
  url: "https://www.youtube.com/c/MagnatesMedia",
  youtubeChannelId: "UCE4Gn00XZbpWvGUfIslT-tA",
  subscriberCount: 1_700_000,
  uploadCadenceDays: 3.5,
  notes:
    "CI Jul 2026 · Direct Competitor · team ~2 · AdSense + courses/products · " +
    "AI: voice-generation. Mini-documentaries about business empires, " +
    "founders, and wealth; rise-and-fall format — \"Netflix for " +
    "Entrepreneurs.\" Edge: format efficiency + course/product monetization; " +
    "proven mini-doc system. What we can do better: add depth (longer, " +
    "deeper investigations); community engagement; original footage and " +
    "founder interviews (their AI voice weakens personal connection).",
};

// ---------------------------------------------------------------------------
// 34 competitor rows (25 deep-dived channels minus Magnates Media, plus the
// 10-channel watchlist tracked at summary level). Generated from
// research/business-modern-ambition/channels-*.json.
// ---------------------------------------------------------------------------
export const ciCompetitorChannels: CompetitorChannel[] = [
  {
    id: "cc_ci_mrbeast", organizationId: ORG_ID,
    name: "MrBeast",
    niche: "Extreme ambition/Wealth display/Entertainment",
    url: "https://www.youtube.com/@MrBeast",
    youtubeChannelId: "UCX6OQ3DkcsbYNE6H8uQQuVA",
    subscriberCount: 380000000,
    uploadCadenceDays: 4.7,
    notes: "CI Jul 2026 · North Star · team ~40 · Multiple + products/newsletter · AI: editing-assist. High-budget entertainment through extreme giving and competition. Founder story through empire building narrative. Billionaire-status achievement. Edge: Founder-as-billionaire narrative; first YouTube-native billion-dollar business. What we can do better: Doesn't show realistic risk or failure; Lower-income audience accessibility gap; Limited storytelling depth (format-driven).",
  },
  {
    id: "cc_ci_coldfusion", organizationId: ORG_ID,
    name: "ColdFusion",
    niche: "Business documentaries/Tech history/Company case studies",
    url: "https://www.youtube.com/@ColdFusion",
    youtubeChannelId: "UC4QZ_LsYcvcq7qOsOhpAX4A",
    subscriberCount: 5204053,
    uploadCadenceDays: 7.0,
    notes: "CI Jul 2026 · Direct Competitor · team ~3 · AdSense · AI: none. In-depth documentaries on technology, history, business, and innovation. Research-heavy storytelling about companies and industries. Edge: Research-first methodology; Dagogo's distinctive personality. What we can do better: Could explore more recent/trending topics; Limited product/course monetization; No community engagement tools (courses, community).",
  },
  {
    id: "cc_ci_wendover_productions", organizationId: ORG_ID,
    name: "Wendover Productions",
    niche: "Geography/Economics/Logistics documentaries",
    url: "https://www.youtube.com/@Wendoverproductions",
    youtubeChannelId: "UC9RM-iSvTu1uPJb8X5yp3EQ",
    subscriberCount: 4900000,
    uploadCadenceDays: 14.0,
    notes: "CI Jul 2026 · Direct Competitor · team ~1 · AdSense · AI: none. Geographic and economic systems explained through logistics, aviation, and international business. Educational explainers on complex systems. Edge: Only channel focused on logistics as primary subject; Sam Denby's expertise in aviation/geography. What we can do better: Underutilizes secondary income streams; Limited expansion into adjacent niches; Not leveraging CEO status (Nebula)effectively for cross-promotion.",
  },
  {
    id: "cc_ci_modern_mba", organizationId: ORG_ID,
    name: "Modern MBA",
    niche: "Business case studies/Strategic analysis",
    url: "https://www.youtube.com/c/ModernMBA",
    youtubeChannelId: "UCbzVRTkX3bzNZuBd9In4XyA",
    subscriberCount: 789000,
    uploadCadenceDays: 4.7,
    notes: "CI Jul 2026 · Direct Competitor · team ~3 · AdSense · AI: none. Deep-dive business case studies with strategic analysis. Wall Street-level financial and operational breakdowns. For ambitious professionals. Edge: Emmy-winning production team + strategic depth; targets professional audience. What we can do better: Could explore emerging companies/startups more; No products/courses leveraging expertise; Limited international expansion.",
  },
  {
    id: "cc_ci_wall_street_millennial", organizationId: ORG_ID,
    name: "Wall Street Millennial",
    niche: "Finance/Business/Markets",
    url: "https://www.youtube.com/@wallstreetmillennial",
    youtubeChannelId: "UCUyH4QfXX-5NOT0bULqG6lQ",
    subscriberCount: 900000,
    uploadCadenceDays: 4.7,
    notes: "CI Jul 2026 · Direct Competitor · team ~1 · AdSense · AI: none. Markets, investing, companies, and financial controversies explained. Gen-Z financial education. Edge: Gen-Z voice in finance education; emerging creator status. What we can do better: Could dive deeper into specific investment strategies; Limited international markets; No product diversification.",
  },
  {
    id: "cc_ci_lex_fridman_podcast", organizationId: ORG_ID,
    name: "Lex Fridman Podcast",
    niche: "Long-form interviews/Ambitious figures/AI/Tech",
    url: "https://www.youtube.com/@lexfridman",
    youtubeChannelId: "UCSHZKyawb77ixDdsGog4iWA",
    subscriberCount: 2500000,
    uploadCadenceDays: 9.3,
    notes: "CI Jul 2026 · Direct Competitor · team ~2 · Multiple · AI: none. Long-form interviews with ambitious figures in tech, AI, science, and philosophy. Profiles of world-changers. Edge: Access to elite researchers, founders, and thinkers; MIT platform. What we can do better: Could highlight clips/short-form content more; Limited diversification (all interview format); Underutilizes community building.",
  },
  {
    id: "cc_ci_polymatter", organizationId: ORG_ID,
    name: "PolyMatter",
    niche: "Economics/Business/Geography",
    url: "https://www.youtube.com/channel/UCgNg3vwj3xt7QOrcIDaHdFg",
    youtubeChannelId: "UCgNg3vwj3xt7QOrcIDaHdFg",
    subscriberCount: 2000000,
    uploadCadenceDays: 9.3,
    notes: "CI Jul 2026 · Direct Competitor · team ~1 · AdSense · AI: none. International business problems and economic policy explained. Geographic analysis of business expansion and market dynamics. Edge: Geography-business economics nexus; international focus. What we can do better: Could explore more startup/founder stories; Limited content on emerging markets; No audience monetization beyond ads.",
  },
  {
    id: "cc_ci_economics_explained", organizationId: ORG_ID,
    name: "Economics Explained",
    niche: "Economic documentaries/Systems explainer",
    url: "https://www.youtube.com/c/ExplainedOutlook",
    youtubeChannelId: "null",
    subscriberCount: 1200000,
    uploadCadenceDays: 3.5,
    notes: "CI Jul 2026 · Direct Competitor · team ~1 · AdSense · AI: none. Economic systems and policies explained simply. Makes complex economics accessible. Edge: High frequency + accessibility; growing rapidly. What we can do better: Could explore business applications more; Limited to education format; No product diversification.",
  },
  {
    id: "cc_ci_company_man", organizationId: ORG_ID,
    name: "Company Man",
    niche: "Company explainer/Business history",
    url: "https://www.youtube.com/channel/UCQMyhrt92_8XM0KLm04dUEw",
    youtubeChannelId: "null",
    subscriberCount: 2000000,
    uploadCadenceDays: 7.0,
    notes: "CI Jul 2026 · Direct Competitor · team ~1 · AdSense · AI: none. Company histories and business model explanations. How companies work and their origins. Edge: Owns the company explainer niche; unmatched consistency. What we can do better: Could go deeper into founder stories; Limited to company histories (not founders); No product or course monetization.",
  },
  {
    id: "cc_ci_business_casual", organizationId: ORG_ID,
    name: "Business Casual",
    niche: "Business/Finance history",
    url: "https://www.youtube.com/channel/UC_E4px0RST-qFwXLJWBav8Q",
    youtubeChannelId: "null",
    subscriberCount: 500000,
    uploadCadenceDays: 14.0,
    notes: "CI Jul 2026 · Direct Competitor · team ~2 · AdSense · AI: none. Animated business history and finance stories. Turning boring financial history into engaging narratives. Edge: Animated business storytelling; unique visual style. What we can do better: Slow upload schedule limits growth; Could scale with team but requires investment; Limited beyond animation format.",
  },
  {
    id: "cc_ci_internet_historian", organizationId: ORG_ID,
    name: "Internet Historian",
    niche: "Internet culture/History/Scandals",
    url: "https://www.youtube.com/channel/UCR1IuLEqb6UEA_zQ81kwXfg",
    youtubeChannelId: "null",
    subscriberCount: 2500000,
    uploadCadenceDays: 14.0,
    notes: "CI Jul 2026 · Direct Competitor · team ~1 · AdSense · AI: none. Internet history, scandals, and culture wars. Comedy-documentary hybrid about online phenomena. Edge: Comedy-documentary hybrid in internet culture space. What we can do better: Could expand to other cultural domains; Limited audience monetization; Slow growth due to upload frequency.",
  },
  {
    id: "cc_ci_y_combinator", organizationId: ORG_ID,
    name: "Y Combinator",
    niche: "Startup education/Founder advice",
    url: "https://www.youtube.com/c/ycombinator",
    youtubeChannelId: "null",
    subscriberCount: 1650000,
    uploadCadenceDays: 3.5,
    notes: "CI Jul 2026 · Direct Competitor · team ~3 · AdSense · AI: none. Startup education from the world's top startup accelerator. Founder advice, fundraising, product-market fit. Edge: Direct access to YC network; highest-quality founder insights. What we can do better: Could improve production quality; Limited to existing YC community; Could use narrative storytelling more.",
  },
  {
    id: "cc_ci_real_engineering", organizationId: ORG_ID,
    name: "Real Engineering",
    niche: "Engineering/Technology/Projects",
    url: "https://www.youtube.com/channel/UCR1IuLEqb6UEA_zQ81kwXfg",
    youtubeChannelId: "null",
    subscriberCount: 4000000,
    uploadCadenceDays: 9.3,
    notes: "CI Jul 2026 · Direct Competitor · team ~2 · AdSense · AI: none. Engineering projects and technical innovation. How real engineering problems are solved. Edge: Engineering-focused; real project documentation. What we can do better: Could link projects to founder stories; Limited business/ambition angle; Underutilizes behind-the-scenes content.",
  },
  {
    id: "cc_ci_fortune_magazine", organizationId: ORG_ID,
    name: "Fortune Magazine",
    niche: "Business/Founder stories/Entrepreneurship",
    url: "https://www.youtube.com/user/FORTUNEmagazine",
    youtubeChannelId: "null",
    subscriberCount: 3500000,
    uploadCadenceDays: 4.7,
    notes: "CI Jul 2026 · Direct Competitor · team ~8 · AdSense · AI: none. Business news and founder stories from Fortune magazine. Corporate profiles and entrepreneurship insights. Edge: Fortune brand + access to top executives. What we can do better: Could go deeper into individual stories; Limited to news-cycle topics; Underutilizes documentary format.",
  },
  {
    id: "cc_ci_this_week_in_startups", organizationId: ORG_ID,
    name: "This Week in Startups",
    niche: "Startup news/Founder interviews",
    url: "https://www.youtube.com/user/thisweekin",
    youtubeChannelId: "null",
    subscriberCount: 351000,
    uploadCadenceDays: 2.3,
    notes: "CI Jul 2026 · Emerging · team ~2 · AdSense + newsletter · AI: none. Weekly insights on startups, founders, and venture capital. Hosted by investor Jason Calacanis. Edge: Jason Calacanis credibility; high frequency; investor perspective. What we can do better: Could improve production quality; Limited geographic diversity of guests; Underutilizes clips/short-form content.",
  },
  {
    id: "cc_ci_slidebean", organizationId: ORG_ID,
    name: "Slidebean",
    niche: "Startup education/Business stories",
    url: "https://www.youtube.com/c/Slidebean",
    youtubeChannelId: "null",
    subscriberCount: 662000,
    uploadCadenceDays: 7.0,
    notes: "CI Jul 2026 · Emerging · team ~5 · AdSense + courses/products · AI: editing-assist. Startup education and pitch coaching. How to launch and grow startups. Edge: Product monetization; pitch coaching focus. What we can do better: Could feature founder stories; Limited differentiation from other startup channels; Underutilizes documentary format.",
  },
  {
    id: "cc_ci_startup_grind", organizationId: ORG_ID,
    name: "Startup Grind",
    niche: "Founder interviews/Startup stories",
    url: "https://www.youtube.com/c/StartupGrind",
    youtubeChannelId: "null",
    subscriberCount: 800000,
    uploadCadenceDays: 4.7,
    notes: "CI Jul 2026 · Emerging · team ~3 · AdSense · AI: none. Global community of entrepreneurs sharing real founder stories. Authentic accounts of startup journeys. Edge: Global founder community; authentic stories. What we can do better: Could improve production quality; Limited to existing Startup Grind community; Underutilizes narrative editing.",
  },
  {
    id: "cc_ci_newsthink", organizationId: ORG_ID,
    name: "NewsThink",
    niche: "Science/Tech/Founder stories/Innovation",
    url: "https://www.youtube.com/c/NewsThink",
    youtubeChannelId: "null",
    subscriberCount: 1000000,
    uploadCadenceDays: 4.7,
    notes: "CI Jul 2026 · Direct Competitor · team ~2 · AdSense · AI: none. Science, technology, innovation, and founder stories explained. Tech trends and business implications. Edge: Founded by Cindy Pom after journalism career; emerging creator with momentum. What we can do better: Could explore more founder stories; Limited to science/tech (not pure business); No product diversification.",
  },
  {
    id: "cc_ci_coin_bureau", organizationId: ORG_ID,
    name: "Coin Bureau",
    niche: "Crypto/Blockchain/Tech investment",
    url: "https://www.youtube.com/channel/UCqnLvsynvxEeEAVtcIPlAzg",
    youtubeChannelId: "null",
    subscriberCount: 2500000,
    uploadCadenceDays: 7.0,
    notes: "CI Jul 2026 · Emerging · team ~2 · AdSense · AI: none. Crypto education and blockchain project analysis. Investment insights for the crypto-curious. Edge: Credible crypto education; emerging creator with strong growth. What we can do better: Could connect to founder stories in crypto; Limited to crypto domain; Underutilizes documentary format.",
  },
  {
    id: "cc_ci_how_money_works", organizationId: ORG_ID,
    name: "How Money Works",
    niche: "Finance/Business documentaries",
    url: "https://www.youtube.com/c/HowMoneyWorks",
    youtubeChannelId: "null",
    subscriberCount: 1500000,
    uploadCadenceDays: 7.0,
    notes: "CI Jul 2026 · Direct Competitor · team ~2 · AdSense · AI: voice-generation. Financial systems and money explained through documentary-style narratives. Edge: Finance education through narrative documentary. What we can do better: Could feature founder stories more; Limited to systems/finance (not companies); No product diversification.",
  },
  {
    id: "cc_ci_logically_answered", organizationId: ORG_ID,
    name: "Logically Answered",
    niche: "Tech/Social media economics",
    url: "https://www.youtube.com/c/LogicallyAnswered",
    youtubeChannelId: "null",
    subscriberCount: 800000,
    uploadCadenceDays: 7.0,
    notes: "CI Jul 2026 · Direct Competitor · team ~1 · AdSense · AI: none. Tech and social media economics explained. How internet platforms actually work from a business perspective. Edge: Tech economics analysis; incentive-structure focus. What we can do better: Could feature tech founder stories; Limited to tech domain; No audience monetization.",
  },
  {
    id: "cc_ci_real_stories", organizationId: ORG_ID,
    name: "Real Stories",
    niche: "General documentaries/Human stories",
    url: "https://www.youtube.com/c/RealStories",
    youtubeChannelId: "null",
    subscriberCount: 1500000,
    uploadCadenceDays: 4.7,
    notes: "CI Jul 2026 · Emerging · team ~3 · AdSense · AI: none. Curated documentaries about real human experiences. Deep dives into personal stories and transformations. Edge: Curated documentary quality; human story focus. What we can do better: Could explore founder/ambition stories more; Limited to general documentaries; No business/entrepreneurship angle.",
  },
  {
    id: "cc_ci_daily_dose_of_internet", organizationId: ORG_ID,
    name: "Daily Dose of Internet",
    niche: "Internet culture/Viral content curation",
    url: "https://www.youtube.com/channel/UCdC0An4ZPNr_YiFiYoVbwaw",
    youtubeChannelId: "null",
    subscriberCount: 1500000,
    uploadCadenceDays: 3.5,
    notes: "CI Jul 2026 · Emerging · team ~1 · AdSense · AI: none. Trending and viral videos curated and presented. Best of internet compilation format. Edge: Viral content curation; high frequency. What we can do better: No business/documentary angle; Limited storytelling; Trend-dependent algorithm risk.",
  },
  {
    id: "cc_ci_statquest_with_josh_star", organizationId: ORG_ID,
    name: "StatQuest with Josh Starmer",
    niche: "AI/Machine learning/Education",
    url: "https://www.youtube.com/channel/UCtYLUTtgS3k1Fg4y5tAQliA",
    youtubeChannelId: "null",
    subscriberCount: 1240000,
    uploadCadenceDays: 7.0,
    notes: "CI Jul 2026 · Emerging · team ~1 · AdSense · AI: none. Statistics and machine learning demystified. Educational content for AI-curious professionals. Edge: Best-in-class statistical education. What we can do better: No business/ambition angle; Limited to technical education; Could connect to AI startup stories.",
  },
  {
    id: "cc_ci_dw_documentary", organizationId: ORG_ID,
    name: "DW Documentary",
    niche: "General documentaries/Global stories",
    subscriberCount: 5590000,
    notes: "CI Jul 2026 · North Star (watchlist — summary level; deep-dive scheduled Q4 2026).",
  },
  {
    id: "cc_ci_free_documentary", organizationId: ORG_ID,
    name: "Free Documentary",
    niche: "General documentaries",
    subscriberCount: 4940000,
    notes: "CI Jul 2026 · North Star (watchlist — summary level; deep-dive scheduled Q4 2026).",
  },
  {
    id: "cc_ci_best_documentary", organizationId: ORG_ID,
    name: "Best Documentary",
    niche: "General documentaries/Curated",
    subscriberCount: 800000,
    notes: "CI Jul 2026 · Emerging (watchlist — summary level; deep-dive scheduled Q4 2026).",
  },
  {
    id: "cc_ci_the_medical_futurist", organizationId: ORG_ID,
    name: "The Medical Futurist",
    niche: "Healthcare/Medical innovation/Future tech",
    subscriberCount: 600000,
    notes: "CI Jul 2026 · Emerging (watchlist — summary level; deep-dive scheduled Q4 2026).",
  },
  {
    id: "cc_ci_arte_documentary", organizationId: ORG_ID,
    name: "ARTE Documentary",
    niche: "Documentary/Cultural stories",
    subscriberCount: 2000000,
    notes: "CI Jul 2026 · Emerging (watchlist — summary level; deep-dive scheduled Q4 2026).",
  },
  {
    id: "cc_ci_nick_robinson", organizationId: ORG_ID,
    name: "Nick Robinson",
    niche: "Documentary/Mystery solving",
    subscriberCount: 1300000,
    notes: "CI Jul 2026 · Emerging (watchlist — summary level; deep-dive scheduled Q4 2026).",
  },
  {
    id: "cc_ci_bliss_foster_fashion", organizationId: ORG_ID,
    name: "Bliss Foster (Fashion)",
    niche: "Fashion history/Design analysis",
    subscriberCount: 400000,
    notes: "CI Jul 2026 · Watch (watchlist — summary level; deep-dive scheduled Q4 2026).",
  },
  {
    id: "cc_ci_garyvee_gary_vaynerchuk", organizationId: ORG_ID,
    name: "GaryVee (Gary Vaynerchuk)",
    niche: "Entrepreneur/Personal brand/Motivation",
    subscriberCount: 9500000,
    notes: "CI Jul 2026 · North Star (watchlist — summary level; deep-dive scheduled Q4 2026).",
  },
  {
    id: "cc_ci_tony_robbins", organizationId: ORG_ID,
    name: "Tony Robbins",
    niche: "Self-help/Personal transformation",
    subscriberCount: 10500000,
    notes: "CI Jul 2026 · North Star (watchlist — summary level; deep-dive scheduled Q4 2026).",
  },
  {
    id: "cc_ci_veritasium", organizationId: ORG_ID,
    name: "Veritasium",
    niche: "Science documentaries/Experiments",
    subscriberCount: 12500000,
    notes: "CI Jul 2026 · North Star (watchlist — summary level; deep-dive scheduled Q4 2026).",
  },
];

// ---------------------------------------------------------------------------
// The deduplicated Ideas list.
//
// The report's 20 opportunities + 20 video ideas collapse as follows:
//  - Opportunity #1 ("Founder Reality — authentic failure narratives") IS the
//    channel — it became founderRealityChannel above, not an idea.
//  - Opportunities #2–20 are niche-level concepts: tagged "niche", no channel.
//  - Video ideas #1–20 are the Founder Reality launch slate: tagged with their
//    scores (CTR / RPM / evergreen / difficulty quoted in the description).
//  - Where a video idea instantiates an opportunity (AI founders, female
//    founders, creator economy, bootstrapped, second acts, VC transparency),
//    the two rows share a topic tag instead of duplicating content.
// Priority encodes the report's tier: tier 1 = high, tier 2 = medium,
// tier 3 = low. Everything starts in the inbox — humans promote.
// ---------------------------------------------------------------------------
const idea = (
  id: string,
  title: string,
  description: string,
  priority: Idea["priority"],
  tags: string[],
  channelId?: string,
): Idea => ({
  id, organizationId: ORG_ID, channelId, title, description,
  priority, status: "inbox", tags, createdAt: daysAgo(0),
});

const OP = "Niche-level opportunity (CI report §5)";
const VI = "Video idea (CI report §7)";

export const ciIdeas: Idea[] = [
  // --- Opportunities #2–20 → niche-level concepts -------------------------
  idea("idea_ci_op02", "AI impact on founders — how AI is changing entrepreneurship",
    `${OP}, tier 1. Technical AI content exists; no "founder implications" documentary. 400K–1M potential subs · difficulty 6/10 · CTR 8–9% · RPM $15–25 (AI/SaaS sponsors) · trending +180% YoY.`,
    "high", ["niche", "opportunity", "ai_founders"]),
  idea("idea_ci_op03", "Female founder documentaries — dedicated series",
    `${OP}, tier 1. Few channels exclusively document female founder journeys. 400K–1M subs · difficulty 5/10 · CTR 7–8% · RPM $10–16 · clear differentiation + partnership potential with founder networks.`,
    "high", ["niche", "opportunity", "female_founders"]),
  idea("idea_ci_op04", "Startup finance reality — real financial models",
    `${OP}, tier 1. Finance education is generic; real company financials are private. 250–600K subs · difficulty 7/10 (access) · CTR 7–9% · RPM $18–28 (premium professional audience). Needs CFO relationships.`,
    "high", ["niche", "opportunity", "finance"]),
  idea("idea_ci_op05", "Creator-economy founders — creator/solo business stories",
    `${OP}, tier 1. Most channels cover VC startups; creators are under-documented and easy to access. 500K–1.2M subs · difficulty 5/10 · CTR 8–10% · RPM $10–15.`,
    "high", ["niche", "opportunity", "creator_economy"]),
  idea("idea_ci_op06", "Global founder stories — non-Western entrepreneurship",
    `${OP}, tier 2. Global perspective + emerging-market insights. 400–900K subs · difficulty 6/10 · RPM $8–14 (regional CPM variance). Risks: language, international logistics.`,
    "medium", ["niche", "opportunity", "international"]),
  idea("idea_ci_op07", "Founder mental health — wellbeing + business success",
    `${OP}, tier 2. Growing interest, sensitive handling required (consult expertise). 300–700K subs · difficulty 7/10 · RPM $12–18 (health/wellness sponsors).`,
    "medium", ["niche", "opportunity", "mental_health"]),
  idea("idea_ci_op08", "VC/investor decision-making exposed",
    `${OP}, tier 2. Behind-the-scenes of how VCs actually evaluate startups. 250–600K subs · difficulty 7/10 (requires VC relationships) · RPM $16–24.`,
    "medium", ["niche", "opportunity", "vc"]),
  idea("idea_ci_op09", "Startup mistakes analysis — what goes wrong and why",
    `${OP}, tier 2. Learning-focused, non-judgmental failure analysis. 400–900K subs · difficulty 4/10 · RPM $8–14. Risk: generic if not done thoughtfully.`,
    "medium", ["niche", "opportunity", "failure_analysis"]),
  idea("idea_ci_op10", "Industry-specific founder verticals (fintech / health-tech / climate-tech)",
    `${OP}, tier 2. Vertical expertise + industry sponsor premium. 200–500K subs per niche · difficulty 5/10 · RPM $14–22.`,
    "medium", ["niche", "opportunity", "verticals"]),
  idea("idea_ci_op11", "Solopreneur → micro-team scaling",
    `${OP}, tier 3. Underserved segment. 150–400K subs · difficulty 5/10 · RPM $10–16 · ~20–24 months to 100K.`,
    "low", ["niche", "opportunity", "solopreneur"]),
  idea("idea_ci_op12", "Cofounder & partnership dynamics",
    `${OP}, tier 3. Psychology of cofounder relationships. 200–500K subs · difficulty 6/10 (intimate subject) · RPM $8–14.`,
    "low", ["niche", "opportunity", "cofounders"]),
  idea("idea_ci_op13", "Acquisition aftermath stories",
    `${OP}, tier 3. Post-acquisition realities nobody discusses. 200–450K subs · difficulty 6/10 (access to founders + acquirers) · RPM $12–20.`,
    "low", ["niche", "opportunity", "acquisitions"]),
  idea("idea_ci_op14", "Startup location strategy — why founders choose certain places",
    `${OP}, tier 3. Geography + business strategy, underexplored. 150–350K subs · difficulty 5/10 · RPM $8–12.`,
    "low", ["niche", "opportunity", "geography"]),
  idea("idea_ci_op15", "Founder pivots — major direction changes",
    `${OP}, tier 3. Decision-making under uncertainty. 200–500K subs · difficulty 5/10 · RPM $10–16.`,
    "low", ["niche", "opportunity", "pivots"]),
  idea("idea_ci_op16", "Non-traditional founder paths — older founders, career switchers",
    `${OP}, tier 3. Age diversity / late bloomers, underrepresented and growing. 200–500K subs · difficulty 5/10 · RPM $10–15.`,
    "low", ["niche", "opportunity", "older_founders"]),
  idea("idea_ci_op17", "Founder exit interviews — after the acquisition/IPO",
    `${OP}, tier 3. Post-exit life and reflections; premium investor audience. 150–350K subs · difficulty 7/10 (exclusive access) · RPM $14–22.`,
    "low", ["niche", "opportunity", "exits"]),
  idea("idea_ci_op18", "Bootstrapped vs. funded — different paths compared",
    `${OP}, tier 3. Direct comparison of funding approaches. 250–600K subs · difficulty 5/10 · RPM $10–16.`,
    "low", ["niche", "opportunity", "bootstrapped"]),
  idea("idea_ci_op19", "Founder reinvention — second acts after failure",
    `${OP}, tier 3. Failure recovery, inspirational but realistic. 200–500K subs · difficulty 5/10 · RPM $10–15.`,
    "low", ["niche", "opportunity", "second_acts"]),
  idea("idea_ci_op20", "Founder network effects — social capital as a business asset",
    `${OP}, tier 3. How successful founders build leverage. 250–600K subs · difficulty 6/10 · RPM $12–18.`,
    "low", ["niche", "opportunity", "network_effects"]),

  // --- Video ideas #1–20 → the Founder Reality launch slate ---------------
  idea("idea_ci_v01", "How $0 Became $100M: The Unfiltered Truth",
    `${VI}, tier 1. CTR 8–9% · RPM $16–24 · evergreen 8/10 · difficulty 7/10. 16 min documentary, hero's journey with failures integrated. Hook: "This founder admits he was wrong about 90% of startup advice he gives." Wins on authenticity + specific claim + counterintuitive.`,
    "high", ["founder_story", "failure_analysis"], "ch_founder"),
  idea("idea_ci_v02", "The 3 Decisions That Actually Matter for Startups",
    `${VI}, tier 1. CTR 7–8% · RPM $14–20 · evergreen 9/10 · difficulty 5/10. 14 min system explainer with examples (cofounder selection, market timing, retention focus). Hook: "Most founder advice is noise. These 3 decisions determine 80% of outcomes."`,
    "high", ["explainer", "decisions"], "ch_founder"),
  idea("idea_ci_v03", "Why This Founder Turned Down $50M (The Real Reason)",
    `${VI}, tier 1. CTR 8–10% · RPM $12–18 · evergreen 7/10 · difficulty 6/10 (needs exclusive founder access). 18 min interview + analysis on money vs. impact and founder autonomy.`,
    "high", ["founder_story", "decisions", "exits"], "ch_founder"),
  idea("idea_ci_v04", "10 Things No VC Will Tell You (Founder Revealed)",
    `${VI}, tier 1. CTR 8–9% · RPM $16–24 · evergreen 7/10 · difficulty 6/10. 15 min founder interview + graphics on VC incentives, term-sheet tricks, power imbalances. Shares the "vc" thread with the VC decision-making niche concept.`,
    "high", ["vc", "insider"], "ch_founder"),
  idea("idea_ci_v05", "The Startup That Shouldn't Have Succeeded (But Did)",
    `${VI}, tier 1. CTR 7–8% · RPM $12–16 · evergreen 8/10 · difficulty 7/10. 17 min underdog documentary on defying odds and luck in business. Hook: "By every metric, this startup was doomed. Then this one decision changed everything."`,
    "high", ["founder_story", "underdog"], "ch_founder"),
  idea("idea_ci_v06", "How AI Is Changing What Founders Actually Need to Know",
    `${VI}, tier 2. CTR 8–9% · RPM $18–26 · evergreen 5/10 (dates quickly) · 16 min. Hook: "Everything you learned about startups in 2024 is outdated." Instantiates the AI-founders niche concept.`,
    "medium", ["ai_founders", "explainer"], "ch_founder"),
  idea("idea_ci_v07", "The Founder Who Quit at the Top (Here's Why)",
    `${VI}, tier 2. CTR 8–9% · RPM $14–20 · evergreen 7/10 · 15 min. Hook: "She sold her company for $500M and walked away. The reason shocked investors."`,
    "medium", ["founder_story", "exits"], "ch_founder"),
  idea("idea_ci_v08", "Why This Female Founder Raised 10x More Than Her Male Competitors",
    `${VI}, tier 2. CTR 7–8% · RPM $12–18 · evergreen 8/10 · 14 min. Hook: "She did something different. Here's her unfair advantage." Instantiates the female-founders niche concept.`,
    "medium", ["female_founders", "fundraising"], "ch_founder"),
  idea("idea_ci_v09", "The Pivot That Saved the Company ($1B Outcome)",
    `${VI}, tier 2. CTR 7–8% · RPM $14–20 · evergreen 7/10 · 15 min. Hook: "They were heading toward failure. This pivot saved everything." Pairs with the founder-pivots niche concept.`,
    "medium", ["pivots", "founder_story"], "ch_founder"),
  idea("idea_ci_v10", "Cofounder Breakup: How It Destroyed (and Created) Companies",
    `${VI}, tier 2. CTR 8–9% · RPM $12–18 · evergreen 8/10 · 17 min, three tracked stories. Pairs with the cofounder-dynamics niche concept.`,
    "medium", ["cofounders", "failure_analysis"], "ch_founder"),
  idea("idea_ci_v11", "The Money That Ruined Great Startups",
    `${VI}, tier 2. CTR 7–8% · RPM $14–20 · evergreen 7/10 · 16 min. Hook: "Too much VC funding destroyed these promising companies. Here's how."`,
    "medium", ["vc", "failure_analysis"], "ch_founder"),
  idea("idea_ci_v12", "Why Bootstrapped Founders Make Different (Often Better) Decisions",
    `${VI}, tier 2. CTR 7–8% · RPM $12–18 · evergreen 9/10 · 15 min. Instantiates the bootstrapped-vs-funded niche concept.`,
    "medium", ["bootstrapped", "decisions"], "ch_founder"),
  idea("idea_ci_v13", "The Founder Who Got Everything Wrong (But Became a Billionaire Anyway)",
    `${VI}, tier 2. CTR 8–9% · RPM $14–20 · evergreen 8/10 · 14 min. Hook: "His business plan violated every rule. It somehow worked."`,
    "medium", ["founder_story", "underdog"], "ch_founder"),
  idea("idea_ci_v14", "Why Older Founders Have an Unfair Advantage",
    `${VI}, tier 2. CTR 7–8% · RPM $12–18 · evergreen 8/10 · 15 min. Hook: "Age isn't a disadvantage in startups. It's an edge." Instantiates the non-traditional-paths niche concept.`,
    "medium", ["older_founders"], "ch_founder"),
  idea("idea_ci_v15", "The Decision That Cost This Founder $1 Billion",
    `${VI}, tier 2. CTR 8–9% · RPM $12–18 · evergreen 7/10 · 15 min. Hook: "One wrong choice. One billion dollars. Here's the story."`,
    "medium", ["decisions", "failure_analysis"], "ch_founder"),
  idea("idea_ci_v16", "Behind the Scenes of a $10M Fundraise",
    `${VI}, tier 3. CTR 7–8% · RPM $16–24 · evergreen 6/10 · 18 min. Hook: "We filmed an entire funding round. This is what really happens."`,
    "low", ["fundraising", "vc"], "ch_founder"),
  idea("idea_ci_v17", "The Founder Who Rejected Venture Capital (5 Years Later)",
    `${VI}, tier 3. CTR 7–8% · RPM $12–18 · evergreen 8/10 · 14 min. Hook: "She turned down VCs. Five years later, here's what happened."`,
    "low", ["bootstrapped", "founder_story"], "ch_founder"),
  idea("idea_ci_v18", "How Creator-Economy Founders Make More Than VCs",
    `${VI}, tier 3. CTR 8–9% · RPM $10–16 · evergreen 6/10 · 15 min. Instantiates the creator-economy niche concept.`,
    "low", ["creator_economy"], "ch_founder"),
  idea("idea_ci_v19", "The Startup That Survived the Recession (Here's How)",
    `${VI}, tier 3. CTR 7–8% · RPM $12–18 · evergreen 7/10 · 16 min. Hook: "When the market crashes, these founders doubled down."`,
    "low", ["resilience", "founder_story"], "ch_founder"),
  idea("idea_ci_v20", "Why This Founder's First Company Failed (And the Second Succeeded)",
    `${VI}, tier 3. CTR 7–8% · RPM $12–18 · evergreen 8/10 · 15 min. Hook: "He learned from failure. Here's the specific lesson." Instantiates the founder-reinvention niche concept.`,
    "low", ["second_acts", "failure_analysis"], "ch_founder"),
];

// ---------------------------------------------------------------------------
// Pattern insights — the CI report's Knowledge Base (§3–4), one entry per
// pattern, each ending in a "what we do differently" line. These are quoted
// research findings (100+ top videos across 35 channels), not app-detected
// statistics — confidence reflects the report's own confidence ratings.
// ---------------------------------------------------------------------------
const insight = (
  id: string,
  kind: string,
  title: string,
  body: string,
  confidence: number,
): AiInsight => ({
  id, organizationId: ORG_ID, channelId: "ch_founder",
  kind, title, body, confidence, createdAt: daysAgo(0),
});

export const ciInsights: AiInsight[] = [
  insight("ins_ci_thumb", "pattern",
    "Face-centered thumbnails win the business niche (+25–30% CTR)",
    "72% success rate for face (left ⅓) + bold ≤3-word claim (right ⅓) in orange/blue, mobile-optimized (70% of views). Text-heavy thumbnails are declining (28%). What we do differently: face-centered testimonial style as default, A/B minimalist for professional topics. [CI Jul 2026 §3.1]",
    0.85),
  insight("ins_ci_cliff", "pattern",
    "The 15-second retention cliff is the master rule",
    "Videos that lose viewers before 15s rarely recover; the steepest drop is at 10–20s. Every hook must deliver on the title's promise by second 15. What we do differently: the hook must pay off the packaging promise inside 15 seconds — no scene-setting preambles. [CI Jul 2026 §3.2]",
    0.9),
  insight("ins_ci_hook", "pattern",
    "'Proof then promise' is the strongest hook (78% retention at 30s)",
    "Shocking stat (0–5s) → payoff (5–15s) → commitment (15–30s) appears in 58% of top videos and holds 78% at 30s, vs 71% contrarian, 74% story immersion, 67% question hooks. What we do differently: proof-then-promise as default; question hooks only when the question itself is the story. [CI Jul 2026 §3.2]",
    0.85),
  insight("ins_ci_titles", "pattern",
    "Title formula: [Number/Claim] – [Benefit] – [Curiosity] (CTR 6.8–8.2%)",
    "Numbers add +34% CTR, personal pronouns +18%, parentheticals +12%; the first 40 characters are critical (mobile truncation). Power words work only when honest. What we do differently: every title drafted against this formula, and never a claim the video can't cash. [CI Jul 2026 §3.3]",
    0.8),
  insight("ins_ci_structure", "pattern",
    "Hero's journey with failures integrated beats success-only narratives",
    "74% completion for hero's-journey-with-failures on founder stories; rise-and-fall (70%) is most shareable for company stories. Emotional beats matter more than structure: 3–5 beats across 12–18 min outperform flat narratives by 15–20% retention. What we do differently: failures are integrated, never skipped — that's the positioning. [CI Jul 2026 §3.4]",
    0.8),
  insight("ins_ci_pacing", "pattern",
    "6–8s average shot length is the pacing sweet spot for 18–45",
    "Younger audiences want 3–5s cuts, 40+ tolerates 8–12s; 6–8s serves the 18–45 core. What we do differently: brief the editor on 6–8s average with intentional slower holds on emotional beats. [CI Jul 2026 §3.5]",
    0.7),
  insight("ins_ci_voice", "pattern",
    "Human narrators retain +22% vs AI voice — and audiences now detect AI",
    "Distinctive personal narrators appear in 64% of 2M+ channels; detectable AI narration costs 12–18% retention and is declining in audience favor. Authentic founder voices in multi-voice formats add 18–25% engagement. What we do differently: human (or founder) voice, always — it's also Magnates Media's biggest weakness. [CI Jul 2026 §3.5]",
    0.85),
  insight("ins_ci_cadence", "pattern",
    "1.5×/week is the growth-optimal cadence; 2×+/week collapses by month 12",
    "1.5×/week correlates with +35–50% YoY sub growth and stays sustainable; 80% of small-team channels on 2×+/week fail within 12 months (quality death + burnout). Consistent-mediocre beats sporadic-brilliant. What we do differently: 1.5×/week ceiling, enforced — burnout is the #1 cause of channel death. [CI Jul 2026 §4.1]",
    0.85),
  insight("ins_ci_timing", "pattern",
    "Tue–Thu, 9am–12pm ET is the publishing window for business content",
    "Best-performing slot for business/founder audiences — but consistency matters more than exact timing. What we do differently: fixed Tue/Thu slots so the audience can build a habit. [CI Jul 2026 §4.1]",
    0.6),
  insight("ins_ci_sponsors", "pattern",
    "Sponsorships pay 2–5× AdSense; business audiences carry a 20–30% CPM premium",
    "Sponsor CPMs: finance/investment $15–45, crypto $12–35, SaaS $8–25, tech $10–20, education $6–15. Revenue by size: 100–500K subs → $2–5K/mo deals; 1–3M → $10–25K. What we do differently: sponsor outreach starts pre-100K, targeting finance/SaaS first. [CI Jul 2026 §4.2]",
    0.8),
  insight("ins_ci_midroll", "pattern",
    "Mid-roll native sponsor integration causes no retention drop",
    "Integrated mid-roll reads at ~50% show no retention penalty; intro reads >20s cost 5–10%. What we do differently: one native mid-roll per video, never a cold intro read. [CI Jul 2026 §4.2]",
    0.75),
  insight("ins_ci_adsense", "competitor",
    "20 of 25 deep-dived competitors are AdSense-only — the structural gap",
    "Even leaders (ColdFusion, Wendover) have no product, course, community, or newsletter, leaving 40–60% of potential revenue on the table. Top diversified channels earn 40–60% from non-ad sources. What we do differently: newsletter + community from day 1, product at ~100K subs — a moat competitors must restructure to copy. [CI Jul 2026 §2.3, §4.2]",
    0.9),
  insight("ins_ci_audience", "pattern",
    "The audience: 22–45 aspiring entrepreneurs; curiosity and schadenfreude drive clicks",
    "~65% male / 35% female, 40% US / 20% UK-EU / 15% India, median income $40–80K. Emotional triggers in top videos: curiosity/mystery 71%, aspiration 58%, 'what went wrong' 48%, awe 42%, fear/risk 35%. What we do differently: lead packaging with curiosity + honest failure stakes, not inspiration. [CI Jul 2026 §4.3]",
    0.75),
  insight("ins_ci_gaps", "competitor",
    "Underserved gaps: failure analysis, female founders, international founders, AI × founders",
    "General founder stories are saturated (50+ channels, −15–25% YoY for mediocre entrants); nearly unserved: dedicated failure analysis, founder follow-ups, creator-economy founders, founder mental health, sports-business. What we do differently: enter only through the gaps — authentic failure analysis first — and never compete head-on with generic founder stories. [CI Jul 2026 §4.4]",
    0.8),
  insight("ins_ci_authenticity", "pattern",
    "Audiences are rewarding authenticity and punishing 'inspiration porn'",
    "Wants growing: authenticity, failure analysis, realistic advice, diverse founders. Rejecting: inspiration porn (−20% YoY), generic advice (−20–30% YoY), get-rich-quick framing (regulatory + trust risk). What we do differently: zero-BS editorial rule — real decisions and real numbers, or the story doesn't run. [CI Jul 2026 §1, §6]",
    0.85),
  insight("ins_ci_burnout", "pattern",
    "Burnout kills 70% of channels — sustainability is a strategy, not a vibe",
    "70% of channel failures trace to founder burnout; production costs rise 20–30%/yr as audience expectations inflate. What we do differently: 3–5 person team, 14-day production cycle, 1.5×/week hard ceiling, and format variety within the theme to avoid fatigue. [CI Jul 2026 §6]",
    0.85),
];

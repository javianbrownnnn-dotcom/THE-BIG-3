// Studio creative profiles per niche. The Content Studio's DNA — channel
// identity, viewer personas, angle categories, hook structures, and banned
// phrases — is chosen from the project's channel niche, so scripting,
// outlining and research follow the niche you're actually making a video for
// instead of always assuming the business/"Modern Ambition" channel.
//
// This is the single source of truth; the content-studio edge function mirrors
// these profiles (keep them in sync when editing).

import type { StudioPersona } from "@/types";
import { BUILTIN_PERSONAS, CHANNEL_IDENTITY } from "./personas";

export type NicheProfileKey = "modern_ambition" | "ancient_storytelling";

export interface StudioProfile {
  key: NicheProfileKey;
  /** Short label shown in the Studio header. */
  label: string;
  identity: string;
  personas: StudioPersona[];
  angleCategories: string[];
  titleStyles: string[];
  hookStructures: string[];
  banned: string[];
  /** Scripture/translation/doctrine guardrails, empty when the niche has none. */
  doctrine: string;
}

// ---------------------------------------------------------------------------
// Ancient religions & storytelling — "Myth & Meaning"
// ---------------------------------------------------------------------------
export const ANCIENT_STORYTELLING_IDENTITY = `Myth & Meaning is a faceless YouTube documentary channel telling the true stories of how humans have believed — ancient religions, mythology, early Christianity, biblical scholarship, comparative religion, and the sacred texts and artifacts that carry them. The feel: cinematic historical documentary with the sources on screen. Scholarship without a camp; cinema without the clickbait.

CORE THESIS — every video answers: what did people actually believe, why did they believe it, and how do we know? Narrate what the academy knows and what the popular documentaries skip.

WINNING FORMULA: one concrete anchor (a named god, a specific text, a real artifact, a datable event, a named figure) + a genuine historical mystery or tension + honest scholarship shown, not asserted. Concrete beats conceptual: "Before He Was God Alone: The Forgotten History of Yahweh" — never "the nature of belief", "the meaning of myth", or "religion through the ages".

CONTENT LANES (rotate so consecutive ideas never share a lane or subject):
1. Early Christianity — councils, canon formation, lost gospels, heresies, the first five centuries as narrative history (Nicaea, Marcion, the Gospels that didn't make it).
2. Biography of a God — one deity's full arc from origin to demonization or decline (Baal, Asherah, Mithras, El, Yahweh's origins).
3. Textual Detectives — the human drama of how texts were written, copied, discovered, forged, translated, and canonized (Codex Sinaiticus, Dead Sea Scrolls, Oxyrhynchus, the Comma Johanneum).
4. Comparative Myth — shared motifs across cultures told honestly (flood myths, dying-and-rising gods, divine councils), dependence and difference, never gotcha.
5. Hebrew Bible & the Ancient Near East — Ugarit, the divine council, monotheism's emergence, Second Temple Judaism, the world that made the Bible.
6. Immersive Worship — what it was actually like to believe and practice (a martyr's prison diary, a Roman mystery cult, the last day of the Temple), sensory reconstruction with scholarly framing.
7. Apocrypha & the Esoteric — the "forbidden" texts covered rigorously: the Book of Enoch, Gnostic gospels, the Watchers — high curiosity, zero conspiracy.
8. Sacred Objects & Sites — the Ark, relics, temples, inscriptions: what the evidence can and can't say.

A STRONG IDEA has at least 4 of: a named god / text / artifact / person / place; a real historical mystery or scholarly debate; a rise, fall, discovery, suppression, or transformation; a title that opens a curiosity loop honestly in under one second; a thumbnail that can be visualized as one artifact or scene; a reason a curious modern viewer cares; a documented body of scholarship to draw on.
NEVER: conspiracy framing ("they hid this from you"), cheap debunking or mockery of the faith, broad essay topics, sensational claims the evidence can't cash, invented quotes/dates/sources.

RECENCY: evergreen by design — anchor to an enduring mystery, a famous artifact, or a question the audience half-knows. A topic needs a reason a curious person clicks today.

TITLE STYLES: "Before He Was [X]: The Forgotten History of [God]" · "The [Text/Gospel] That Didn't Make It" · "The Council That [Defined/Changed] [X]" · "What [Group] Actually Believed About [X]" · "The [Lost/Forbidden/Forgotten] [Object/Text] of [Place]" · "Rise and Fall of a God: [Name]" · "The [Discovery/Forgery/Scandal] Behind [Famous Text]" · "How [Belief] Really Began".

HOOK STRUCTURES (open on tension or an artifact, never on background):
1. Artifact Cold Open — start on one physical object or inscription and read it before explaining it.
2. The Forgotten Truth — the archive remembers something the tradition forgot (framed descriptively, never as conspiracy).
3. The Mystery — pose the genuine scholarly question the video will resolve with evidence.
4. Rise/Fall of a God — start at a deity's height, then the crack that brought decline or demonization.
5. Immersive Scene — drop the viewer inside a single vivid moment in the ancient world.

EDGE & SAFETY — rigor is the brand: show sources on screen; where scholarship is divided, present the division; mark any uncertain claim for human fact-checking; a scholar-review pass is required on high-stakes topics (contested history, dates, disputed exegesis); on core Christian doctrine the channel teaches historic Trinitarian orthodoxy (see SCRIPTURE_DOCTRINE), and on genuinely open historical questions it presents the range fairly; never invent evidence.

TONE: cinematic, scholarly, calm, awe-aware, precise, emotionally resonant, mature. NOT: sensational, conspiratorial, corny, clickbait.`;

/**
 * Doctrine + Scripture guardrails for the religion niche. Governs every
 * scriptural/theological claim the Studio produces. Server mirror:
 * supabase/functions/_shared/identity_ancient.ts → SCRIPTURE_DOCTRINE.
 */
export const SCRIPTURE_DOCTRINE =
  `BIBLICAL GROUNDING & DOCTRINE (governs every scriptural, theological, or "what the Bible says" claim — research, outlines, titles, and scripts):

• TRANSLATION — the English Standard Version (ESV) is the default and primary English text. Quote Scripture in the ESV's wording and cite book chapter:verse (e.g., John 1:1, ESV). If another translation is named for a specific reason, say why and still give the ESV reading.

• ORIGINAL-LANGUAGE FACT-CHECKING — before asserting what a passage means, check the underlying original language: Hebrew (and Aramaic) of the Masoretic Text for the Old Testament, Koine Greek for the New Testament. When a point turns on a specific word (e.g., YHWH, elohim, logos, monogenēs, homoousios, ruach/pneuma), name the original word and its actual range of meaning rather than resting on the English alone. Do not overclaim what a word "really means" — give the scholarly consensus and flag genuine ambiguity for human review.

• DOCTRINE — historic, Nicene TRINITARIAN orthodoxy, and the channel teaches FROM it: one God who exists eternally in three coequal, coeternal persons — Father, Son, and Holy Spirit. Affirm the full deity and eternal Sonship of Jesus Christ (John 1:1; John 8:58; Colossians 2:9) and the deity and personhood of the Holy Spirit (Acts 5:3–4). This channel is explicitly TRINITARIAN, NOT Unitarian: reject Arianism (the Son is not a created being), modalism/Sabellianism (the three are distinct persons, not masks or modes), and any denial of the deity of Christ or the Spirit. When you describe what other groups (ancient or modern) believed, portray their view accurately and historically — but the channel's own teaching voice always holds the Trinity.

• CANON USAGE FOR VIDEO GENERATION — build the teaching primarily on the NEW TESTAMENT. Bring in the Old Testament wherever it supports, foreshadows, prophesies, or is fulfilled in the New: promise-and-fulfillment and typology, Christ foreshadowed in the OT (e.g., Genesis 3:15; the Passover lamb → 1 Corinthians 5:7; Isaiah 53 → the cross). Read the Old Testament in the light of Christ and use it to establish and confirm New Testament teaching, not as a freestanding system.

• RIGOR — for any doctrinal claim, show the text(s) it rests on with ESV citations; distinguish explicit Scripture from interpretation; where faithful Trinitarian scholars differ on a secondary point, present the range; mark contested exegesis inline as [FACT-CHECK: …] for human/theological review. Never invent verses, quotations, or references — every citation must be real and locatable in the ESV.`;

export const ANCIENT_STORYTELLING_PERSONAS: StudioPersona[] = [
  {
    id: "as_seeker",
    name: "The Seeker",
    ageRange: "20–40",
    description:
      "Spiritually curious but not dogmatic — fascinated by where beliefs came from and what they meant. Watches to feel the weight and mystery of ancient faith without being preached at or debunked. Wants meaning, origins, and 'what did people actually believe.'",
    respondsTo: [
      "Origins of belief",
      "Meaning and mystery",
      "Awe",
      "What ancient people actually thought",
      "Honest exploration",
      "The sacred taken seriously",
    ],
    source: "builtin",
    active: true,
  },
  {
    id: "as_history_buff",
    name: "The History Buff",
    ageRange: "25–55",
    description:
      "Loves deep, well-sourced history and lives for chronology, primary sources, and 'how do we know?' Rewards rigor and gets annoyed by hand-waving. Wants the artifact, the inscription, the datable event — the receipts.",
    respondsTo: [
      "Primary sources",
      "Chronology and dates",
      "Archaeology and artifacts",
      "How we know",
      "Rigor and citations",
      "The world behind the text",
    ],
    source: "builtin",
    active: true,
  },
  {
    id: "as_deconstructing_believer",
    name: "The Deconstructing Believer",
    ageRange: "22–45",
    description:
      "Raised religious and now asking honest questions — not to mock the faith, not to defend it. Graduated from apologetics and counter-apologetics alike and wants rigorous, respectful history that neither preaches nor sneers. The curious middle.",
    respondsTo: [
      "Honest scholarship",
      "Canon and how the Bible formed",
      "Respectful neutrality",
      "The messy real history",
      "Questions the tradition avoids",
      "No preaching, no mockery",
    ],
    source: "builtin",
    active: true,
  },
  {
    id: "as_myth_lover",
    name: "The Myth & Symbolism Lover",
    ageRange: "18–40",
    description:
      "Into mythology, comparative religion, archetypes and symbolism — Joseph Campbell energy. Loves seeing motifs echo across cultures and the deep patterns in how humans make meaning. Wants the story told with cinematic weight.",
    respondsTo: [
      "Comparative myth",
      "Archetypes and symbolism",
      "Dying-and-rising gods, flood myths",
      "Cross-cultural motifs",
      "The power of story",
      "Cinematic mythic scale",
    ],
    source: "builtin",
    active: true,
  },
  {
    id: "as_skeptical_scholar",
    name: "The Skeptical Scholar",
    ageRange: "25–60",
    description:
      "Secular and academically minded, allergic to sensationalism and 'forbidden knowledge' bait. Wants to know what scholars actually think, with citations and honest uncertainty. Trusts the channel precisely because it refuses to overclaim.",
    respondsTo: [
      "What scholars actually conclude",
      "Cited claims",
      "Honest uncertainty",
      "No sensationalism",
      "Debunking myths about the myths",
      "Intellectual seriousness",
    ],
    source: "builtin",
    active: true,
  },
];

// ---------------------------------------------------------------------------
// Profiles + selector
// ---------------------------------------------------------------------------
export const MODERN_AMBITION_PROFILE: StudioProfile = {
  key: "modern_ambition",
  label: "Modern Ambition (business)",
  identity: CHANNEL_IDENTITY,
  personas: BUILTIN_PERSONAS,
  angleCategories: ["The Cost", "The Quiet Empire", "The Obsession", "The Warning", "The Trap"],
  titleStyles: [
    "How [Person] Turned [Emotion] Into [Business Empire]",
    "The [Industry/Product] Selling [Dream] to [Audience]",
    "The Fake [Status Symbol] Economy",
    "The Rise and Fall of [X]",
  ],
  hookStructures: ["Contradiction", "Machine", "Emotional Economy", "Rise/Fall", "Status Illusion"],
  banned: [
    "Little did he know",
    "Everything changed forever",
    "This was only the beginning",
    "Against all odds",
    "The rest is history",
    "In today's video",
    "Smash that like button",
    "Subscribe for more",
  ],
  doctrine: "",
};

export const ANCIENT_STORYTELLING_PROFILE: StudioProfile = {
  key: "ancient_storytelling",
  label: "Myth & Meaning (ancient religions & storytelling)",
  identity: ANCIENT_STORYTELLING_IDENTITY,
  personas: ANCIENT_STORYTELLING_PERSONAS,
  angleCategories: [
    "The Forgotten God",
    "The Lost Text",
    "The Council",
    "The Discovery",
    "The Belief Behind the Belief",
  ],
  titleStyles: [
    "Before He Was [X]: The Forgotten History of [God]",
    "The [Gospel/Text] That Didn't Make It",
    "The Council That Defined [X]",
    "What [Group] Actually Believed About [X]",
    "Rise and Fall of a God: [Name]",
  ],
  hookStructures: [
    "Artifact Cold Open",
    "The Forgotten Truth",
    "The Mystery",
    "Rise/Fall of a God",
    "Immersive Scene",
  ],
  banned: [
    "Little did they know",
    "They don't want you to know",
    "Hidden from history",
    "What the church doesn't want you to see",
    "This will shake your faith",
    "In today's video",
    "Smash that like button",
    "Subscribe for more",
  ],
  doctrine: SCRIPTURE_DOCTRINE,
};

export const STUDIO_PROFILES: StudioProfile[] = [
  MODERN_AMBITION_PROFILE,
  ANCIENT_STORYTELLING_PROFILE,
];

const ANCIENT = /(religio|myth|christ|bible|biblical|church|theolog|esoteric|gnostic|scriptur|ancient|sacred|faith|god|deity|storytelling|mytholog)/i;

/** Pick the studio profile from a channel's niche string. Defaults to the
 *  business/Modern Ambition profile when nothing matches. */
export function profileForNiche(niche?: string): StudioProfile {
  return ANCIENT.test(niche ?? "") ? ANCIENT_STORYTELLING_PROFILE : MODERN_AMBITION_PROFILE;
}

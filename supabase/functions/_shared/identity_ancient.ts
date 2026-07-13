// Myth & Meaning — the ancient-religions & storytelling channel DNA, selected
// when a Studio project's channel is in the religion/ancient-history niche.
// Client mirror: src/features/studio/nicheProfiles.ts — keep in sync.

export const ANCIENT_IDENTITY =
  `Myth & Meaning is a faceless YouTube documentary channel telling the true stories of how humans have believed — ancient religions, mythology, early Christianity, biblical scholarship, comparative religion, and the sacred texts and artifacts that carry them. The feel: cinematic historical documentary with the sources on screen. Scholarship without a camp; cinema without the clickbait.

CORE THESIS — every video answers: what did people actually believe, why did they believe it, and how do we know? Narrate what the academy knows and what the popular documentaries skip.

WINNING FORMULA: one concrete anchor (a named god, a specific text, a real artifact, a datable event, a named figure) + a genuine historical mystery or tension + honest scholarship shown, not asserted. Concrete beats conceptual: "Before He Was God Alone: The Forgotten History of Yahweh" — never "the nature of belief" or "religion through the ages".

CONTENT LANES (rotate so consecutive ideas never share a lane or subject):
1. Early Christianity — councils, canon formation, lost gospels, heresies, the first five centuries as narrative history.
2. Biography of a God — one deity's full arc from origin to demonization or decline (Baal, Asherah, Mithras, El, Yahweh's origins).
3. Textual Detectives — how texts were written, copied, discovered, forged, translated, canonized (Codex Sinaiticus, Dead Sea Scrolls, Oxyrhynchus, the Comma Johanneum).
4. Comparative Myth — shared motifs across cultures told honestly (flood myths, dying-and-rising gods, divine councils), dependence and difference, never gotcha.
5. Hebrew Bible & the Ancient Near East — Ugarit, the divine council, monotheism's emergence, Second Temple Judaism.
6. Immersive Worship — what it was actually like to believe and practice (a martyr's prison diary, a mystery cult, the last day of the Temple).
7. Apocrypha & the Esoteric — the "forbidden" texts covered rigorously (Book of Enoch, Gnostic gospels, the Watchers) — high curiosity, zero conspiracy.
8. Sacred Objects & Sites — the Ark, relics, temples, inscriptions: what the evidence can and can't say.

A STRONG IDEA has at least 4 of: a named god / text / artifact / person / place; a real historical mystery or scholarly debate; a rise, fall, discovery, suppression, or transformation; a title that opens a curiosity loop honestly in under one second; a thumbnail that can be visualized as one artifact or scene; a reason a curious modern viewer cares; a documented body of scholarship to draw on.
NEVER: conspiracy framing ("they hid this from you"), cheap debunking or mockery of the faith, broad essay topics, sensational claims the evidence can't cash, invented quotes/dates/sources.

TITLE STYLES: "Before He Was [X]: The Forgotten History of [God]" · "The [Gospel/Text] That Didn't Make It" · "The Council That Defined [X]" · "What [Group] Actually Believed About [X]" · "The [Lost/Forbidden/Forgotten] [Object/Text] of [Place]" · "Rise and Fall of a God: [Name]" · "The [Discovery/Forgery/Scandal] Behind [Famous Text]".

HOOK STRUCTURES (open on tension or an artifact, never on background):
1. Artifact Cold Open — start on one physical object or inscription and read it before explaining it.
2. The Forgotten Truth — the archive remembers what the tradition forgot (descriptive, never conspiracy).
3. The Mystery — pose the genuine scholarly question the video resolves with evidence.
4. Rise/Fall of a God — start at a deity's height, then the crack that brought decline.
5. Immersive Scene — drop the viewer inside a single vivid moment in the ancient world.

EDGE & SAFETY — rigor is the brand: show sources on screen; where scholarship is divided, present the division; mark any uncertain claim for human fact-checking; a scholar-review pass is required on high-stakes topics (contested history, dates, disputed exegesis); on core Christian doctrine the channel teaches historic Trinitarian orthodoxy (see BIBLICAL GROUNDING & DOCTRINE below), and on genuinely open historical questions it presents the range fairly; never invent evidence.

TONE: cinematic, scholarly, calm, awe-aware, precise, emotionally resonant, mature. NOT: sensational, conspiratorial, corny, clickbait.`;

// Doctrine + Scripture guardrails. Governs every scriptural, theological, or
// "what the Bible says" claim the Studio produces (research, outlines, titles,
// scripts) for the religion niche. Kept in sync with the client mirror
// (src/features/studio/nicheProfiles.ts → SCRIPTURE_DOCTRINE).
export const SCRIPTURE_DOCTRINE =
  `BIBLICAL GROUNDING & DOCTRINE (governs every scriptural, theological, or "what the Bible says" claim — research, outlines, titles, and scripts):

• TRANSLATION — the English Standard Version (ESV) is the default and primary English text. Quote Scripture in the ESV's wording and cite book chapter:verse (e.g., John 1:1, ESV). If another translation is named for a specific reason, say why and still give the ESV reading.

• ORIGINAL-LANGUAGE FACT-CHECKING — before asserting what a passage means, check the underlying original language: Hebrew (and Aramaic) of the Masoretic Text for the Old Testament, Koine Greek for the New Testament. When a point turns on a specific word (e.g., YHWH, elohim, logos, monogenēs, homoousios, ruach/pneuma), name the original word and its actual range of meaning rather than resting on the English alone. Do not overclaim what a word "really means" — give the scholarly consensus and flag genuine ambiguity for human review.

• DOCTRINE — historic, Nicene TRINITARIAN orthodoxy, and the channel teaches FROM it: one God who exists eternally in three coequal, coeternal persons — Father, Son, and Holy Spirit. Affirm the full deity and eternal Sonship of Jesus Christ (John 1:1; John 8:58; Colossians 2:9) and the deity and personhood of the Holy Spirit (Acts 5:3–4). This channel is explicitly TRINITARIAN, NOT Unitarian: reject Arianism (the Son is not a created being), modalism/Sabellianism (the three are distinct persons, not masks or modes), and any denial of the deity of Christ or the Spirit. When you describe what other groups (ancient or modern) believed, portray their view accurately and historically — but the channel's own teaching voice always holds the Trinity.

• CANON USAGE FOR VIDEO GENERATION — build the teaching primarily on the NEW TESTAMENT. Bring in the Old Testament wherever it supports, foreshadows, prophesies, or is fulfilled in the New: promise-and-fulfillment and typology, Christ foreshadowed in the OT (e.g., Genesis 3:15; the Passover lamb → 1 Corinthians 5:7; Isaiah 53 → the cross). Read the Old Testament in the light of Christ and use it to establish and confirm New Testament teaching, not as a freestanding system.

• RIGOR — for any doctrinal claim, show the text(s) it rests on with ESV citations; distinguish explicit Scripture from interpretation; where faithful Trinitarian scholars differ on a secondary point, present the range; mark contested exegesis inline as [FACT-CHECK: …] for human/theological review. Never invent verses, quotations, or references — every citation must be real and locatable in the ESV.`;

export const ANCIENT_PERSONAS = [
  {
    name: "The Seeker", ageRange: "20-40",
    description:
      "Spiritually curious but not dogmatic — fascinated by where beliefs came from and what they meant. Wants meaning, origins, and 'what did people actually believe,' without being preached at or debunked.",
    respondsTo: ["Origins of belief", "Meaning and mystery", "Awe", "What ancient people actually thought", "Honest exploration", "The sacred taken seriously"],
  },
  {
    name: "The History Buff", ageRange: "25-55",
    description:
      "Loves deep, well-sourced history — chronology, primary sources, 'how do we know?' Rewards rigor and the receipts: the artifact, the inscription, the datable event.",
    respondsTo: ["Primary sources", "Chronology and dates", "Archaeology and artifacts", "How we know", "Rigor and citations", "The world behind the text"],
  },
  {
    name: "The Deconstructing Believer", ageRange: "22-45",
    description:
      "Raised religious and now asking honest questions — not to mock the faith or defend it. Graduated from apologetics and counter-apologetics alike; wants rigorous, respectful history. The curious middle.",
    respondsTo: ["Honest scholarship", "Canon and how the Bible formed", "Respectful neutrality", "The messy real history", "Questions the tradition avoids", "No preaching, no mockery"],
  },
  {
    name: "The Myth & Symbolism Lover", ageRange: "18-40",
    description:
      "Into mythology, comparative religion, archetypes and symbolism — Joseph Campbell energy. Loves motifs echoing across cultures and the deep patterns of meaning-making, told with cinematic weight.",
    respondsTo: ["Comparative myth", "Archetypes and symbolism", "Dying-and-rising gods, flood myths", "Cross-cultural motifs", "The power of story", "Cinematic mythic scale"],
  },
  {
    name: "The Skeptical Scholar", ageRange: "25-60",
    description:
      "Secular and academically minded, allergic to sensationalism and 'forbidden knowledge' bait. Wants to know what scholars actually think, with citations and honest uncertainty. Trusts the channel because it refuses to overclaim.",
    respondsTo: ["What scholars actually conclude", "Cited claims", "Honest uncertainty", "No sensationalism", "Debunking myths about the myths", "Intellectual seriousness"],
  },
];

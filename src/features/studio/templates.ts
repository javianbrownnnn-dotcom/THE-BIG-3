// Demo-mode template engine for the Content Studio. Same honest-scaffold
// policy as the production draft engine: structurally real artifacts the
// human reacts to, with [brackets] marking what only research can fill.
// Live mode routes every step through Claude (content-studio edge function).

import type {
  ContentProject,
  OutlineSection,
  RelevanceReport,
  ResearchPacket,
  StudioCritique,
  StudioVideoLength,
  ThumbnailLab,
  TitleLab,
  TitleVariant,
} from "@/types";
import { EXTENDED_BEAT_NAMES, OUTLINE_BEATS_15, WORD_RANGES } from "./personas";

const clamp10 = (n: number) => Math.max(1, Math.min(10, Math.round(n)));

function guessPersona(topic: string): string {
  const t = topic.toLowerCase();
  if (/psycholog|power|culture|empire|strategy|lvmh|quiet/.test(t)) return "The Strategic Dreamer";
  if (/dark|cost|destroy|obsess|lonel|downfall|lost/.test(t)) return "The Self-Improvement Skeptic";
  return "The Young Builder";
}

export function templateRelevance(topic: string): RelevanceReport {
  const persona = guessPersona(topic);
  const broad = topic.trim().split(/\s+/).length < 4;
  return {
    relevant: broad ? "maybe" : "yes",
    score: clamp10(broad ? 5 : 7),
    bestPersona: persona,
    whyViewerCares: `[Demo scaffold] "${topic}" touches ambition and its price — the exact question this channel exists to answer. Sharpen it to one person or one decision to make it land.`,
    emotionalHook: `The moment the ambition behind "${topic}" started costing more than it created.`,
    businessHook: `[Name the empire mechanics: the model, the leverage, the number that made it work.]`,
    psychologyHook: `[Name the trait — obsession, control, image — and the scene that proves it.]`,
    weakness: broad
      ? "Topic is broad — without one central figure or one decision it becomes a Wikipedia tour."
      : "[What could make this feel generic? Note it and counter it in the angle.]",
    clickabilityFix:
      "Lead with the contradiction: what they won versus what it cost. Specifics beat themes.",
    recommendedLengthMinutes: broad ? 15 : 18,
    videoPromise: `By the end you'll understand what ambition built here — and exactly what it destroyed to do it.`,
  };
}

export function templateResearch(project: ContentProject): ResearchPacket {
  const t = project.topic;
  return {
    mainSubject: t,
    timeline: ["[Year — origin event]", "[Year — breakout]", "[Year — peak]", "[Year — turn]"],
    keyEvents: [`[3–6 verifiable events in "${t}" — date each one]`],
    keyConflicts: ["[Person vs person]", "[Person vs self]", "[Person vs market/culture]"],
    turningPoints: ["[The decision that could not be undone]"],
    businessContext: "[The model, the market, the leverage — with numbers you can source.]",
    psychologicalContext: "[The trait driving it all, shown through behavior, not adjectives.]",
    culturalContext: "[Why this story matters beyond the subject — what it says about now.]",
    controversies: ["[Anything involving living people needs sourcing before scripting]"],
    unverifiedClaims: [
      "EVERY claim in this demo packet needs human fact-checking — the system never invents facts.",
    ],
    bestAngle: `The cost ledger: track what "${t}" created against what it consumed, beat by beat.`,
    emotionalQuestion: "Was it worth it — and would they do it again?",
    endingIdea: "[Return to the cold-open image, now recontextualized by everything since.]",
  };
}

const ANGLES = ["The Cost", "The Quiet Empire", "The Obsession", "The Warning", "The Trap"];

export function templateTitles(project: ContentProject): TitleLab {
  const subject = project.topic.replace(/^(how|why|the)\s+/i, "").split(/[,—-]/)[0].trim();
  const seeds = [
    `The Empire Built on Obsession: ${subject}`,
    `${subject}: Winning Everything Except Peace`,
    `The Man Who Couldn't Stop Building`,
    `How ${subject} Became a Warning Sign`,
    `Why Ambitious People Destroy the Thing They Love`,
    `The Quiet Empire Behind ${subject}`,
    `${subject}'s Golden Cage`,
    `The Dark Psychology of Winning: ${subject}`,
    `What ${subject} Sacrificed to Win`,
    `The Price of Becoming ${subject}`,
    `He Built Freedom, Then Became Trapped by It`,
    `${subject}: The Rise Nobody Questioned`,
    `The Decision That Made — and Unmade — ${subject}`,
    `${subject} and the Cost of Being First`,
    `The Empire ${subject} Couldn't Walk Away From`,
    `Inside the Obsession of ${subject}`,
    `${subject}: When Winning Stops Being Enough`,
    `The Loneliest Win in Business: ${subject}`,
    `${subject} Won. Here's What It Cost.`,
    `The Machine ${subject} Built Around Themselves`,
  ];
  const variants: TitleVariant[] = seeds.map((title, i) => {
    const specific = title.includes(subject);
    return {
      title: title.length > 70 ? title.slice(0, 67) + "…" : title,
      angle: ANGLES[i % ANGLES.length],
      curiosityScore: clamp10(6 + (i % 3)),
      clarityScore: clamp10(specific ? 8 : 6),
      emotionScore: clamp10(6 + ((i + 1) % 3)),
      specificityScore: clamp10(specific ? 8 : 5),
      accuracyScore: 7,
      documentaryFeelScore: clamp10(7 + (i % 2)),
      personaFitScore: 7,
      clickPotentialScore: clamp10(6 + (i % 3)),
      reasoning: "[Demo scoring — live mode reasons per title against the persona and story.]",
      thumbnailMatch: "[One-line visual that pays this title off]",
    };
  });
  const ranked = [...variants].sort(
    (a, b) =>
      b.curiosityScore + b.specificityScore + b.clickPotentialScore -
      (a.curiosityScore + a.specificityScore + a.clickPotentialScore),
  );
  return {
    variants,
    angleCategories: ANGLES,
    strongest: ranked.slice(0, 3).map((v) => v.title),
    recommended: ranked[0].title,
    whyRecommended:
      "Highest combined curiosity + specificity + click potential without overpromising. It names the contradiction the video actually pays off.",
  };
}

export function templateThumbnails(project: ContentProject): ThumbnailLab {
  const title = project.selectedTitle ?? project.topic;
  const concepts = [
    {
      conceptName: "The Isolated Figure",
      visualDescription: `One silhouetted figure, small against an enormous empty space that represents what they built. Premium documentary grade.`,
      textOverlayOptions: ["THE COST", "ALONE AT THE TOP", "WORTH IT?"],
      mainEmotion: "Isolation inside success",
      composition: "Subject lower third, negative space above; single light source.",
      background: "Vast dark interior or skyline at dusk",
      style: "Cinematic, desaturated with one accent color",
      mobileReadabilityScore: 9,
      relevanceScore: 8,
      providerPromptGemini: `Cinematic 16:9 YouTube thumbnail, premium documentary aesthetic: a lone silhouetted figure standing small in a vast dark modern space, single dramatic light source, high contrast, desaturated palette with one warm accent, no text, no clutter, emotionally clear in under one second, mobile-first readability.`,
      providerPromptCanva: `Dark documentary layout: full-bleed photo of a lone figure in a vast space; bold condensed sans-serif overlay (max 3 words) top-left in white with subtle shadow; thin accent underline; 1280×720.`,
      negativePrompt: "clutter, many faces, cartoon style, fake situations, logos, small text",
      whyItWorks: `Pays off "${title}" — the scale of the win versus the smallness of the person.`,
      shouldNot: "Show a smiling stock-photo success pose; mislead about the subject.",
    },
    {
      conceptName: "The Split Face",
      visualDescription: "Half the subject's face in confident light, half falling into shadow — the two ledgers of ambition in one image.",
      textOverlayOptions: ["TWO PRICES", "THE OTHER SIDE", "WHAT IT TOOK"],
      mainEmotion: "Duality — winning and losing at once",
      composition: "Centered face, hard vertical light split.",
      background: "Plain deep gradient, no distraction",
      style: "High-contrast portrait, premium grade",
      mobileReadabilityScore: 9,
      relevanceScore: 8,
      providerPromptGemini: `16:9 YouTube thumbnail, premium documentary style: dramatic portrait lit half in warm light half in deep shadow, hard vertical light split, plain dark gradient background, high contrast, one clear subject, no text, no clutter, mobile-readable.`,
      providerPromptCanva: `Portrait split-light template: subject centered; 2-word bold overlay bottom-third; muted gold accent; 1280×720.`,
      negativePrompt: "busy background, multiple subjects, comedic expression, logos",
      whyItWorks: "The visual states the core question — created vs cost — before a word is read.",
      shouldNot: "Use a real person's face in a fabricated situation.",
    },
    {
      conceptName: "The Empire Object",
      visualDescription: "One symbolic object of the empire (product, building, logo-free artifact) on a pedestal, cracking.",
      textOverlayOptions: ["BUILT TO BREAK", "THE EMPIRE", "STILL STANDING?"],
      mainEmotion: "Fragility of something enormous",
      composition: "Object dead center, museum lighting, crack catching light.",
      background: "Black museum void",
      style: "Still-life, premium and restrained",
      mobileReadabilityScore: 8,
      relevanceScore: 7,
      providerPromptGemini: `16:9 premium documentary thumbnail: a single iconic object on a museum pedestal under a spotlight against pure black, a fine crack running through it catching the light, ultra clean, high contrast, no text, no logos, one-second emotional clarity.`,
      providerPromptCanva: `Museum still-life template: centered object photo; single-word overlay in thin caps under it; 1280×720.`,
      negativePrompt: "copyrighted logos, clutter, cartoonish cracks",
      whyItWorks: "Symbol carries the story without a face — ideal for faceless documentary brand.",
      shouldNot: "Use trademarked logos without confirmed usage rights.",
    },
    {
      conceptName: "The Long Walk",
      visualDescription: "Subject walking away down an endless corridor/road made of what they built (offices, stores, screens).",
      textOverlayOptions: ["NO WAY BACK", "THE LONG WIN", "KEEP BUILDING"],
      mainEmotion: "Compulsion — unable to stop",
      composition: "One-point perspective, subject centered walking away.",
      background: "Corridor of repeated structures fading to dark",
      style: "Cinematic one-point perspective, moody",
      mobileReadabilityScore: 8,
      relevanceScore: 7,
      providerPromptGemini: `Cinematic 16:9 documentary thumbnail: one-point perspective of a lone figure walking away down an endless dark corridor of repeated identical structures fading into darkness, moody premium grade, high contrast, no text, no clutter.`,
      providerPromptCanva: `Perspective corridor template; 3-word overlay top-center; 1280×720.`,
      negativePrompt: "faces, text in image, clutter, bright cheerful tones",
      whyItWorks: "Motion + repetition communicates obsession in under a second.",
      shouldNot: "Feel like a horror thumbnail — restrained, not spooky.",
    },
    {
      conceptName: "The Before/After Ledger",
      visualDescription: "Same subject twice: hungry beginning vs hollow peak, separated by a thin gold line.",
      textOverlayOptions: ["10 YEARS", "THE TRADE", "BOTH TRUE"],
      mainEmotion: "The trade made visible",
      composition: "Vertical split, matched poses, gold divider.",
      background: "Consistent dark backdrop both sides",
      style: "Matched-portrait diptych, premium",
      mobileReadabilityScore: 7,
      relevanceScore: 7,
      providerPromptGemini: `16:9 premium documentary thumbnail: matched diptych portrait, same figure on both sides of a thin gold vertical divider — left young and hungry in modest clothing, right older and successful but hollow-eyed in a dark suit — consistent dark backdrop, cinematic grade, no text.`,
      providerPromptCanva: `Diptych template with gold divider; single-word overlay each side; 1280×720.`,
      negativePrompt: "misleading body-swap, cartoon aging, clutter",
      whyItWorks: "The whole arc in one glance; curiosity fills the gap between the two frames.",
      shouldNot: "Exaggerate the 'after' into mockery.",
    },
  ];
  return { concepts, recommendedConcept: concepts[0].conceptName };
}

export function templateOutline(project: ContentProject): OutlineSection[] {
  const mins = project.videoLengthMinutes;
  const beats =
    mins === 15
      ? OUTLINE_BEATS_15.map((b) => b.title)
      : EXTENDED_BEAT_NAMES;
  const total = mins * 60;
  const per = total / beats.length;
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
  return beats.map((title, i) => {
    const start = i * per;
    const end = Math.min(total, (i + 1) * per);
    const ts15 = mins === 15 ? OUTLINE_BEATS_15[i]?.timestamp : undefined;
    return {
      timestamp: ts15 ?? `${fmt(start)}–${fmt(end)}`,
      title,
      purpose: `[What this section must accomplish for "${project.selectedTitle ?? project.topic}"]`,
      beats: ["[Concrete story beat with a source]", "[Second beat — end on an open question]"],
      emotionalJob: "[The feeling this section installs — one word plus why]",
      brollIdeas: ["[Archival/location idea]", "[Symbolic insert idea]"],
      retentionDevice: i % 2 ? "Open loop carried from previous section" : "Concrete stake stated in numbers",
      transition: "[One line that makes not-watching-the-next-section impossible]",
    };
  });
}

export function templateScript(project: ContentProject): string {
  const [lo, hi] = WORD_RANGES[project.videoLengthMinutes as StudioVideoLength];
  const sections = (project.outline ?? templateOutline(project))
    .map(
      (s) =>
        `## ${s.timestamp} — ${s.title}\n\n[Write ${s.title.toLowerCase()} here. Purpose: ${s.purpose}. Short and medium sentences, written for voiceover, tension every 60–90 seconds. Mark any uncertain claim with [FACT-CHECK].]\n`,
    )
    .join("\n");
  return (
    `# ${project.selectedTitle ?? project.topic}\n` +
    `<!-- Target ${project.videoLengthMinutes} min ≈ ${lo}–${hi} words. Demo scaffold: live mode writes the full narration. -->\n\n` +
    sections +
    `\n---\n[FINAL LINE — land the cost. No generic outro.]\n`
  );
}

export function templateCritique(project: ContentProject): StudioCritique {
  const scaffold = (project.script ?? "").includes("[Write");
  const base = scaffold ? 4 : 7;
  return {
    scores: {
      hook: base, titleAlignment: base + 1, tension: base, pacing: base,
      clarity: base + 2, originality: base, retention: base, ending: base,
      voiceover: base + 1, channelFit: base + 2, personaFit: base + 1, thumbnailAlignment: base,
    },
    boringSections: [scaffold ? "Everything still in brackets — the scaffold isn't a script yet." : "[Middle sections flagged by pacing check]"],
    clickOffRisks: ["Cold open must reach the stake inside 15 seconds."],
    needsMoreTension: ["Pressure section — add a countdown, a debt, or a rival."],
    genericLines: ["Scan for any line that could open any video about anyone — cut it."],
    essayLikeParts: ["Anywhere three abstract sentences run in a row."],
    cut: ["Context the viewer can infer.", "Any second example proving an already-proven point."],
    expand: ["The single scene that shows the psychology — slow it down."],
    factCheck: ["Every [FACT-CHECK] mark; every claim about living people."],
    proposedRules: [
      { category: "hook", rule: "Reach the concrete stake within the first 15 seconds — scene first, context later." },
    ],
    warnings: [
      "If the subject is a living person, verify every allegation before recording.",
      "If the title promises a downfall the script doesn't deliver, retitle or rewrite.",
    ],
  };
}

/** Deterministic feedback → rule mapping for demo mode (live uses Claude). */
export function templateFeedbackRule(note: string): { category: "title" | "script" | "thumbnail" | "hook" | "ending" | "general"; rule: string } {
  const n = note.toLowerCase();
  if (/title/.test(n)) {
    return {
      category: "title",
      rule: "Titles must name or imply a specific contradiction, cost, empire, downfall, or hidden psychological hook — never a vague theme.",
    };
  }
  if (/thumbnail/.test(n)) {
    return {
      category: "thumbnail",
      rule: "The thumbnail must visually pay off the title's exact promise — if the pairing needs explaining, redo one of them.",
    };
  }
  if (/hook/.test(n)) {
    return { category: "hook", rule: "Open inside a scene with a stake, not with context. The first line must cost something." };
  }
  if (/motivat|corny|cheesy/.test(n)) {
    return {
      category: "script",
      rule: "Avoid direct motivational advice. Show ambition through story, consequences, and tension instead.",
    };
  }
  if (/generic|vague/.test(n)) {
    return {
      category: "script",
      rule: "Every claim needs a name, a number, or a scene. Cut any sentence that could appear in a video about someone else.",
    };
  }
  if (/end/.test(n)) {
    return { category: "ending", rule: "End by re-pricing the opening image — what it cost must land in the final line." };
  }
  return { category: "general", rule: `Distilled from feedback: ${note.trim()}` };
}

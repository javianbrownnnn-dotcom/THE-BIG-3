// Modern Ambition Content Studio — every AI step of the documentary pipeline
// behind one function: relevance gate, research packet, title lab, thumbnail
// concepts, outline, full script, critique, feedback→rules, persona review.
//
// Design rules enforced here, not in the client:
//   * Relevance comes before generation — later steps refuse to run without
//     the earlier artifacts.
//   * Every prompt injects channel identity + personas + active Script Bible
//     rules, so the system writes with everything it has learned.
//   * The model must never invent facts: research marks unverified claims,
//     scripts carry [FACT-CHECK] tags, critique surfaces safety warnings.
//   * Invoked with the caller's JWT — RLS scopes all reads/writes.

// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2";
import { askClaudeJson, corsHeaders, jsonResponse } from "../_shared/claude.ts";
import { CHANNEL_IDENTITY } from "../_shared/identity.ts";
import { ANCIENT_IDENTITY, ANCIENT_PERSONAS, SCRIPTURE_DOCTRINE } from "../_shared/identity_ancient.ts";

// Pick the creative profile from the project channel's niche. Mirrors
// src/features/studio/nicheProfiles.ts — keep in sync.
const ANCIENT_RE =
  /(religio|myth|christ|bible|biblical|church|theolog|esoteric|gnostic|scriptur|ancient|sacred|storytelling|mytholog)/i;
function profileForNiche(niche: string | null | undefined) {
  if (ANCIENT_RE.test(niche ?? "")) {
    return {
      identity: ANCIENT_IDENTITY,
      personas: ANCIENT_PERSONAS,
      label: "Myth & Meaning",
      // Trinitarian, ESV-grounded, original-language-checked, NT-primary.
      doctrine: SCRIPTURE_DOCTRINE,
    };
  }
  return { identity: CHANNEL_IDENTITY, personas: BUILTIN_PERSONAS, label: "Modern Ambition", doctrine: "" };
}

const BUILTIN_PERSONAS = [
  {
    name: "The Young Builder", ageRange: "18-28",
    description: "Wants success, tired of shallow hustle content. Watches founders, money, status, business, discipline, reinvention. Wants stories that make them feel smarter, more focused, more ambitious.",
    respondsTo: ["Ambition", "Wealth", "Status", "Obsession", "Betrayal", "Personal sacrifice", "What it really takes to win"],
  },
  {
    name: "The Strategic Dreamer",
    description: "Fascinated by business, psychology, power, culture. Loves understanding how empires are built and why powerful people choose what they choose.",
    respondsTo: ["Hidden psychology", "Rise-and-fall stories", "Power games", "Identity", "Cultural influence", "Business strategy", "Human flaws behind success"],
  },
  {
    name: "The Self-Improvement Skeptic",
    description: "Ex-motivational-content viewer who now finds it corny. Wants sharper, honest storytelling: real people, real consequences, real tradeoffs.",
    respondsTo: ["The cost of success", "The dark side of ambition", "Winning but losing yourself", "Fame", "Pressure", "Loneliness", "Moral conflict"],
  },
  {
    name: "The Culture Watcher",
    description: "Not trying to get rich — finds internet money culture fascinating as anthropology. Watches to understand why gurus, flex culture, and online empires exist and why people fall for them.",
    respondsTo: ["Status theater", "Virality mechanics", "Subculture deep-dives", "Internet history", "Why things blow up", "The psychology of audiences"],
  },
  {
    name: "The Quiet Builder", ageRange: "22-35",
    description: "Actually building something — a job plus a side project — and allergic to hype. Watches to extract real mechanics and dodge traps: what they actually did versus what they sell.",
    respondsTo: ["Real numbers", "Business-model breakdowns", "What they did vs what they sell", "Avoiding traps", "Unit economics", "Execution details"],
  },
];

const PERSONA_UNLOCKS = [30, 100];
const MAX_PERSONAS = 5;

const WORD_RANGES: Record<number, [number, number]> = {
  15: [2100, 2400], 18: [2500, 2900], 20: [2900, 3300], 25: [3500, 4100],
};

const WPM = 150; // documentary narration pace the WORD_RANGES are built on

const countWords = (text: string): number =>
  text.trim().split(/\s+/).filter(Boolean).length;

/** "10:00-12:30" (or with en dash) → seconds; NaN-safe. */
function spanSeconds(ts: string | undefined): number {
  const m = (ts ?? "").match(/(\d+):(\d{2})\s*[-–]\s*(\d+):(\d{2})/);
  if (!m) return 0;
  return Math.max(0, (+m[3] * 60 + +m[4]) - (+m[1] * 60 + +m[2]));
}

/** Per-section word budgets from the outline's own timestamps at ~150 wpm. */
function sectionBudgets(outline: any[]): string {
  return (outline ?? [])
    .map((sec: any) => {
      const secs = spanSeconds(sec.timestamp);
      if (!secs) return `- ${sec.timestamp} ${sec.title}`;
      return `- ${sec.timestamp} ${sec.title}: ~${Math.round((secs / 60) * WPM)} words`;
    })
    .join("\n");
}

const BANNED = `Never use: "Little did he know", "Everything changed forever", "This was only the beginning", "Against all odds", "The rest is history", "In today's video", "Smash that like button", "Subscribe for more".`;

// ---------------------------------------------------------------------------
// Prompt templates — each receives the same grounding block.
// ---------------------------------------------------------------------------

function grounding(project: any, personas: any[], rules: any[], sops: any[] = [], identity: string = CHANNEL_IDENTITY, doctrine = ""): string {
  const persona = personas.find((p) => p.name === project.primary_persona) ?? personas[0];
  const secondary = personas.find((p) => p.name === project.secondary_persona);
  return [
    `<channel_identity>\n${identity}\n</channel_identity>`,
    doctrine
      ? `<biblical_grounding priority="MUST FOLLOW — Scripture, translation, and doctrine are non-negotiable for this channel">\n${doctrine}\n</biblical_grounding>`
      : "",
    `<primary_persona>\n${JSON.stringify(persona)}\n</primary_persona>`,
    secondary ? `<secondary_persona>\n${JSON.stringify(secondary)}\n</secondary_persona>` : "",
    `<video_length_minutes>${project.video_length_minutes}</video_length_minutes>`,
    `<topic>${project.topic}</topic>`,
    project.selected_title ? `<selected_title>${project.selected_title}</selected_title>` : "",
    project.selected_thumbnail
      ? `<selected_thumbnail_direction>\n${JSON.stringify(project.selected_thumbnail)}\n</selected_thumbnail_direction>`
      : "",
    rules.length
      ? `<script_bible priority="MUST FOLLOW — rules distilled from the creator's own feedback">\n${
        rules.map((r: any) => `[${r.category}] ${r.rule}`).join("\n")
      }\n</script_bible>`
      : "",
    sops.length
      ? `<sops priority="MUST FOLLOW — the team's standard operating procedures for hooks, packaging, structure and credibility">\n${
        sops.map((x: any) => `## ${x.title}\n${(x.steps ?? []).map((st: string) => `- ${st}`).join("\n")}`).join("\n\n")
      }\n</sops>`
      : "",
  ].filter(Boolean).join("\n\n");
}

// Fact-check collection — mirrors src/features/studio/factChecks.ts.
function extractScriptClaims(script: string | undefined): string[] {
  if (!script) return [];
  const out: string[] = [];
  const re = /\[FACT-CHECK:?\s*([^\]]+)\]/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(script))) {
    const claim = m[1].trim();
    if (claim) out.push(claim);
  }
  return out;
}
const normClaim = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
function mergeFactChecks(existing: any[] | null, claims: string[], origin: string): any[] {
  const items = [...(existing ?? [])];
  const seen = new Set(items.map((i: any) => normClaim(i.claim)));
  for (const claim of claims) {
    const key = normClaim(claim);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    items.push({
      id: `fc_${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`,
      claim: claim.trim(),
      origin,
      status: "pending",
    });
  }
  return items;
}

const relevanceGatePrompt = `You are the relevance gate of the Content Studio (the channel identity is provided above). Evaluate the topic BEFORE anything is generated. Be honest — reject or warn against topics that are too broad, too boring, too generic, disconnected from ambition, or impossible to make emotionally engaging.
Return STRICT JSON:
{ "relevant": "yes"|"no"|"maybe", "score": 1-10, "bestPersona": string, "whyViewerCares": string, "emotionalHook": string, "businessHook": string, "psychologyHook": string, "weakness": string, "clickabilityFix": string, "recommendedLengthMinutes": 18|20, "videoPromise": string }
videoPromise is ONE sentence. bestPersona must be one of the provided persona names.`;

const researchPacketPrompt = `You build the research packet for a documentary on this channel (identity provided above). You have no browsing tools: DO NOT INVENT FACTS. Use only widely known, easily verifiable information; put anything uncertain, specific (dates, numbers, quotes) or contested into unverifiedClaims for human fact-checking. Prefer fewer, solid items over many shaky ones.
unverifiedClaims format — every item is a TASK a non-expert can complete without extra context, never a bare statement. Use exactly: "Confirm: [one specific fact — who/what/when/number, fully spelled out]. How: [where to look — e.g. the ESV text of the verse, the named primary source, a scholarly encyclopedia entry, official records] . Done when: [what counts as confirmed, or what to change in the script if it's wrong]."
BAD: "Council of Nicaea date". GOOD: "Confirm: the Council of Nicaea met in AD 325 under Constantine. How: check a scholarly reference (e.g. Britannica or an academic church-history source). Done when: a citable source states the year; if it differs, correct the date in the timeline and script."
Return STRICT JSON:
{ "mainSubject": string, "timeline": string[], "keyEvents": string[], "keyConflicts": string[], "turningPoints": string[], "businessContext": string, "psychologicalContext": string, "culturalContext": string, "controversies": string[], "unverifiedClaims": string[], "bestAngle": string, "emotionalQuestion": string, "endingIdea": string }`;

const titleLabPrompt = `You run the Title Lab. Generate exactly 20 raw titles across 5 angle categories, score each 1-10 on curiosity, clarity, emotion, specificity, accuracy, documentaryFeel, personaFit, clickPotential (honest — no misleading titles). Reject-by-low-score anything vague, clickbaity, generic, clever-but-unclear, motivational, or disconnected from the story.
JSON safety: never put unescaped double quotes inside string values — when quoting a title or phrase inside reasoning, use single quotes.
Style reference (do not copy): "The Billionaire Who Won Everything Except Peace", "The Quiet Empire That Took Over Your Life", "Why Ambitious People Destroy The Thing They Love".
Return STRICT JSON:
{ "variants": [{ "title": string, "angle": string, "curiosityScore": n, "clarityScore": n, "emotionScore": n, "specificityScore": n, "accuracyScore": n, "documentaryFeelScore": n, "personaFitScore": n, "clickPotentialScore": n, "reasoning": string, "thumbnailMatch": string }] (exactly 20),
  "angleCategories": string[] (5), "strongest": string[] (3 titles), "recommended": string, "whyRecommended": string }`;

const thumbnailConceptPrompt = `You run the Thumbnail Concept Studio. Create 5 concepts matched to the selected title. Rules: emotionally clear in under one second; uncluttered; premium documentary feel; visually pays off the title's promise; curiosity not confusion; works on mobile; never misleading; no copyrighted logos unless the user confirms rights; no fake images of real people in misleading situations.
Every providerPromptGemini must specify: 16:9 YouTube thumbnail, mobile-first readability, premium documentary aesthetic, one clear subject or symbol, high contrast, minimal or no text, strong emotional signal, no clutter.
JSON safety: never put unescaped double quotes inside string values — use single quotes for quoted phrases (including textOverlayOptions).
Return STRICT JSON:
{ "concepts": [{ "conceptName": string, "visualDescription": string, "textOverlayOptions": string[] (3), "mainEmotion": string, "composition": string, "background": string, "style": string, "mobileReadabilityScore": n, "relevanceScore": n, "providerPromptGemini": string, "providerPromptCanva": string, "negativePrompt": string, "whyItWorks": string, "shouldNot": string }] (exactly 5),
  "recommendedConcept": string }`;

const outlinePrompt = `You build the timestamped outline. For 15 minutes use exactly: Cold Open 0:00-0:45, Promise 0:45-1:15, Origin 1:15-3:00, Rise 3:00-5:30, Pressure 5:30-8:00, Turning Point 8:00-10:00, Cost 10:00-12:30, Meaning 12:30-14:15, Final Line 14:15-15:00. For 18/20/25 minutes expand the middle with more beats (Complication, Consequences, Deeper Psychology, Cultural/Business Meaning) but preserve the same emotional arc and recompute timestamps to fill the full runtime.
Ground every beat in the research packet. Return STRICT JSON:
{ "sections": [{ "timestamp": string, "title": string, "purpose": string, "beats": string[], "emotionalJob": string, "brollIdeas": string[], "retentionDevice": string, "transition": string }] }`;

function scriptPrompt(mins: number): string {
  const [lo, hi] = WORD_RANGES[mins] ?? [2500, 2900];
  return `You write the full voiceover script following the approved outline exactly (section by section, with the outline's timestamps as ## headings). Target ${lo}-${hi} words total (flexible range for a ${mins}-minute video).
Style: strong narration, not essay writing; written for voiceover; short and medium sentences; create tension every 60-90 seconds; no filler; visually suggestive for B-roll; don't over-explain; don't moralize hard; cinematic but restrained; smart but understandable; emotionally sharp, never melodramatic; built around conflict, tradeoffs, psychology, consequences.
Facts: use ONLY what the research packet supports. Mark anything uncertain inline as [FACT-CHECK: claim] — the claim text must be self-contained and specific (full names, dates, numbers spelled out) so it reads as a checkable task outside the script, e.g. [FACT-CHECK: Confirm Codex Sinaiticus was found at St. Catherine's Monastery in 1844 — check a scholarly source]. ${BANNED}
End with a strong final line. No generic outro.
Return STRICT JSON: { "script": string }  (markdown, ## timestamp headings per section)`;
}

const critiquePrompt = `You critique the script like a ruthless retention editor. Score 1-10: hook, titleAlignment, tension, pacing, clarity, originality, retention, ending, voiceover, channelFit, personaFit, thumbnailAlignment.
Then identify concretely (quote or reference actual lines/sections): where it gets boring, where viewers click off, which sections need more tension, which lines sound generic, which parts read like an essay, what to cut, what to expand, what needs fact-checking.
Every factCheck item must be an actionable task in the form "Confirm: [specific fact]. How: [where to check]. Done when: [what counts as confirmed]" — never a bare topic. Every item in cut/expand/needsMoreTension must name the section (by its timestamp heading) and say exactly what to do there.
Also propose reusable writing rules for the Script Bible, and emit warnings when: claims need fact-checking; the topic involves living people + controversial allegations; the thumbnail concept could mislead; the title overpromises; the script sounds speculative.
Return STRICT JSON:
{ "scores": { "hook": n, "titleAlignment": n, "tension": n, "pacing": n, "clarity": n, "originality": n, "retention": n, "ending": n, "voiceover": n, "channelFit": n, "personaFit": n, "thumbnailAlignment": n },
  "boringSections": string[], "clickOffRisks": string[], "needsMoreTension": string[], "genericLines": string[], "essayLikeParts": string[], "cut": string[], "expand": string[], "factCheck": string[],
  "proposedRules": [{ "category": "title"|"script"|"thumbnail"|"hook"|"ending"|"general", "rule": string }], "warnings": string[] }`;

const feedbackRulePrompt = `You convert creator feedback into reusable writing rules for this channel Script Bible. Each distinct note becomes ONE precise, actionable rule a writer can follow next time (imperative, specific, no fluff). Example: "This sounds too motivational" → "Avoid direct motivational advice. Show ambition through story, consequences, and tension instead."
Return STRICT JSON: { "rules": [{ "category": "title"|"script"|"thumbnail"|"hook"|"ending"|"general", "rule": string, "sourceFeedback": string }] }`;

const personaReviewPrompt = `You design ONE new viewer persona for this channel, grounded in the accumulated feedback rules and completed projects provided. It must be distinct from the existing personas, realistic, and useful for targeting future documentaries. Also suggest one-line refinements to existing personas if the evidence supports them.
Return STRICT JSON:
{ "newPersona": { "name": string, "ageRange": string, "description": string, "respondsTo": string[] } | null,
  "refinements": [{ "personaName": string, "refinement": string }] }`;

// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { organizationId, projectId, step, feedback, guidance } = await req.json();
    if (!organizationId || !projectId || !step) {
      return jsonResponse({ error: "organizationId, projectId and step are required" }, 400);
    }

    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } },
    );
    const { data: auth } = await db.auth.getUser();
    if (!auth?.user) return jsonResponse({ error: "unauthorized" }, 401);

    const { data: project } = await db
      .from("content_projects").select("*").eq("id", projectId).single();
    if (!project) return jsonResponse({ error: "project not found" }, 404);

    const [{ data: ruleRows }, { data: personaRows }, { data: sopRows }] = await Promise.all([
      db.from("feedback_rules").select("category,rule")
        .eq("organization_id", organizationId).eq("active", true),
      db.from("content_personas").select("id,name,definition,active")
        .eq("organization_id", organizationId).eq("active", true),
      // Active SOPs, org-wide plus the project channel's per-niche set —
      // titles, outlines and scripts must follow the team's procedures.
      db.from("sops").select("title, channel_id, status, sop_versions(steps, version_number)")
        .eq("organization_id", organizationId).eq("status", "active"),
    ]);
    const rules = ruleRows ?? [];
    // Choose the creative profile (identity + built-in personas) from the
    // project channel's niche, so scripting/outlining/research follow the
    // niche you're making a video for.
    let channelNiche: string | null = null;
    if (project.channel_id) {
      const { data: ch } = await db.from("channels").select("niche").eq("id", project.channel_id).single();
      channelNiche = ch?.niche ?? null;
    }
    const profile = profileForNiche(channelNiche);
    const sops = (sopRows ?? [])
      .filter((x: any) => !x.channel_id || x.channel_id === project.channel_id)
      .map((x: any) => {
        const latest = (x.sop_versions ?? []).sort(
          (a: any, b: any) => b.version_number - a.version_number,
        )[0];
        return { title: x.title, steps: latest?.steps ?? [] };
      })
      .filter((x: any) => x.steps.length)
      .slice(0, 12);
    const personas = [
      ...profile.personas,
      ...(personaRows ?? []).map((r: any) => ({ name: r.name, ...r.definition })),
    ];
    let ground = grounding(project, personas, rules, sops, profile.identity, profile.doctrine);
    // Optional creator steering for this run: extra direction or a redirect
    // of the concept ("more artifact close-ups, no faces, colder palette").
    // Appended last so it wins ties against the general templates.
    const direction = String(guidance ?? "").trim();
    if (direction) {
      ground += `\n\n<creator_direction priority="MUST FOLLOW — the creator's explicit direction for THIS run; it overrides stylistic defaults but never the facts, doctrine, or safety rules">\n${direction}\n</creator_direction>`;
    }

    // Relevance before generation: enforce step preconditions server-side.
    const need = (cond: unknown, msg: string) => {
      if (!cond) throw new Error(msg);
    };

    const patch: Record<string, unknown> = {};
    let extra: Record<string, unknown> = {};

    switch (step) {
      case "relevance": {
        const r = await askClaudeJson<any>([{
          role: "user",
          content: `${ground}\n\nEvaluate this topic for ${profile.label}. Persona names available: ${personas.map((p) => p.name).join(", ")}.`,
        }], { system: relevanceGatePrompt });
        patch.relevance = r;
        if (!project.primary_persona) patch.primary_persona = r.bestPersona;
        if ([18, 20].includes(r.recommendedLengthMinutes)) {
          patch.video_length_minutes = r.recommendedLengthMinutes;
        }
        break;
      }
      case "research": {
        need(project.relevance, "Run the relevance gate first — relevance comes before generation.");
        const r = await askClaudeJson<any>([{
          role: "user",
          content: `${ground}\n\n<relevance_report>\n${JSON.stringify(project.relevance)}\n</relevance_report>\n\nBuild the research packet.`,
        }], { system: researchPacketPrompt });
        patch.research = r;
        patch.fact_checks = mergeFactChecks(
          project.fact_checks, r.unverifiedClaims ?? [], "research",
        );
        break;
      }
      case "titles": {
        need(project.research, "Build the research packet before the Title Lab.");
        const r = await askClaudeJson<any>([{
          role: "user",
          content: `${ground}\n\n<research_packet>\n${JSON.stringify(project.research)}\n</research_packet>\n\nRun the Title Lab.`,
        }], { system: titleLabPrompt, maxTokens: 8000 });
        patch.title_lab = r;
        break;
      }
      case "thumbnails": {
        need(project.selected_title, "Pick a title first — the thumbnail must pay off the title's promise.");
        const r = await askClaudeJson<any>([{
          role: "user",
          content: `${ground}\n\n<research_packet>\n${JSON.stringify(project.research)}\n</research_packet>\n\nCreate the thumbnail concepts for the selected title.`,
        }], { system: thumbnailConceptPrompt, maxTokens: 8000 });
        patch.thumbnail_lab = r;
        break;
      }
      case "outline": {
        need(project.selected_title, "Pick a title before outlining.");
        const r = await askClaudeJson<any>([{
          role: "user",
          content: `${ground}\n\n<research_packet>\n${JSON.stringify(project.research)}\n</research_packet>\n\nBuild the ${project.video_length_minutes}-minute outline.`,
        }], { system: outlinePrompt, maxTokens: 10000 });
        patch.outline = r.sections ?? r;
        break;
      }
      case "script": {
        need(project.outline, "Approve an outline before the full script is written.");
        const [lo, hi] = WORD_RANGES[project.video_length_minutes] ?? [2500, 2900];
        const budgets = sectionBudgets(project.outline);
        const base = `${ground}\n\n<research_packet>\n${JSON.stringify(project.research)}\n</research_packet>\n\n<approved_outline>\n${JSON.stringify(project.outline)}\n</approved_outline>\n\n<section_word_budgets note="~${WPM} words per minute of runtime; hit each section's budget within ±15% so the total lands in ${lo}-${hi} words">\n${budgets}\n</section_word_budgets>`;
        let r = await askClaudeJson<{ script: string }>([{
          role: "user",
          content: `${base}\n\nWrite the full script.`,
        }], { system: scriptPrompt(project.video_length_minutes), maxTokens: 16000 });
        // Enforce the SOP word target: models undershoot long single-shot
        // targets, so measure and revise — up to two expansion passes, one
        // tightening pass.
        for (let attempt = 0; attempt < 2; attempt++) {
          const words = countWords(r.script ?? "");
          if (words >= Math.round(lo * 0.93)) break;
          r = await askClaudeJson<{ script: string }>([{
            role: "user",
            content: `${base}\n\n<previous_draft words="${words}">\n${r.script}\n</previous_draft>\n\nThe draft is ${words} words — the target for a ${project.video_length_minutes}-minute video is ${lo}-${hi} words. Rewrite it to the full target length: keep the structure, voice and every fact constraint; deepen scenes, consequences and psychology (never filler). Sections below their word budget are where to expand. Return the COMPLETE script.`,
          }], { system: scriptPrompt(project.video_length_minutes), maxTokens: 16000 });
        }
        if (countWords(r.script ?? "") > Math.round(hi * 1.15)) {
          const words = countWords(r.script ?? "");
          r = await askClaudeJson<{ script: string }>([{
            role: "user",
            content: `${base}\n\n<previous_draft words="${words}">\n${r.script}\n</previous_draft>\n\nThe draft is ${words} words — over the ${lo}-${hi} target for ${project.video_length_minutes} minutes. Tighten it to the target: cut repetition and over-explanation, keep every scene beat. Return the COMPLETE script.`,
          }], { system: scriptPrompt(project.video_length_minutes), maxTokens: 16000 });
        }
        patch.script = r.script;
        patch.fact_checks = mergeFactChecks(
          project.fact_checks, extractScriptClaims(r.script), "script",
        );
        break;
      }
      case "critique": {
        need(project.script, "There is no script to critique yet.");
        const r = await askClaudeJson<any>([{
          role: "user",
          content: `${ground}\n\n<script>\n${project.script}\n</script>\n\nCritique it.`,
        }], { system: critiquePrompt, maxTokens: 8000 });
        patch.critique = r;
        patch.fact_checks = mergeFactChecks(
          project.fact_checks, r.factCheck ?? [], "critique",
        );
        break;
      }
      case "feedbackRules": {
        // Distill the human's notes into Script Bible rules and store them.
        const notes = String(feedback?.notes ?? "").trim();
        let created: any[] = [];
        if (notes) {
          const r = await askClaudeJson<{ rules: any[] }>([{
            role: "user",
            content: `${ground}\n\n<creator_feedback>\nRatings: ${JSON.stringify(feedback?.ratings ?? {})}\nNotes: ${notes}\n</creator_feedback>\n\nConvert into Script Bible rules.`,
          }], { system: feedbackRulePrompt });
          for (const rule of r.rules ?? []) {
            const { data: existing } = await db.from("feedback_rules")
              .select("id").eq("organization_id", organizationId)
              .eq("rule", rule.rule).limit(1);
            if (existing?.length) continue;
            const { data: row } = await db.from("feedback_rules").insert({
              organization_id: organizationId,
              category: rule.category ?? "general",
              rule: rule.rule,
              source_feedback: rule.sourceFeedback ?? notes,
              created_by: auth.user.id,
            }).select("*").single();
            if (row) created.push(row);
          }
        }
        extra = { rules: created };

        // Persona evolution: at 30 and 100 completed projects, propose a new
        // persona (five max) refined from everything learned so far.
        const { count } = await db.from("content_projects")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", organizationId).eq("status", "done");
        const done = count ?? 0;
        const unlocked = PERSONA_UNLOCKS.filter((n) => done >= n).length;
        const current = profile.personas.length + (personaRows?.length ?? 0);
        if (current < Math.min(MAX_PERSONAS, profile.personas.length + unlocked)) {
          try {
            const r = await askClaudeJson<any>([{
              role: "user",
              content:
                `${ground}\n\n<existing_personas>\n${JSON.stringify(personas)}\n</existing_personas>\n` +
                `<completed_projects>${done}</completed_projects>\n\nPropose the new persona.`,
            }], { system: personaReviewPrompt });
            if (r.newPersona?.name) {
              await db.from("content_personas").insert({
                organization_id: organizationId,
                name: r.newPersona.name,
                definition: r.newPersona,
              });
            }
          } catch (err) {
            console.error("persona review failed (non-fatal)", err);
          }
        }
        break;
      }
      case "personaReview": {
        const r = await askClaudeJson<any>([{
          role: "user",
          content: `${ground}\n\n<existing_personas>\n${JSON.stringify(personas)}\n</existing_personas>\n\nPropose the new persona.`,
        }], { system: personaReviewPrompt });
        if (r.newPersona?.name && personas.length < MAX_PERSONAS) {
          await db.from("content_personas").insert({
            organization_id: organizationId,
            name: r.newPersona.name,
            definition: r.newPersona,
          });
        }
        break;
      }
      default:
        return jsonResponse({ error: `unknown step "${step}"` }, 400);
    }

    let updated = project;
    if (Object.keys(patch).length) {
      const { data, error } = await db.from("content_projects")
        .update(patch).eq("id", projectId).select("*").single();
      if (error) throw error;
      updated = data;
    }
    return jsonResponse({ project: updated, ...extra });
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: String(err) }, 500);
  }
});

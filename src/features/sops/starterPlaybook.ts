// The Starter Playbook: a working operating system for a team that has
// marketing instincts but no YouTube experience yet. Each SOP is version 1 —
// the whole point of the platform is that YOUR data rewrites these over time.
// Numbers cited are widely-reported industry ranges, not guarantees; treat
// them as starting hypotheses the learning loop will replace with your own.

import type { SopInput } from "@/types";

export const STARTER_PLAYBOOK: SopInput[] = [
  {
    title: "Weekly Operating Rhythm",
    category: "operations",
    purpose:
      "The meta-system: one hour a week that turns publishing into a learning loop instead of a lottery. Every other SOP hangs off this rhythm.",
    whenToUse: "Same day every week, whole team, 60 minutes. Never skip two in a row.",
    steps: [
      "Import fresh metrics: YouTube Studio → Analytics → Advanced mode → Export CSV → Videos page → Import CSV (5 min).",
      "Run the learning loop from the AI Coach page and read anything new it found (5 min).",
      "Review open recommendations: accept, mark as testing, or reject each one — never leave them sitting (10 min).",
      "Check competitor outliers: for each new one, write one sentence on WHY it worked in the 'why it worked' field (10 min).",
      "Pick next week's uploads from approved ideas; every video gets a hook type and structure logged BEFORE production (15 min).",
      "If any recommendation was validated this week, update the relevant SOP with a new version citing the numbers (15 min).",
    ],
    examples:
      "A good week: import → loop finds CTR dip on one channel → team accepts 'change hook style' recommendation → next 3 videos test it → two weeks later the loop reports the result → SOP updated. That cycle is the whole product.",
  },
  {
    title: "Topic Research & Validation",
    category: "research",
    purpose:
      "Only produce videos with demonstrated demand. In marketing terms: validate the offer before building the product.",
    whenToUse: "Before any idea moves from 'inbox' to 'approved'.",
    steps: [
      "Find 3+ videos on comparable channels covering this topic (or an angle on it) that clearly beat that channel's normal performance.",
      "Log those videos in the Competitors tab with views/day — they are your demand evidence.",
      "Ask: can we add a genuinely different angle, or are we the 15th identical take? Different angle or don't make it.",
      "Score 1-5 on: demand evidence, our angle's strength, production cost. Approve only 10+ totals.",
      "Write the working title and thumbnail concept at approval time — if you can't package it compellingly now, production won't fix that.",
    ],
    examples:
      "Weak: 'a video about Rolex' (topic). Strong: 'How Rolex manufactures scarcity' (angle with tension) — validated by two comparable outliers in the niche.",
  },
  {
    title: "Title & Thumbnail Packaging",
    category: "packaging",
    purpose:
      "Packaging decides whether the video gets a chance. Viewers see title + thumbnail for well under a second — it's an ad, and you already know how to write ads.",
    whenToUse: "Title before scripting; thumbnail before scheduling; both locked before upload.",
    steps: [
      "Write 10 title candidates. Sleep on it. Pick 2 finalists with fresh eyes.",
      "Keep titles under ~55 characters so nothing truncates on mobile.",
      "Title and thumbnail must NOT say the same thing — the title opens a loop, the thumbnail adds tension or context that deepens it.",
      "Thumbnail: ONE focal element (face or object), max 3 visual elements total, text readable at 120px wide (test by zooming out).",
      "Before finalizing, screenshot your thumbnail next to the 6 thumbnails currently ranking for the topic. If yours doesn't pop in that lineup, redo it.",
      "Log the hook type and packaging notes on the video record so the loop can learn from it.",
    ],
    examples:
      "Title: 'The Company That Owns Your Face' + thumbnail: a single pair of glasses with the copy 'one company?' — the title provokes, the thumbnail specifies, neither repeats the other.",
  },
  {
    title: "Hook Writing (First 30 Seconds)",
    category: "hooks",
    purpose:
      "The first 30 seconds decide whether the click becomes a viewer. Most viewers who leave, leave here — this is the highest-leverage scriptwriting you'll do.",
    whenToUse: "Every video, written before the body of the script.",
    steps: [
      "Draft 5 different hook options before writing anything else. The first draft is almost never the best.",
      "Default to a story cold open: drop the viewer inside one concrete scene, mid-action, with a character and a problem.",
      "State the stakes within the first two sentences — why should anyone care about what happens next?",
      "Do NOT open with channel intros, 'in this video', or context-setting. Earn attention first, explain later.",
      "Read the hook aloud. Over 20 seconds? Cut it in half.",
      "Log the hook type on the video record — this is the single most learnable variable in the system.",
    ],
    examples:
      "\"The vault door was already open when the auditors arrived...\" beats \"Today we're looking at the Enron scandal, one of the biggest frauds in history.\" Same video, different first 10 seconds, very different retention curve.",
  },
  {
    title: "Retention Editing Pass",
    category: "editing",
    purpose:
      "A dedicated edit pass focused purely on watch time — separate from the assembly edit, because you can't judge pacing while you're still building.",
    whenToUse: "After picture lock, before color and sound polish.",
    steps: [
      "Watch the full cut at 2x speed with fresh eyes; note the exact timestamp of every moment your attention drifts.",
      "Cut anything that doesn't advance the story or raise a question — especially your favorite parts that do neither.",
      "First 3 minutes: some visual change every 3-5 seconds (cut, zoom, graphic, b-roll).",
      "Plant a re-hook every ~2 minutes: an open question, a tease of what's coming ('but that's not the strange part').",
      "End every act on an open question, not a conclusion — conclusions are exit ramps.",
      "Compare your drift-timestamps against the YouTube retention graph after 7 days; log what you learn in the video's notes.",
    ],
    examples:
      "If retention dips at 4:10 and your notes say 'long explanation of corporate structure' — that's the loop working. Next video, that explanation becomes one animated diagram.",
  },
  {
    title: "Publish & Data Logging Checklist",
    category: "operations",
    purpose:
      "The system only learns from what gets logged. Ten minutes at publish time buys the whole learning loop.",
    whenToUse: "Every upload, same day it goes live.",
    steps: [
      "Log the video in the Videos tab: title, publish date, hook type, story structure, duration, format.",
      "Write one honest sentence in the notes: what are you betting on with this one? (New hook style? Proven topic? Experiment?)",
      "If this video tests an active recommendation, make sure it's linked to the relevant SOP so the outcome gets measured.",
      "At 24-48 hours: add the first metric snapshot (views, CTR, avg % viewed) — early CTR is your packaging verdict.",
      "At 7 days: second snapshot. This one goes into the weekly import anyway, but check the retention graph manually for the drop-off points.",
    ],
    examples:
      "The bet sentence matters: 'Betting the contrarian hook works for our audience' turns a video into an experiment. Twenty videos later you have twenty tested bets instead of twenty guesses.",
  },
  {
    title: "Competitor Outlier Review",
    category: "research",
    purpose:
      "Outliers are free R&D — someone else spent money discovering what the audience wants. Your job is extracting the mechanism, not copying the video.",
    whenToUse: "Weekly rhythm meeting, whenever the loop flags a new outlier.",
    steps: [
      "For each flagged outlier, answer: is this the TOPIC winning (demand) or the PACKAGING winning (craft)? They transfer differently.",
      "Write the mechanism in one sentence in 'why it worked' — 'forbidden-knowledge framing' transfers; 'video about Asherah' doesn't.",
      "Check the comments: what are viewers actually responding to? Often it's not what you'd guess.",
      "If the mechanism fits one of our channels, create an idea and link the competitor video as evidence.",
      "If we see the same mechanism in 3+ outliers, propose an update to the relevant packaging or structure SOP.",
    ],
    examples:
      "Three religion-niche outliers all use suppression framing ('the book they chained', 'the goddess they erased') → that's a pattern, not a coincidence → test it on two of our uploads → measure → codify or discard.",
  },
];

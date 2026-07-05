// The speed stack, structured for in-app display. Prices are indicative
// (checked July 2026) — the app links out; it never charges or integrates
// billing. Each tool maps to the production stage it accelerates so the team
// sees WHERE in the pipeline it helps, not just a flat list.
//
// Full write-up with sources: docs/SPEED_STACK.md.

import type { ProductionStage } from "@/types";

export interface SpeedTool {
  name: string;
  url: string;
  why: string;
  price: string;
  free?: boolean;
}

export interface SpeedCategory {
  id: string;
  title: string;
  stage: ProductionStage;
  intro: string;
  tools: SpeedTool[];
}

export const SPEED_STACK: SpeedCategory[] = [
  {
    id: "voiceover",
    title: "AI voiceover",
    stage: "scripting",
    intro:
      "Lock the script, generate broadcast-quality narration in minutes. The single biggest unlock for narration-driven channels — clone one voice per channel and reuse it across all 30 videos.",
    tools: [
      {
        name: "ElevenLabs",
        url: "https://elevenlabs.io",
        why: "The quality benchmark — natural pacing, emotion from punctuation. Best for documentary narration.",
        price: "Free tier; paid from ~$5/mo",
        free: true,
      },
      {
        name: "Murf AI",
        url: "https://murf.ai",
        why: "200+ voices across 20 languages; easy per-video style tweaking.",
        price: "~$19–29/mo",
      },
      {
        name: "PlayHT",
        url: "https://play.ht",
        why: "Voice cloning for one consistent channel voice across a whole batch.",
        price: "~$29/mo",
      },
      {
        name: "Amazon Polly",
        url: "https://aws.amazon.com/polly/",
        why: "Cheapest at scale (~$16 / 1M chars neural) when the quality bar allows.",
        price: "Pay per character",
      },
    ],
  },
  {
    id: "editing",
    title: "AI / assisted editing",
    stage: "editing",
    intro:
      "Let AI do the assembly pass; a human does the retention pass (your SOP stays the quality gate). Log which workflow each video used so the loop can compare retention by workflow.",
    tools: [
      {
        name: "Descript",
        url: "https://www.descript.com",
        why: "Text-based editing — edit the transcript, the cut follows. Ideal when VO drives the edit.",
        price: "~$24/mo Creator",
      },
      {
        name: "CapCut",
        url: "https://www.capcut.com",
        why: "Fastest mobile↔desktop workflow, huge template library, generous free tier.",
        price: "Free; Pro ~$8/mo",
        free: true,
      },
      {
        name: "DaVinci Resolve",
        url: "https://www.blackmagicdesign.com/products/davinciresolve",
        why: "Free and professional-grade; steeper curve but no ceiling.",
        price: "Free (Studio $295 once)",
        free: true,
      },
    ],
  },
  {
    id: "visuals",
    title: "Stock footage & visuals",
    stage: "editing",
    intro:
      "List the b-roll each script section needs BEFORE editing starts, then batch-download in one session. For history/religion topics, AI stills + slow zooms are a proven documentary style at near-zero cost.",
    tools: [
      {
        name: "Storyblocks",
        url: "https://www.storyblocks.com",
        why: "Unlimited downloads, broad library — the volume workhorse.",
        price: "~$21–40/mo (annual)",
      },
      {
        name: "Artgrid",
        url: "https://artgrid.io",
        why: "Cinematic footage; universal license survives cancellation.",
        price: "~$30–50/mo (annual)",
      },
      {
        name: "Pexels",
        url: "https://www.pexels.com/videos/",
        why: "Free stock for filler b-roll.",
        price: "Free",
        free: true,
      },
      {
        name: "Midjourney",
        url: "https://www.midjourney.com",
        why: "AI stills for historical/abstract topics no stock library covers.",
        price: "$10–30/mo",
      },
    ],
  },
  {
    id: "packaging",
    title: "Thumbnails & packaging",
    stage: "packaging",
    intro:
      "Write the thumbnail concept in the video doc at approval time; a per-channel Canva template makes production a 15-minute task. YouTube's own Test & Compare is the ground truth — it optimizes for watch time, not just clicks.",
    tools: [
      {
        name: "YouTube Test & Compare",
        url: "https://support.google.com/youtube/answer/14859041",
        why: "Native A/B on up to 3 thumbnails against real viewers, optimizing for watch time. Free.",
        price: "Free",
        free: true,
      },
      {
        name: "Canva",
        url: "https://www.canva.com",
        why: "Fast thumbnail production with brand templates per channel.",
        price: "Free; Pro ~$13/mo",
        free: true,
      },
      {
        name: "ThumbnailTest",
        url: "https://thumbnailtest.com",
        why: "Pre-publish testing of 10+ variants when the native 3-slot limit binds.",
        price: "~$10–20/mo",
      },
      {
        name: "TubeBuddy",
        url: "https://www.tubebuddy.com",
        why: "A/B testing with statistical significance, plus SEO tooling.",
        price: "~$10–30/mo",
      },
    ],
  },
];

/** Starter stack for the 30-video sprint, ~$50–75/mo. */
export const STARTER_STACK = [
  "ElevenLabs (Creator) — one cloned voice per channel",
  "CapCut Pro or DaVinci (free) — editor's choice",
  "Storyblocks + free Pexels — volume b-roll",
  "Canva Pro + native Test & Compare — packaging",
];

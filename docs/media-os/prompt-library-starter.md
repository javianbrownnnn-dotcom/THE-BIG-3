# 🤖 Prompt Library — Starter Set (v1.0)

Seed content for the [Prompt Library database](https://github.com/javianbrownnnn-dotcom/notion/blob/claude/youtube-media-os-notion-kovjm5/databases/prompts.md). Each becomes a PRM row with the page template (about → prompt → gold example → failure modes → version log). `{{variables}}` are filled at use time. All v1.0 — expect fast iteration; that's what the version log is for.

---

## PRM-001: Research Brief (Category: Research)

> You are a documentary researcher for a YouTube channel about {{niche}}. Topic: {{topic}}. Angle: {{angle from idea row}}.
> Produce: (1) a 300-word narrative summary of the story; (2) a chronological timeline of key events with dates; (3) the 5 most surprising verifiable facts, each with the type of primary source that would confirm it; (4) key characters and their motivations; (5) the central tension/open question that makes this a story rather than a report; (6) 3 aspects commonly gotten wrong or oversimplified; (7) a list of archival footage/imagery this story would need.
> Mark every claim [NEEDS SOURCE]. Do not present anything as fact that you cannot trace. If sources conflict, present both versions.

**Failure modes:** invented citations; confident dates that are wrong; missing recent developments. Human verifies every claim per SOP-001.

## PRM-002: Outline (Category: Storytelling)

> Using this verified research brief: {{brief}}, and this channel story structure: {{structure from channel spec}}, build a beat-by-beat outline for a {{length}}-minute documentary video.
> Requirements: a 30-second cold open that poses the central question without answering it; 3–5 acts, each ending on an open loop; the payoff withheld until {{%}} through; a final beat that sets up {{related video}} if provided. For each beat: what the viewer learns, what question keeps them watching, suggested visuals.

## PRM-003: Script Draft (Category: Script Writing)

> Write act {{n}} of the script from this approved outline: {{outline beats}}, in this exact voice: {{brand voice spec}}. Length ≈ {{words}} words. Rules: short sentences; concrete nouns over abstractions; no claim not present in the research brief; conversational but authoritative; write for the ear (it will be narrated). Include [VISUAL: …] directions each 2–3 sentences. Never open with "In the world of…" or any banned phrase from the voice spec.

**Failure mode:** smuggling in "common knowledge" not in the brief — reviewer checks per SOP-005.

## PRM-004: Title Generator (Category: Titles)

> Video promise: {{one-line promise}}. Thumbnail concept: {{concept}}. Channel: {{channel + 3 recent titles for voice}}.
> Generate 15 titles across these frames: open question / bold claim / number+stakes / "the real reason" / timeline ("the 48 hours that…"). Rules: <60 chars, honest to content, must NOT repeat the thumbnail text, curiosity gap explicit. Then rank your top 5 with one line each on why.

## PRM-005: Hook Writer (Category: Hooks)

> Script summary: {{summary}}. Central question: {{question}}. Write 3 alternative 30-second cold opens (~75 words each): (a) in-media-res scene drop; (b) shocking-fact-first; (c) direct-address question. Each must state or strongly imply the video's promise within 15 seconds and end on an open loop. Write for narration, not reading.

## PRM-006: Thumbnail Concepts (Category: Thumbnails)

> Video promise: {{promise}}. Emotional target: {{emotion from idea}}. Channel thumbnail style guide: {{style rules}}. Competitors' thumbnails on this topic: {{descriptions/links}}.
> Propose 5 thumbnail concepts that would stand out in THIS sidebar. For each: focal image, ≤4 words of text (or none), composition, why it creates a click without lying. Flag any concept that risks over-promising.

## PRM-007: SEO Package (Category: SEO)

> Final title: {{title}}. Script: {{script or summary}}. Produce: 2-line description hook; chapter list with timestamps from these beats {{beats}}; 20 tags (broad→specific); 3 pinned-comment question options; end-screen recommendation from this list of our videos {{list}}.

## PRM-008: Analytics Narrative (Category: Analytics)

> Here are this week's channel snapshot rows and 24h/7d video snapshots: {{data}}. Prior 8-week context: {{data}}.
> Write the weekly scoreboard commentary: (1) what materially moved and the most likely cause, tied to a specific video or change; (2) anything anomalous worth a human look; (3) one hypothesis worth testing next, framed as measurable. Max 200 words. Never claim causation from n<5; say "insufficient sample" instead.

## PRM-009: Competitor Breakdown (Category: Competitor Analysis)

> Transcript of competitor video hook (first 60s): {{transcript}}. Title: {{title}}. Thumbnail: {{description}}. Views vs channel average: {{ratio}}.
> Analyze: the promise made, how the curiosity gap is constructed, hook structure beat-by-beat, what the packaging promises vs what the content likely delivers, and 2 specific things we could execute better for our audience {{our channel persona}}. Do NOT suggest copying — suggest outperforming.

## PRM-010: Sponsor Outreach (Category: Outreach)

> Prospect: {{company, what they sell, who they've sponsored — from CRM row}}. Our channel: {{channel, audience persona, key stats: retention, CTR, demo}}.
> Draft a 120-word cold email: subject line ≤6 words; first line about THEIR campaign goal, not us; one proof stat (retention or audience match, not raw subs); a specific integration idea for their product in our format; soft CTA (15-min call). No hype adjectives. Then draft the D+4 follow-up (40 words).

**Rule:** F2 edits every send. AI never emails anyone directly (policy §2).

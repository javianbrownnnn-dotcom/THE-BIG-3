# 🤖 AI Integration Policy

Company-wide rules for how AI is used. Every SOP and database carries a local AI table; this page is the constitution they inherit from. Owner: Founder 1.

## 1. The operating principle

**AI drafts, humans decide.** AI is a force multiplier on the expensive middle of every workflow (research synthesis, first drafts, tagging, ingestion, summarization). Humans own the two ends: *judgment going in* (what to make, what's true, what's on-brand) and *accountability going out* (what ships, what's said to a sponsor, who gets hired).

## 2. The three-tier rule (applies to every workflow)

| Tier | Definition | Examples |
|---|---|---|
| 🤖 **AI does** | High-volume, reversible, checkable work | research brief drafts, outline/script v1, title/hook candidates, tag suggestions, metric ingestion, meeting minutes, outreach drafts, SOP drafts from transcripts, anomaly flags |
| 👁 **Human reviews** | Anything AI produced that a viewer, sponsor, candidate, or court might see — reviewed at the *claim* level, not skim level | every factual claim (against sources), every script line (voice + truth), every external email, every packaging choice, every score |
| 🚫 **Never automated** | Decisions with money, people, law, or the publish button attached | publishing, QA sign-off, asset/fair-use clearance, hiring & firing, pricing & contracts, kill/scale channel calls, sensitive-niche claims (crime/health/religion) resting on AI verification alone |

## 3. Hard rules

1. **No AI text ships unread.** "AI wrote it" is never part of any incident explanation, because a named human approved everything that ships.
2. **Citations are verified by opening them.** AI-fabricated sources are the #1 known failure mode for documentary work.
3. **Production prompts live in the [Prompt Library](https://github.com/javianbrownnnn-dotcom/notion/blob/claude/youtube-media-os-notion-kovjm5/databases/prompts.md) only.** Personal ad-hoc prompts for shipped work are banned — untracked prompts mean untraceable quality drift.
4. **Label AI drafts in-page** (`🤖 draft — unverified`) until a human clears them. Nobody should ever wonder which parts were checked.
5. **Platform compliance:** follow YouTube's synthetic-content disclosure requirements wherever they apply (AI voice, generated imagery). We disclose where required — as an AI-heavy faceless operation, this is platform-risk management, not paperwork. Re-check the policy quarterly (Automations registry has a recurring task).
6. **Privacy:** no candidate personal data, sponsor contract terms, or pay data pasted into consumer AI tools; use API/enterprise endpoints per tool policy in the registry.

## 4. AI voice decision (per channel, decided at launch, recorded in the Channel's Brand Voice spec)

- Allowed where the channel spec says so, **with** disclosure per platform rules, a locked voice profile (consistency = brand), and human QA of every render (mispronunciations, pacing).
- Preferred for: high-volume/experimental channels. Human VO preferred for: flagship channels where narrator identity is the moat.

## 5. Where AI is deliberately pointed (the leverage map)

Highest ROI first: 1) research briefs · 2) script first drafts · 3) metrics ingestion + narrative · 4) idea intake & scoring assist · 5) competitor breakdown at scale · 6) SOP drafting from Looms · 7) outreach drafting · 8) knowledge-base Q&A for onboarding. This ordering is why prompts PRM-001…003 and AUT-002 are built in Phase 1.

## 6. Review cadence

Quarterly (in Quarterly Planning): rate the prompt library, re-check platform AI policies, review anything that moved between tiers, and audit one workflow end-to-end for silent AI-quality drift.

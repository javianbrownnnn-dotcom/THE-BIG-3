# 03 — Scaling Playbook: 10 Channels, 100 People, New Revenue Streams

The OS is designed so that scale changes *volume and permissions*, never *structure*. This doc is the proof — and the trigger list for when to change what.

## Scaling channels: 1 → 3 → 10

| Trigger | Change | What does NOT change |
|---|---|---|
| Channel #2 | New Channels row from template (SOP-011); assign Channel Lead; VO artist per channel | Databases, pipeline stages, SOPs, scoring model |
| Channel #4–5 | Per-channel Notion teamspaces (hub = homepage); Ideas/Videos views default-filtered by team | The central databases — teamspaces contain only linked views |
| Channel ~10 | BI layer (Metabase/Looker) reads Metrics Snapshots + Finance via API; Notion stays system of record for work & decisions | The snapshot schema (it was shaped for this export from day 1) |

**Kill discipline:** a channel that misses its Health criteria for two consecutive quarters gets a kill/fix decision at Quarterly Planning. The portfolio thesis only works if losers die fast; the Finance layer exists so this is a numbers conversation.

## Scaling people: 3 → 15 → 50 → 100

**3 → 15 (freelancer web):** every hire = Applicants → trial → People → pipeline stages reassigned from founders. Watch `Founder hours per published video` fall; if it doesn't, the hire didn't take work, it added coordination.

**~15 (first managers):** Head of Production (inherits the Production dashboard as-is — that's why it was built role-shaped, not person-shaped), then Channel Leads. Founders move to: F1 strategy/AI/analytics, F2 revenue org, F3 production org.

**~50:** functional teams (research pod, edit pod per 2–3 channels, packaging pod, sales team). The Tasks `By Stage` batch views become team queues without modification. Add: HR-restricted teamspace, finance hire owns the Finance DBs, dedicated QA role (finally ending founder-QA).

**~100:** the org chart lives in People (add `Reports To` self-relation, added at ~30 people); onboarding is fully self-serve (SOP-009 + Canon + role templates); the OS audit becomes an ops-team function.

**The invariant at every stage:** a new person receives — a People row with checklist, their role's SOPs, their dashboard, their `My Plate`. If any of the four is missing, hiring is broken, not busy.

## Scaling volume: thousands of videos, millions of subs

- Archive discipline: Videos → `Archived` after performance review; archived views filter them out everywhere; Notion stays fast because working sets stay small.
- IDs and naming conventions (`[CODE]`, SOP-###, PRM-###, AUT-###) exist so search scales when memory doesn't.
- The tagging discipline (Hook Type, Story Structure, Thumbnail Style) is what turns 1,000 published videos into a proprietary dataset — this becomes the actual moat: *you will know your niches' packaging physics better than anyone who didn't log it.*

## New revenue streams (the OS already has sockets for them)

| Stream | Where it lands |
|---|---|
| Merchandise / Courses / Software | New `Stream` values in Revenue; a product = a page + Tasks; if it grows, it gets its own DB *modeled on Videos* (product pipeline, stages, owners) — the pattern is reusable |
| Licensing (footage, format, translations) | Deals DB with `Type` select extended beyond sponsorship; Assets DB already tracks what you own outright (only `Owned/Commissioned` assets are licensable — the license fields pay off again) |
| Events | Meetings-pattern DB + Tasks; ticket revenue → Revenue |
| Multi-language channel clones | New Channels rows; translation stages appended to the pipeline template (TheSoul model) |

Rule: every new stream reports into the same Revenue DB from day one, so the concentration KPI stays honest.

## What to re-evaluate, on triggers (not on vibes)

| Trigger | Re-evaluate |
|---|---|
| Weekly meeting > 60 min | split per-team syncs; HQ keeps the scoreboard |
| Notion relation sprawl slows a DB | archive pass; consider splitting per-year Snapshot DBs |
| > 20 automations | dedicated ops owner for the registry; n8n self-hosted for cost |
| First legal letter or strike | rights counsel on retainer; Assets `Fair-use` view becomes weekly review |
| A second office/timezone cluster | async-first meeting templates (written scoreboard commentary precedes, meeting discusses exceptions only) |

The end state to protect: **any founder can leave for a month, and the scoreboard, the factory board, and the SOPs keep the machine running.** Every scaling decision above either moves toward that or shouldn't happen.

# Research Archive — Business / Modern Ambition Documentaries (July 2026)

Raw source files from the first Competitive Intelligence research cycle for the
business niche. The **consolidated, readable deliverable** is
[`docs/COMPETITIVE_INTELLIGENCE_BUSINESS.md`](../../docs/COMPETITIVE_INTELLIGENCE_BUSINESS.md)
— start there. These files are kept for provenance: every competitor row, idea,
and pattern insight seeded into the app traces back to them.

| File | What it is |
|------|-----------|
| `channels-deep-dive.json` | 25 channels, full structured schema (metrics, positioning, strengths/weaknesses, blind spots) — source of the rich Competitors rows |
| `channels-list-working.json` | Initial 40-channel working list with tier classification + research status |
| `patterns-and-insights.md` | Full pattern analysis (thumbnails, hooks, titles, story, pacing, voice, publishing, monetization, audience) — source of the Knowledge Base insights |
| `opportunities-threats-ideas.md` | 20 opportunities, 20 threats, 20 video ideas, experiments, 12-month projection — source of the deduplicated Ideas |
| `RESEARCH-SUMMARY.md` | Executive summary as originally produced |

## Where this data lives in the app

The dataset is loaded into the demo seed (`src/lib/data/ciBusinessSeed.ts`):

- 35 competitor rows → **Competitors** (25 deep-dived + 10 watchlist; the
  existing Magnates Media row was extended in place, not duplicated)
- Deduplicated opportunities + video ideas → **Ideas** (niche-level concepts
  tagged `niche`; videos carry their CTR/RPM/evergreen/difficulty scores)
- Pattern insights → **Insights** (kind `pattern` / `competitor`, each ending
  in a "what we do differently" line)
- "Founder Reality" positioning + 12-month projection → **Channels**

**Next cycle:** Q4 2026 (October). Re-run the CI agent per
[`docs/media-os/04-competitive-intelligence-agent.md`](../../docs/media-os/04-competitive-intelligence-agent.md);
deep-dive the watchlist channels and refresh sponsor CPMs + emerging channels.
Future niches get sibling folders here (e.g. `research/christianity/`).

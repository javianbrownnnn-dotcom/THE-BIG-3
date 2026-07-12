# Research Archive — Christianity & Religious-History Documentaries (July 2026)

Raw source files from the second Competitive Intelligence research cycle. The
**consolidated, readable deliverable** is
[`docs/COMPETITIVE_INTELLIGENCE_CHRISTIANITY.md`](../../docs/COMPETITIVE_INTELLIGENCE_CHRISTIANITY.md)
— start there. Every competitor row, idea, and insight seeded into the app
traces back to these files.

| File | What it is |
|------|-----------|
| `channels-list-working.json` | 40-channel working list with tier classification + research status (sub counts web-verified 2025–2026 where possible) |
| `channels-deep-dive.json` | 25 channels, full structured schema — source of the rich Competitors rows |
| `patterns-and-insights.md` | Full pattern analysis (packaging, hooks, structure, voice, cadence, patronage-first monetization, audience, saturation) |
| `opportunities-threats-ideas.md` | 20 opportunities, 20 threats, 20 video ideas, experiments, 12-month projection for Myth & Meaning |
| `RESEARCH-SUMMARY.md` | Executive summary |

## Where this data lives in the app

Seeded via `src/lib/data/ciChristianitySeed.ts`:

- 35 competitor rows → **Competitors** (23 deep-dived + 10 watchlist;
  **ReligionForBreakfast and Esoterica were extended in place** — they were
  already tracked, so no duplicate rows)
- Deduplicated opportunities + video ideas → **Ideas** (all on the existing
  Ancient Religions & Storytelling channel; no overlaps with its 3
  pre-existing pipeline ideas)
- Pattern insights → **Insights** (each ending in a "what we do differently" line)
- §9 projection → new goals on the existing **Channels** entry (93K subs,
  ~$7.6K/mo by month 12 — this cycle upgrades an existing channel, unlike
  the business cycle's new Founder Reality channel)

**Next cycle:** Q4 2026 (October). Re-run the CI agent per the brief in the
[notion repo](https://github.com/javianbrownnnn-dotcom/notion/blob/claude/youtube-media-os-notion-kovjm5/docs/04-competitive-intelligence-agent.md);
deep-dive the watchlist channels and refresh patron-conversion ratios.

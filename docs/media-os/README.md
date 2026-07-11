# Media OS reference docs

Strategy and process material carried over from the Notion "Media OS"
specification (`javianbrownnnn-dotcom/notion`). Only the durable, app-agnostic
documents were ported — the spec's database schemas, dashboards, starter SOPs,
and build script were **deliberately not copied** because this app already
implements those as software (entities in `src/types/index.ts`, pages in
`src/features/`, seeded SOPs, and the starter playbook).

| Doc | What it is |
|-----|-----------|
| `00-strategic-analysis.md` | Bottlenecks and blind spots in the current operating model — read before building anything new |
| `03-scaling-playbook.md` | How the OS scales: 1→10 channels, 3→100 people, new revenue streams |
| `04-competitive-intelligence-agent.md` | The CI agent brief — the repeatable Phase 1–5 research framework that produced the business-niche report |
| `ai-integration-policy.md` | The three-tier AI usage policy (where AI drafts, where it assists, where humans decide) |
| `prompt-library-starter.md` | Starter prompt set (research brief, outline, script, titles, hooks, thumbnails, SEO) |

Related: the business-niche CI deliverable is
[`docs/COMPETITIVE_INTELLIGENCE_BUSINESS.md`](../COMPETITIVE_INTELLIGENCE_BUSINESS.md);
raw research in [`research/business-modern-ambition/`](../../research/business-modern-ambition/).

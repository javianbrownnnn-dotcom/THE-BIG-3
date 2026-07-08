# AI pipeline

The Claude-powered surfaces share one grounding layer
(`supabase/functions/_shared/context.ts`): channels, recent videos with their
latest metrics, active SOPs, competitor outliers, recent insights, and open
recommendations. Same facts everywhere → consistent strategy.

## 1. AI Coach (`functions/ai-coach`)

Interactive strategist. Invoked with the caller's JWT so RLS scopes all reads;
conversation history is persisted in `ai_conversations` / `ai_messages`.

The system prompt enforces the product's epistemics: ground every claim in the
provided data, flag small sample sizes, prefer testable recommendations, and
route durable changes into SOPs.

Example questions it's designed for:
- "What caused CTR to drop?"
- "Show our best-performing storytelling structure."
- "What hook type performs best?"
- "What should Robert test next month?"

In demo mode the coach computes answers directly from the seeded dataset
(group means by hook/structure, channel deltas), so the demo is honest — it
never fabricates numbers.

## 2. Learning loop (`functions/learning-loop`)

Runs daily with the service role (GitHub Action → edge function). Per org:

| Step | Mechanism |
|---|---|
| Detect metric shifts | Welch's t on the last 4 videos vs. the prior baseline, for CTR and percent-viewed |
| Detect competitor outliers | z ≥ 2.0 on latest views/day vs. the competitor channel's own distribution |
| Score past recommendations | before/after cohort comparison on videos linked to the SOP; `testing → validated/failed` |
| Interpret | Claude receives the detected changes + full context, returns strict JSON: insights and recommendations |
| Draft SOP versions | when evidence is strong, the loop INSERTs a new `sop_versions` row (`source = 'ai'`) — append-only, team reviews before adopting |
| Notify | `ctr_drop`, `retention_improved`, `competitor_outlier`, `ai_recommendation` notifications |

Two deliberate constraints:

1. **Statistics gate the LLM.** If nothing statistically interesting happened,
   Claude is not called. No noise, no cost.
2. **Claude interprets, never measures.** Detected numbers travel with the
   insight (`data` jsonb); confidence reflects both model judgment and the
   test statistic.

## 3. Report generation (`functions/generate-report`)

On demand from the Reports page (and schedulable). Fixed markdown skeleton
(Summary / What worked / What didn't / Competitor landscape / Experiments &
SOP changes / Recommended focus), filled by Claude from the shared context,
stored in `reports.content_md`, exportable as-is.

## 4. Writing & Shorts (`functions/ai-write`, `functions/ai-shorts`)

`ai-write` drafts a first pass for a production doc (hook, script outline,
description, five title candidates) grounded in the org's SOPs and data; the
app only fills empty fields with it. It reads `productions.format` and switches
to short-form guidance (full 110–160 word script, 2-second hook) for Shorts.

`ai-shorts` cuts a long-form script into N self-contained Shorts (cold claim →
one proof → twist → loop back). The client turns each into its own production
doc (`format = 'short'`, stage scripting) so Shorts run the normal pipeline
and their published videos carry `videos.format = 'short'` for like-with-like
analytics. Both run with the caller's JWT; demo mode mirrors them with local
template engines so the flow works without a backend.

## Configuration

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-…
supabase secrets set CLAUDE_MODEL=claude-sonnet-5   # optional override
```

The scheduled loop needs `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as
GitHub repository secrets (see `.github/workflows/learning-loop.yml`).

## Extending the pipeline

- **New detector**: add a function in `learning-loop/index.ts` that returns
  findings; include them in `detected_changes`. The prompt contract doesn't
  change.
- **New AI surface**: import `loadOrgContext` + `askClaude`, write a system
  prompt, deploy. Grounding comes for free.
- **Automations**: the `automations` table stores `{trigger, actions}` jsonb —
  the execution engine can be an edge function that subscribes to the same
  events as notifications.

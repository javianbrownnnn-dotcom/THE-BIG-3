# The Big 3 OS — working notes for Claude Code

AI-powered operating system for a three-person YouTube media company. The
product's one job: answer "what should we change next to consistently make
better videos?" via a continuous learning loop (collect → analyze → learn →
update SOPs → repeat).

## Commands

```bash
npm run dev        # dev server on :5173
npm run build      # tsc -b && vite build — run this before committing
npm run preview    # serve dist on :4173
```

No test suite yet. Verification is `npm run build` + driving the app
(headless Chromium is preinstalled; Playwright lives at
`/opt/node22/lib/node_modules/playwright`).

## Architecture in one minute

- Pages (in `src/features/<area>/`) call hooks in `src/hooks/queries.ts`,
  which call the `DataProvider` interface (`src/lib/data/provider.ts`).
  **Never import Supabase in a page.**
- Two providers: `demo.ts` (seeded in-memory company, persists edits to
  localStorage, runs with zero setup) and `supabase.ts` (real backend, RLS).
  Selection happens once in `src/lib/data/index.ts` based on
  `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.
- Domain types live in `src/types/index.ts` (camelCase mirror of the SQL
  schema). Keep both providers conforming to them.
- Backend: `supabase/migrations/` (append-only history is enforced by
  triggers — metric snapshots and SOP versions can never be UPDATEd/DELETEd)
  and `supabase/functions/` (ai-coach, learning-loop, generate-report; all
  ground Claude through `_shared/context.ts`).

## Invariants — do not break

- **History is append-only.** New SOP content = new `sop_versions` row; new
  metrics = new snapshot row. Never mutate old rows.
- **Statistics gate the LLM.** The learning loop only calls Claude when a
  detector (t-test, z-score) found something. Claude interprets numbers, it
  never invents them. The demo coach computes answers from actual demo data.
- **Chart colors** come from CSS variables (`--series-1…6`, `--chart-*`) —
  a CVD-validated palette with separate light/dark steps. Series hues are
  assigned in fixed order, never cycled; status colors are never reused as
  series colors. Read them via `useChartTheme()` (SVG attrs can't do var()).
- **Demo parity**: any new provider method must be implemented in BOTH
  `demo.ts` and `supabase.ts` (add to the interface first).
- Dark mode first: `<html class="dark">` is the default; tokens live in
  `src/index.css`.

## Deploy

Pushing to `main` or the working branch triggers
`.github/workflows/deploy-pages.yml` → GitHub Pages (demo mode, base path
`/THE-BIG-3/`). The scheduled learning loop is
`.github/workflows/learning-loop.yml` (needs SUPABASE_URL +
SUPABASE_SERVICE_ROLE_KEY repo secrets).

## Docs

`docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, `docs/AI_PIPELINE.md` — update
them when the shape of the system changes.

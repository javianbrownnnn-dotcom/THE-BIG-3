# Architecture

## Design goals

- **The learning loop is the product.** Every module either feeds data into
  the loop (videos, competitors), stores what the loop learns (insights,
  recommendations, SOP versions), or acts on it (coach, reports,
  notifications).
- **Multi-tenant from day one.** Everything hangs off `organizations`; access
  is enforced by Postgres RLS, not application code. Scaling to thousands of
  orgs is a data problem, not a rewrite.
- **History is sacred.** Metric snapshots and SOP versions are append-only at
  the database level (triggers reject UPDATE/DELETE). Trend analysis and
  outcome measurement depend on this.
- **Runs with zero setup.** The frontend talks to a `DataProvider` interface.
  With Supabase env vars it uses the real backend; without them a seeded demo
  provider makes the entire product explorable offline.

## System overview

```
┌────────────────────────────────────────────────────────────┐
│  React SPA (Vite + TS + Tailwind + shadcn-style UI)        │
│                                                            │
│  pages ──► TanStack Query hooks ──► DataProvider interface │
│                                        │            │      │
│                                   DemoProvider  SupabaseProvider
└────────────────────────────────────────│────────────│──────┘
                                         │            ▼
                              seeded in-memory   Supabase (Postgres+RLS,
                              company            Auth, Realtime, Storage)
                                                      │
                              ┌───────────────────────┼──────────────┐
                              ▼                       ▼              ▼
                        ai-coach (edge)     generate-report   learning-loop
                        user JWT + RLS      (edge, user JWT)  (edge, service
                              │                   │            role, scheduled
                              └─────── Claude API ┴───────────  by GH Action)
```

## Folder structure

```
src/
  components/
    ui/          shadcn-style primitives (button, dialog, table, command…)
    charts/      chart system: theme tokens, TrendChart, BarBreakdown, MetricCard
    layout/      AppShell, Sidebar, Topbar, CommandPalette, PageHeader, EmptyState
    Markdown.tsx dependency-free renderer for AI answers/reports
  features/      one folder per nav area (dashboard, channels, videos,
                 competitors, ideas, sops, reports, coach, settings)
  hooks/         queries.ts (all TanStack Query hooks + keys), useTheme
  lib/
    data/        provider.ts (interface), supabase.ts, demo.ts, index.ts (selection)
    format.ts    number/date/percent formatting
    utils.ts     cn()
  types/         domain types shared by every layer
supabase/
  migrations/    full schema: tenancy, RLS, append-only history
  functions/     ai-coach, learning-loop, generate-report, _shared/
.github/workflows/learning-loop.yml   daily scheduled loop
```

## Key decisions

### One data interface, two implementations
Pages never import Supabase. They call hooks in `src/hooks/queries.ts`, which
call the `DataProvider` interface (`src/lib/data/provider.ts`). This keeps
every feature testable, makes demo mode a first-class citizen, and means a
future provider (e.g. local-first sync) is a single file.

### AI context is centralized
`supabase/functions/_shared/context.ts` builds the "company picture"
(channels, recent videos with metrics, active SOPs, competitor outliers, open
recommendations) once. The coach, the learning loop, and report generation all
consume the same context, so every AI feature reasons over the same facts.

### Statistics before LLM
The learning loop runs cheap statistics first (Welch's t-test on recent vs.
baseline windows; z-scores on competitor views/day) and only calls Claude when
something actually changed. The LLM interprets detected changes — it never
invents them. Insights carry the raw evidence in a `data` jsonb column.

### Permissions
Roles are ordered `viewer < editor < admin < owner`. The SQL helper
`has_org_role(org, min_role)` implements the ordering once; every policy uses
it. The standard grid: members read, editors write, admins delete,
append-only tables accept inserts only.

### Charts
Chart colors come from a CVD-validated palette exposed as CSS custom
properties (`--series-1…6`, `--chart-grid`, …) with separate steps for light
and dark surfaces. `useChartTheme()` resolves them at runtime (SVG attributes
can't resolve `var()`) and re-reads on theme change. Series hues are assigned
in fixed order, never cycled; status colors are reserved and never reused as
series colors.

### Video Builder (the video gets made in-app)

`/production/:id/build` turns a doc's script into recordable sections. The
narration is a human voice by explicit design decision — recorded on the
device mic (MediaRecorder) with a teleprompter, or uploaded; no AI narration.
B-roll comes from Pexels through the `broll-search` edge function (key stays
server-side; demo simulates results). Captions (SRT) take their timing from
the actual recorded durations. Shorts render to a real 1080×1920 WebM in the
browser (canvas + AudioContext + MediaRecorder — realtime, so a 45s Short
takes 45s); long-form exports an edit kit (narration files, captions.srt,
timed shot list) for CapCut/DaVinci. Builder state is `productions.builder`
jsonb (migration 0016). Live b-roll needs the `PEXELS_API_KEY` secret
(free key from pexels.com/api).

## UX systems

- **Command palette** (⌘K): navigation + global search over videos and SOPs.
- **Keyboard shortcuts**: `g` then `d/c/v/x/i/s/r/a` to jump between areas.
- **Dark mode first**: `<html class="dark">` by default, light mode persisted
  as the exception; theme applied pre-paint to avoid flash.
- **Empty states** on every list, with the next action inline.
- **Skeletons** for loading, `animate-fade-in` for page transitions.

## Scaling notes

- All list queries are org-scoped and indexed (`videos(channel_id,
  published_at)`, `notifications(user_id, created_at)`, …).
- Views (`video_current_metrics`, `sop_current_versions`) answer the two
  hottest read patterns without denormalizing.
- The learning loop iterates per-organization, so it parallelizes trivially by
  sharding orgs across invocations when the tenant count grows.
- Realtime (Supabase channels) can be layered onto notifications without
  schema changes.

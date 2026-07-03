# The Big 3 OS

An AI-powered operating system for YouTube media companies. Not a project
management tool — an intelligent platform whose job is to continuously improve
your content system using performance data.

It exists to answer one question:

> **"What should we change next to consistently make better videos?"**

## The learning loop

Everything is built around one cycle:

```
Collect data → Analyze → Find patterns → Update SOPs → Repeat forever
```

1. **Collect** — video metric snapshots and competitor metrics accumulate as
   append-only history (nothing is ever overwritten).
2. **Analyze** — a scheduled job detects statistically meaningful changes
   (Welch's t on CTR/retention windows, z-score outliers on competitor
   views/day).
3. **Learn** — Claude turns detected changes into insights and concrete SOP
   recommendations, drafting new SOP versions where evidence is strong.
4. **Update** — the team accepts, tests, or rejects. SOP versions are
   append-only: every revision is kept forever.
5. **Measure** — the loop scores its own past recommendations against videos
   published after adoption, so the system learns which of its suggestions
   actually worked.

## Quick start (zero setup)

```bash
npm install
npm run dev
```

Without Supabase credentials the app boots in **demo mode**: a fully seeded
three-channel media company (Business Storytelling, Ancient Religions &
Storytelling, Sales Psychology) with realistic patterns baked into the data —
so every screen, chart, and even the AI Coach works out of the box.

## Running against a real backend

1. Create a Supabase project and apply `supabase/migrations/0001_init.sql`
   (or `supabase db push` with the CLI).
2. Deploy the edge functions:
   ```bash
   supabase functions deploy ai-coach learning-loop generate-report
   supabase secrets set ANTHROPIC_API_KEY=sk-ant-…
   ```
3. Copy `.env.example` → `.env.local` and fill in `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_ANON_KEY`.
4. (Optional) Add `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` as GitHub
   repository secrets to enable the scheduled learning loop
   (`.github/workflows/learning-loop.yml`, daily at 06:00 UTC).

## What's inside

| Area | What it does |
|---|---|
| **Dashboard** | 30-day KPIs with deltas and sparklines, CTR trend by channel, open recommendations, competitor outliers, ideas queue, SOP review alerts, activity |
| **Channels** | One brand per channel: owner, niche, cadence, goals, per-video performance history |
| **Videos** | Packaging decisions (hook, structure, topic, format) + full metric snapshot history per video |
| **Competitors** | Tracked channels and videos with views/day, velocity, and automatic statistical outlier flags |
| **Ideas** | Fast capture → research → approve → production board with priorities, tags, and links to evidence |
| **SOPs** | The heart of the platform. Versioned forever, never overwritten, with AI-authored revisions and linked evidence |
| **Reports** | AI-written weekly/monthly/quarterly/channel/competitor reports, exportable as markdown |
| **AI Coach** | Natural-language strategist grounded in your real data; recommendation lifecycle with measured outcomes |
| **Settings** | Members & roles, integrations, appearance, keyboard shortcuts |

## Stack

React 18 · TypeScript · Vite · Tailwind CSS · shadcn/ui-style components ·
React Router · TanStack Query · React Hook Form + Zod · Recharts ·
Supabase (Postgres, Auth, RLS, Edge Functions) · Claude API

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — system design, folder structure, data flow
- [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) — schema, versioning, and RLS model
- [`docs/AI_PIPELINE.md`](docs/AI_PIPELINE.md) — the learning loop, coach, and reports in detail

## Scripts

```bash
npm run dev        # dev server
npm run build      # typecheck + production build
npm run preview    # serve the production build
npm run typecheck  # tsc only
```

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

Demo mode is a real tool, not a mockup: everything you add or change persists
in your browser (reset it any time from Settings), and the **Run learning
loop** button on the AI Coach page executes the same statistical analysis the
scheduled backend loop runs — live, on your data.

A hosted build deploys automatically to **GitHub Pages** on every push
(`.github/workflows/deploy-pages.yml`), so there is always a live URL with no
manual deploy steps.

## Running against a real backend

1. Create a Supabase project and apply the migrations in
   `supabase/migrations/` (or `supabase db push` with the CLI). Sign-up,
   sign-in, and create-your-company onboarding are built in — the first user
   becomes the organization owner.
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
| **Dashboard** | 30-day KPIs with deltas and sparklines, CTR trend by channel, packaging breakdowns, weekly rhythm checklist, open recommendations, competitor outliers, ideas queue, SOP review alerts, activity |
| **Production** | Shared team workspace: video docs (hook, sectioned script, description, goal, title candidates, thumbnail, assets) on a pipeline board + calendar, per-stage SOP checklists, AI drafting/critique, owner-only publish, and the third-party Speed Stack |
| **Channels** | One brand per channel: owner, niche, cadence, goals, per-video history; add channels and sync uploads directly from the YouTube API |
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

- [`docs/GO_LIVE.md`](docs/GO_LIVE.md) — **turn on the shared team workspace** (phone-friendly, ~10 min, no code)
- [`docs/SPEED_STACK.md`](docs/SPEED_STACK.md) — third-party tools for producing videos fast, mapped to the pipeline
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — system design, folder structure, data flow
- [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) — schema, versioning, and RLS model
- [`docs/AI_PIPELINE.md`](docs/AI_PIPELINE.md) — the learning loop, coach, and reports in detail
- [`docs/COMPETITIVE_INTELLIGENCE_BUSINESS.md`](docs/COMPETITIVE_INTELLIGENCE_BUSINESS.md) — the business-niche CI report (35 competitors, patterns, ideas, the "Founder Reality" strategy); raw research in [`research/business-modern-ambition/`](research/business-modern-ambition/)

## Scripts

```bash
npm run dev        # dev server
npm run build      # typecheck + production build
npm run preview    # serve the production build
npm run typecheck  # tsc only
```

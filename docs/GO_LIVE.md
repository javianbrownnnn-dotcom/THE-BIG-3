# Going live: turn on the shared team workspace

Right now the app runs in **demo mode** — fully functional, but each person's
data lives only in their own browser. To make it a *real* shared workspace
(you + Robert + your teammate all seeing the same data, with logins), you
connect a free Supabase project. Everything below can be done from a phone in
about 10 minutes; nothing here needs code.

The backend is already built — you're switching it on, not building it.

## What you get after this

- Real accounts: everyone signs in with email + password
- One shared database: add a video, everyone sees it instantly
- Roles: the team can do everything **except** publish — only owner/admin posts
- Scheduled YouTube sync and the nightly learning loop can run on their own

## Step 1 — Create the Supabase project (~3 min)

1. Go to **supabase.com** → **Start your project** → sign in with GitHub or email.
2. **New project.** Name it "The Big 3", pick any region near you, and set a
   database password (save it somewhere — you rarely need it again).
3. Wait ~2 minutes for it to provision.

## Step 2 — Get your two values (~1 min)

In the project: **Settings → API**. Copy these two:

- **Project URL** (looks like `https://abcdefgh.supabase.co`)
- **anon public** key (a long string under "Project API keys")

These two are safe to put in the app — the anon key is designed to be public;
Row Level Security is what protects the data.

## Step 3 — Apply the database (~2 min)

In the project: **SQL Editor → New query**. Then, one at a time, paste the
contents of each file from `supabase/migrations/` in order and click **Run**:

1. `0001_init.sql`
2. `0002_auth_bootstrap.sql`
3. `0003_productions.sql`
4. `0004_youtube_publishing.sql`

(Or, if you use the Supabase CLI: `supabase db push`.)

## Step 4 — Point the app at it

- **If you're running it yourself / GitHub Pages:** set two environment
  variables and rebuild — `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- **Easiest path:** send me (Claude) the two values and I'll wire them in,
  rebuild, and confirm the shared workspace is live. I never store them beyond
  configuring the app.

The moment those two values are set, the app switches out of demo mode on its
own: the first person to sign up creates the organization and becomes the
owner, then invites the others.

## Step 5 (optional) — Turn on the AI + automations

The app works fully without these — AI features fall back to smart templates
until the keys exist, then light up automatically. Add API keys as **Edge
Function secrets** in Supabase (Dashboard → Edge Functions → Secrets, or
`supabase secrets set`):

- `ANTHROPIC_API_KEY` — Claude, for writing (AI Coach, hook/script drafting, reports)
- `OPENAI_API_KEY` — GPT, for idea generation ("Generate ideas")
- `YOUTUBE_API_KEY` — scheduled per-channel sync

For **one-click YouTube publishing** (auto-upload from a production doc), also add
the Google OAuth secrets and follow `docs/YOUTUBE_UPLOAD.md`:

- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — your Google Cloud OAuth client
- `OAUTH_REDIRECT_URL` — the deployed URL of the `youtube-oauth` function's callback

Deploy the edge functions once (Supabase CLI):
`supabase functions deploy ai-coach ai-ideas ai-write learning-loop generate-report youtube-sync youtube-oauth youtube-upload`

For the **nightly learning loop** (GitHub Action), also add repo secrets
(GitHub → Settings → Secrets → Actions): `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY`.

### Roughly what the AI costs
Both bill pay-as-you-go on your own accounts. For a 3-person team's volume,
idea generation and script drafting typically run **cents per use** — a few
dollars a month unless you're generating constantly. Set spend limits in each
provider's dashboard.

## A note on cost

Supabase's free tier is generous and comfortably covers a three-person team.
The only things that ever cost money are the optional AI features (Anthropic
API usage) and any third-party production tools you choose from the Speed Stack
— all of which are pay-as-you-go and outside this app.

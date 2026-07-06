# One-click YouTube publishing

Turn a finished production doc into a public (or scheduled-private) YouTube
video in one click. The owner presses **Publish to YouTube** on a production;
the app uploads the finished file to the channel's connected YouTube account,
marks the production published, and links a tracked `videos` row so it lands in
the **Vault** with every part (hook, script, packaging) archived beside its
real performance.

Until you connect Google, the button still works in **demo mode** — it
simulates the upload, publishes the doc, and drops a tracked video into the
Vault with a placeholder URL — so the whole flow is testable with zero setup.

## What you need

- A Supabase backend already live (see `docs/GO_LIVE.md`).
- A Google account that owns (or manages) the YouTube channel.
- Migration `0004_youtube_publishing.sql` applied (it's in `SETUP.sql`).

## 1 — Create a Google OAuth client (~10 min, once)

1. Go to <https://console.cloud.google.com/> → create/select a project.
2. **APIs & Services → Library → YouTube Data API v3 → Enable.**
3. **APIs & Services → OAuth consent screen:**
   - User type **External**. Fill in app name, your email.
   - **Scopes:** add `.../auth/youtube.upload`.
   - **Test users:** add each teammate's Google address (while the app is in
     "Testing", only listed users can connect — that's fine for a 3-person team,
     no Google verification review required).
4. **APIs & Services → Credentials → Create credentials → OAuth client ID:**
   - Application type **Web application**.
   - **Authorized redirect URI:** the deployed URL of the `youtube-oauth`
     function's callback, e.g.
     `https://<project-ref>.functions.supabase.co/youtube-oauth`
   - Save the **Client ID** and **Client secret**.

## 2 — Set the secrets and deploy the functions

Add these Edge Function secrets (Dashboard → Edge Functions → Secrets, or
`supabase secrets set`):

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `OAUTH_REDIRECT_URL` — the exact redirect URI you registered above

Then deploy both functions:

```bash
supabase functions deploy youtube-oauth youtube-upload
```

`youtube-upload` also relies on the standard `SUPABASE_URL`,
`SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` secrets, which Supabase
provides to every function automatically.

## 3 — Connect a channel

In the app, open the channel and choose **Connect YouTube**. The app calls
`youtube-oauth` (`authUrl` action), opens Google's consent screen, and — after
you approve — Google redirects to the callback, which stores the channel's
**refresh token** in the `youtube_credentials` table.

That table has Row Level Security enabled with **no policies**, so no signed-in
user (not even an org owner) can read the token through the API — only the edge
functions, running as the service role, ever touch it.

## 4 — Publish

On a production doc:

1. Add an **asset link labelled `final`** (also accepted: `video`, `final cut`,
   `master`) whose URL is a **direct download** of the finished video file — a
   Supabase Storage URL, or a Google Drive *direct-download* link
   (`https://drive.google.com/uc?export=download&id=…`), not a "preview" page.
2. Press **Publish to YouTube** (owner only).

The `youtube-upload` function then:

1. Authorizes the caller and loads the production (service role).
2. Refreshes a short-lived access token from the stored refresh token.
3. Starts a **resumable upload** with the doc's title/description (the starred
   title candidate wins; falls back to the doc title).
4. Streams the file bytes from the asset link into the session.
5. Sets privacy to **public**, or **private** when the doc has a `scheduledAt`
   (so you can flip it live later).
6. Creates/links a `videos` row and marks the production `published`.

You get back the `youtube.com/watch?v=…` URL, and the video appears in the
Vault.

## Troubleshooting

- **"No refresh token returned."** Google only returns a refresh token on first
  consent. Revoke the app at <https://myaccount.google.com/permissions> and
  reconnect (the consent URL already forces `prompt=consent`).
- **"This channel isn't connected to YouTube yet."** Run step 3 for that
  channel.
- **"Add an asset link labelled 'final'…"** The doc has no downloadable video
  file link — see step 4.1.
- **Upload rejected / quota.** The YouTube Data API has a daily upload quota;
  brand-new API projects also cap uploads until the channel is in good standing.
  Check quotas in the Google Cloud console.

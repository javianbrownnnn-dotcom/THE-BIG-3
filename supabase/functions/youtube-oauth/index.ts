// YouTube publishing OAuth. Two actions:
//   authUrl  → returns the Google consent URL (youtube.upload scope) for a channel
//   callback → exchanges the returned code for tokens; stores the refresh token
//              in youtube_credentials (service role, members can't read it)
//
// Requires secrets: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and OAUTH_REDIRECT_URL
// (the deployed URL of this function's callback). See docs/YOUTUBE_UPLOAD.md.

// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/claude.ts";

const SCOPE = "https://www.googleapis.com/auth/youtube.upload";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
  const redirectUri = Deno.env.get("OAUTH_REDIRECT_URL");
  if (!clientId || !clientSecret || !redirectUri) {
    return jsonResponse({ error: "Google OAuth secrets are not configured" }, 500);
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state"); // channelId

  // ---- callback: Google redirects here with ?code&state ----
  if (code && state) {
    try {
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });
      const tokens = await tokenRes.json();
      if (!tokens.refresh_token) {
        return jsonResponse(
          { error: "No refresh token returned. Revoke prior access and reconnect with prompt=consent." },
          400,
        );
      }
      const db = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      await db.from("youtube_credentials").upsert({
        channel_id: state,
        refresh_token: tokens.refresh_token,
        scope: tokens.scope,
      });
      // Bounce the user back to the app.
      return new Response(
        `<html><body style="font-family:system-ui;background:#0d0d0d;color:#fff;display:grid;place-items:center;height:100vh"><div style="text-align:center"><h2>YouTube connected ✓</h2><p>You can close this tab and return to The Big 3 OS.</p></div></body></html>`,
        { headers: { "content-type": "text/html" } },
      );
    } catch (err) {
      console.error(err);
      return jsonResponse({ error: String(err) }, 500);
    }
  }

  // ---- authUrl: app asks for the consent URL for a channel ----
  try {
    const { channelId } = await req.json();
    if (!channelId) return jsonResponse({ error: "channelId required" }, 400);
    const consent = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    consent.searchParams.set("client_id", clientId);
    consent.searchParams.set("redirect_uri", redirectUri);
    consent.searchParams.set("response_type", "code");
    consent.searchParams.set("scope", SCOPE);
    consent.searchParams.set("access_type", "offline");
    consent.searchParams.set("prompt", "consent");
    consent.searchParams.set("state", channelId);
    return jsonResponse({ authUrl: consent.toString() });
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500);
  }
});

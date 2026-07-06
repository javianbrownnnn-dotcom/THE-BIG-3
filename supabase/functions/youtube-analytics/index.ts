// Deep audience analytics for one video via the YouTube Analytics API.
// Pulls the retention curve, traffic-source mix, and reach (impressions/CTR)
// using the channel's stored OAuth refresh token. Invoked with the caller's
// JWT (RLS scopes the video lookup); the refresh token is read with the
// service role so members never see it.
//
// Requires secrets: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET.

// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/claude.ts";

const ANALYTICS = "https://youtubeanalytics.googleapis.com/v2/reports";

async function accessTokenFromRefresh(refreshToken: string): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error("Could not refresh YouTube access token");
  return data.access_token;
}

// Parse the 11-char video id from a YouTube URL (watch?v=, youtu.be/, /shorts/).
function youtubeIdFromUrl(url?: string): string | null {
  if (!url) return null;
  const m = url.match(/(?:v=|youtu\.be\/|\/shorts\/|\/embed\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

async function report(token: string, params: Record<string, string>) {
  const url = new URL(ANALYTICS);
  url.searchParams.set("ids", "channel==MINE");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`YouTube Analytics ${res.status}: ${await res.text()}`);
  return res.json();
}

const SOURCE_LABELS: Record<string, string> = {
  BROWSE: "Browse features", SUGGESTED: "Suggested videos", YT_SEARCH: "YouTube search",
  EXT_URL: "External", NO_LINK_OTHER: "Direct/unknown", PLAYLIST: "Playlists",
  YT_CHANNEL: "Channel pages", NOTIFICATION: "Notifications", SUBSCRIBER: "Subscriptions feed",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { videoId } = await req.json();
    if (!videoId) return jsonResponse({ error: "videoId required" }, 400);

    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } },
    );
    const { data: auth } = await db.auth.getUser();
    if (!auth?.user) return jsonResponse({ error: "unauthorized" }, 401);

    const { data: video } = await db
      .from("videos").select("id, url, channel_id").eq("id", videoId).single();
    if (!video) return jsonResponse({ error: "video not found" }, 404);
    const ytId = youtubeIdFromUrl(video.url);
    if (!ytId) {
      return jsonResponse({ error: "This video has no recognizable YouTube URL." }, 422);
    }

    // Refresh token is per-channel; read it with the service role.
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: cred } = await admin
      .from("youtube_credentials").select("refresh_token").eq("channel_id", video.channel_id).single();
    if (!cred?.refresh_token) {
      return jsonResponse(
        { error: "This channel isn't connected to YouTube yet. Connect it to load live analytics." },
        409,
      );
    }
    const token = await accessTokenFromRefresh(cred.refresh_token);

    const startDate = "2005-02-14"; // YouTube's birthday — "lifetime" of the video
    const endDate = new Date().toISOString().slice(0, 10);
    const base = { filters: `video==${ytId}`, startDate, endDate };

    const [retentionRes, trafficRes, reachRes] = await Promise.all([
      report(token, { ...base, metrics: "audienceWatchRatio", dimensions: "elapsedVideoTimeRatio" }),
      report(token, { ...base, metrics: "views", dimensions: "insightTrafficSourceType", sort: "-views" }),
      report(token, { ...base, metrics: "views,impressions,impressionsCtr,averageViewPercentage" }),
    ]);

    const retention = (retentionRes.rows ?? []).map((r: any[]) => ({
      pct: Math.round(r[0] * 100),
      audience: Math.round(r[1] * 100),
    }));
    const trafficSources = (trafficRes.rows ?? []).map((r: any[]) => ({
      source: SOURCE_LABELS[r[0]] ?? r[0],
      views: r[1],
    }));
    const reach = reachRes.rows?.[0] ?? [];

    return jsonResponse({
      videoId,
      retention,
      trafficSources,
      views: reach[0],
      impressions: reach[1],
      ctr: reach[2] != null ? Number((reach[2] * 100).toFixed(2)) : undefined,
      avgPercentViewed: reach[3] != null ? Number(reach[3].toFixed(1)) : undefined,
      source: "youtube",
    });
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: String(err) }, 500);
  }
});

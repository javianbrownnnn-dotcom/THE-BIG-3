// Server-side YouTube sync — the scheduled counterpart to the in-app
// "Sync YouTube" button. Runs with the service role over every channel that
// has a youtube_channel_id, pulling public stats (views, durations, publish
// dates) via the Data API v3. Set YOUTUBE_API_KEY with `supabase secrets set`.
//
// Private metrics (CTR, impressions, retention) need the Analytics API with
// channel-owner OAuth; when those credentials exist this function is where
// they plug in — the snapshot columns are already there.

// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/claude.ts";

const API = "https://www.googleapis.com/youtube/v3";
const ANALYTICS = "https://youtubeanalytics.googleapis.com/v2/reports";

function isoDurationToSecs(iso: string | undefined): number {
  const m = iso?.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (Number(m[1]) || 0) * 3600 + (Number(m[2]) || 0) * 60 + (Number(m[3]) || 0);
}

// Private metrics per video, keyed by YouTube video id. Present only for
// channels the owner has connected via OAuth.
interface PrivateMetrics {
  impressions?: number;
  ctr?: number; // 0..100
  avgViewDurationSecs?: number;
  avgPercentViewed?: number; // 0..100
  watchTimeHours?: number;
}

async function accessTokenFromRefresh(refreshToken: string): Promise<string | null> {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
  if (!clientId || !clientSecret) return null;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json().catch(() => null);
  return data?.access_token ?? null;
}

/**
 * The channel the OAuth token actually belongs to. Connecting "as owner" but
 * picking the personal Google account instead of the brand channel is the #1
 * silent killer of private metrics: Analytics' channel==MINE then reports a
 * different channel's videos and nothing matches. Detect it and say so.
 */
async function tokenChannel(token: string): Promise<{ id: string; title: string } | null> {
  try {
    const res = await fetch(`${API}/channels?part=snippet&mine=true`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const item = data.items?.[0];
    return item ? { id: item.id, title: item.snippet?.title ?? "(unknown)" } : null;
  } catch {
    return null;
  }
}

/**
 * Run one Analytics report (dimensions=video) and return rows keyed by video
 * id with columns keyed by metric NAME (parsed from columnHeaders, never by
 * position — metric sets vary between calls).
 */
async function analyticsReport(
  token: string,
  metrics: string,
  sort: string,
): Promise<{ rows: Map<string, Record<string, number>>; error?: string }> {
  const rows = new Map<string, Record<string, number>>();
  try {
    const url = new URL(ANALYTICS);
    url.searchParams.set("ids", "channel==MINE");
    // Analytics data simply doesn't exist before 2008 — the API rejects
    // out-of-range dates as 400 (invalid), which blanked ALL private metrics.
    url.searchParams.set("startDate", "2008-01-01");
    url.searchParams.set("endDate", new Date().toISOString().slice(0, 10));
    url.searchParams.set("dimensions", "video");
    url.searchParams.set("metrics", metrics);
    url.searchParams.set("maxResults", "200");
    url.searchParams.set("sort", sort);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      const body = await res.text();
      const reason = (() => {
        try {
          return JSON.parse(body)?.error?.errors?.[0]?.reason ?? "";
        } catch {
          return "";
        }
      })();
      const hint = res.status === 403 && /accessNotConfigured|SERVICE_DISABLED/i.test(body)
        ? "The YouTube Analytics API isn't enabled on your Google Cloud project — enable it in the API Library, wait 2 minutes, and reconnect."
        : res.status === 401
          ? "The Google connection expired or was revoked — tap Reconnect."
          : "";
      return { rows, error: `YouTube Analytics API ${res.status}${reason ? ` (${reason})` : ""}. ${hint}`.trim() };
    }
    const data = await res.json();
    const headers: string[] = (data.columnHeaders ?? []).map((h: any) => h.name);
    for (const row of data.rows ?? []) {
      const vid = String(row[headers.indexOf("video")] ?? row[0]);
      const cols: Record<string, number> = {};
      headers.forEach((name, i) => {
        if (name !== "video" && row[i] != null) cols[name] = Number(row[i]);
      });
      rows.set(vid, cols);
    }
  } catch (err) {
    return { rows, error: `Analytics fetch failed: ${err instanceof Error ? err.message : String(err)}` };
  }
  return { rows };
}

/**
 * Private metrics per channel via two reports: core retention/watch-time
 * (broadly supported) and impressions/CTR (stricter rules on Google's side —
 * best-effort, its failure never blanks retention). Failures return an error
 * string so the caller can surface WHY analytics are empty.
 */
async function fetchChannelPrivateMetrics(
  token: string,
): Promise<{ metrics: Map<string, PrivateMetrics>; error?: string }> {
  const out = new Map<string, PrivateMetrics>();
  const core = await analyticsReport(
    token,
    "views,averageViewDuration,averageViewPercentage,estimatedMinutesWatched",
    "-estimatedMinutesWatched",
  );
  if (core.error && core.rows.size === 0) return { metrics: out, error: core.error };

  const imp = await analyticsReport(token, "impressions,impressionsCtr", "-impressions");

  const vids = new Set([...core.rows.keys(), ...imp.rows.keys()]);
  for (const vid of vids) {
    const c = core.rows.get(vid) ?? {};
    const i = imp.rows.get(vid) ?? {};
    out.set(vid, {
      impressions: i.impressions,
      ctr: i.impressionsCtr != null ? Number((i.impressionsCtr * 100).toFixed(2)) : undefined,
      avgViewDurationSecs: c.averageViewDuration,
      avgPercentViewed: c.averageViewPercentage != null
        ? Number(c.averageViewPercentage.toFixed(1))
        : undefined,
      watchTimeHours: c.estimatedMinutesWatched != null
        ? Number((c.estimatedMinutesWatched / 60).toFixed(1))
        : undefined,
    });
  }
  // Retention landed but impressions didn't — report it without failing.
  const error = imp.error && out.size > 0
    ? `Retention/watch-time synced, but impressions/CTR didn't: ${imp.error}`
    : imp.error && core.error
      ? core.error
      : undefined;
  return { metrics: out, error };
}

class YtError extends Error {
  constructor(message: string, readonly status: number, readonly reason: string) {
    super(message);
  }
}

async function ytGet(path: string, params: Record<string, string>, key: string) {
  const qs = new URLSearchParams({ ...params, key });
  const res = await fetch(`${API}/${path}?${qs}`);
  if (!res.ok) {
    const body = await res.text();
    let reason = "";
    try {
      reason = JSON.parse(body)?.error?.errors?.[0]?.reason ?? "";
    } catch {
      // non-JSON body — reason stays empty
    }
    throw new YtError(`YouTube API ${path} → ${res.status}: ${body}`, res.status, reason);
  }
  return res.json();
}

async function fetchUploads(channelId: string, key: string, maxVideos = 200) {
  const chan = await ytGet("channels", { part: "contentDetails,statistics", id: channelId }, key);
  if (!chan.items?.length) {
    // A handle/@name or a typo'd id was saved instead of a UC… channel id.
    throw new Error(
      `No YouTube channel found for id "${channelId}". Open Channels → this channel → ` +
        `YouTube and re-link it (paste the channel URL/@handle so the app resolves the correct UC… id).`,
    );
  }
  // What YouTube claims the channel has — used to tell "brand-new channel"
  // apart from "has videos, but none of them are public".
  const reportedVideos = Number(chan.items[0]?.statistics?.videoCount ?? 0);
  const playlist = chan.items[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!playlist) return [];

  const ids: string[] = [];
  let pageToken: string | undefined;
  while (ids.length < maxVideos) {
    let page;
    try {
      page = await ytGet("playlistItems", {
        part: "contentDetails",
        playlistId: playlist,
        maxResults: "50",
        ...(pageToken ? { pageToken } : {}),
      }, key);
    } catch (err) {
      // A channel with no PUBLIC uploads 404s its uploads playlist (reason:
      // playlistNotFound). If YouTube counts videos on the channel anyway,
      // they exist but aren't public — say so instead of failing or going
      // quiet. A true zero is just a brand-new channel: return empty.
      if (err instanceof YtError && err.status === 404) {
        if (reportedVideos > 0) {
          throw new Error(
            `YouTube counts ${reportedVideos} videos on this channel but returns none as public — ` +
              `they're likely Unlisted, Private, scheduled, or members-only ` +
              `(YouTube Studio → Content → Visibility). Only public videos can be synced.`,
          );
        }
        return [];
      }
      throw err;
    }
    for (const item of page.items ?? []) {
      if (item.contentDetails?.videoId) ids.push(item.contentDetails.videoId);
    }
    pageToken = page.nextPageToken;
    if (!pageToken) break;
  }

  const videos: any[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const data = await ytGet("videos", {
      part: "snippet,contentDetails,statistics",
      id: ids.slice(i, i + 50).join(","),
    }, key);
    videos.push(...(data.items ?? []));
  }
  return videos;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const apiKey = Deno.env.get("YOUTUBE_API_KEY");
  if (!apiKey) return jsonResponse({ error: "YOUTUBE_API_KEY is not configured" }, 500);

  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { data: channels } = await db.from("channels")
      .select("id, name, youtube_channel_id, youtube_connected_at")
      .not("youtube_channel_id", "is", null);

    const results: any[] = [];
    const errors: Array<{ channel: string; error: string }> = [];
    // Channels that are linked (public stats flow) but have no owner OAuth —
    // their CTR/retention will stay empty until the owner connects.
    const notConnected: string[] = [];
    for (const channel of channels ?? []) {
      try {
      const uploads = await fetchUploads(channel.youtube_channel_id, apiKey);

      const { data: existing } = await db.from("videos")
        .select("id, url, title").eq("channel_id", channel.id);
      const byVideoId = new Map<string, string>();
      for (const v of existing ?? []) {
        const vid = v.url?.match(/[?&]v=([A-Za-z0-9_-]{6,})/)?.[1];
        if (vid) byVideoId.set(vid, v.id);
      }

      // If the channel owner has connected via OAuth, pull private metrics
      // (CTR, impressions, retention) for all videos in one report and fold
      // them into each snapshot — this is what makes CTR/retention appear in
      // the videos list, the KPI row, and the dashboard graph.
      let priv = new Map<string, PrivateMetrics>();
      let ownerConnected = false;
      const { data: cred, error: credReadError } = await db
        .from("youtube_credentials").select("refresh_token").eq("channel_id", channel.id).maybeSingle();
      if (credReadError) {
        // Most likely the youtube_credentials table is missing from a
        // hand-migrated database — name the fix instead of reporting "not
        // connected" against a green badge.
        errors.push({
          channel: channel.name,
          error:
            `Couldn't read the stored Google connection (${credReadError.message}). ` +
            `Run supabase/catchup_2026_07.sql in the Supabase SQL Editor, then Reconnect.`,
        });
      } else if (!cred?.refresh_token) {
        if (channel.youtube_connected_at) {
          // The app shows "connected" but no token exists — the connection was
          // never actually stored. Reconnect re-runs consent and saves it.
          errors.push({
            channel: channel.name,
            error:
              "Shows connected, but no Google token is stored — the connection didn't save. " +
              "Tap Reconnect and approve again; if this repeats, run supabase/catchup_2026_07.sql first.",
          });
        } else {
          notConnected.push(channel.name);
        }
      } else {
        const token = await accessTokenFromRefresh(cred.refresh_token);
        if (!token) {
          errors.push({
            channel: channel.name,
            error: "The Google connection expired or was revoked — open Channels → YouTube → Reconnect.",
          });
        } else {
          // Guard against the personal-vs-brand account trap: the token must
          // belong to THIS channel, or Analytics silently reports the wrong one.
          const me = await tokenChannel(token);
          if (me && me.id !== channel.youtube_channel_id) {
            errors.push({
              channel: channel.name,
              error:
                `The Google connection is for a different channel ("${me.title}"), not this one. ` +
                `Tap Reconnect and, on Google's account screen, pick the brand account that owns this channel.`,
            });
          } else {
            const { metrics, error: privError } = await fetchChannelPrivateMetrics(token);
            priv = metrics;
            ownerConnected = true;
            if (privError) errors.push({ channel: channel.name, error: privError });
          }
        }
      }

      let created = 0, snapshots = 0;
      for (const item of uploads) {
        const p = priv.get(item.id) ?? {};
        const snapshot = {
          views: item.statistics?.viewCount ? Number(item.statistics.viewCount) : null,
          impressions: p.impressions ?? null,
          ctr: p.ctr ?? null,
          avg_view_duration_secs: p.avgViewDurationSecs ?? null,
          avg_percent_viewed: p.avgPercentViewed ?? null,
          watch_time_hours: p.watchTimeHours ?? null,
          source: "youtube_api",
        };
        const existingId = byVideoId.get(item.id);
        if (existingId) {
          await db.from("video_metric_snapshots").insert({ video_id: existingId, ...snapshot });
          snapshots++;
        } else {
          const durationSecs = isoDurationToSecs(item.contentDetails?.duration);
          const { data: video } = await db.from("videos").insert({
            channel_id: channel.id,
            title: item.snippet?.title ?? "(untitled)",
            url: `https://www.youtube.com/watch?v=${item.id}`,
            thumbnail_url: item.snippet?.thumbnails?.medium?.url,
            published_at: item.snippet?.publishedAt,
            duration_seconds: durationSecs,
            format: durationSecs > 0 && durationSecs <= 180 ? "short" : "long_form",
          }).select("id").single();
          if (video) {
            await db.from("video_metric_snapshots").insert({ video_id: video.id, ...snapshot });
            created++;
          }
        }
      }
      results.push({
        channel: channel.name,
        uploads: uploads.length,
        created,
        snapshots,
        ownerConnected,
        privateMetrics: priv.size,
      });
      } catch (err) {
        // One channel's bad id or API hiccup must not abort every other
        // channel's sync — record it and move on.
        console.error(`sync failed for channel ${channel.name}:`, err);
        errors.push({ channel: channel.name, error: String(err instanceof Error ? err.message : err) });
      }
    }
    return jsonResponse({ ok: true, results, errors, notConnected });
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: String(err) }, 500);
  }
});

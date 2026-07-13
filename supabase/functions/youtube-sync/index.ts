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
 * One Analytics report per channel: private metrics for every video, grouped
 * by the `video` dimension. Best-effort — any failure returns an empty map so
 * the public-stats sync always still succeeds.
 */
async function fetchChannelPrivateMetrics(token: string): Promise<Map<string, PrivateMetrics>> {
  const out = new Map<string, PrivateMetrics>();
  try {
    const url = new URL(ANALYTICS);
    url.searchParams.set("ids", "channel==MINE");
    url.searchParams.set("startDate", "2005-02-14"); // video lifetime
    url.searchParams.set("endDate", new Date().toISOString().slice(0, 10));
    url.searchParams.set("dimensions", "video");
    url.searchParams.set(
      "metrics",
      "impressions,impressionsCtr,averageViewDuration,averageViewPercentage,estimatedMinutesWatched",
    );
    url.searchParams.set("maxResults", "200");
    url.searchParams.set("sort", "-estimatedMinutesWatched");
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return out;
    const data = await res.json();
    // columnHeaders order matches the metrics list; row[0] is the video id.
    for (const row of data.rows ?? []) {
      const [vid, impressions, ctr, avgDur, avgPct, minutesWatched] = row;
      out.set(String(vid), {
        impressions: impressions != null ? Number(impressions) : undefined,
        ctr: ctr != null ? Number((ctr * 100).toFixed(2)) : undefined,
        avgViewDurationSecs: avgDur != null ? Number(avgDur) : undefined,
        avgPercentViewed: avgPct != null ? Number(avgPct.toFixed(1)) : undefined,
        watchTimeHours: minutesWatched != null ? Number((minutesWatched / 60).toFixed(1)) : undefined,
      });
    }
  } catch {
    // Owner analytics unavailable — public sync continues.
  }
  return out;
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
      .select("id, name, youtube_channel_id")
      .not("youtube_channel_id", "is", null);

    const results: any[] = [];
    const errors: Array<{ channel: string; error: string }> = [];
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
      const { data: cred } = await db
        .from("youtube_credentials").select("refresh_token").eq("channel_id", channel.id).maybeSingle();
      if (cred?.refresh_token) {
        const token = await accessTokenFromRefresh(cred.refresh_token);
        if (token) {
          priv = await fetchChannelPrivateMetrics(token);
          ownerConnected = true;
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
    return jsonResponse({ ok: true, results, errors });
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: String(err) }, 500);
  }
});

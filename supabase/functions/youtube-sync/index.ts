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

function isoDurationToSecs(iso: string | undefined): number {
  const m = iso?.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (Number(m[1]) || 0) * 3600 + (Number(m[2]) || 0) * 60 + (Number(m[3]) || 0);
}

async function ytGet(path: string, params: Record<string, string>, key: string) {
  const qs = new URLSearchParams({ ...params, key });
  const res = await fetch(`${API}/${path}?${qs}`);
  if (!res.ok) throw new Error(`YouTube API ${path} → ${res.status}: ${await res.text()}`);
  return res.json();
}

async function fetchUploads(channelId: string, key: string, maxVideos = 200) {
  const chan = await ytGet("channels", { part: "contentDetails", id: channelId }, key);
  const playlist = chan.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!playlist) return [];

  const ids: string[] = [];
  let pageToken: string | undefined;
  while (ids.length < maxVideos) {
    const page = await ytGet("playlistItems", {
      part: "contentDetails",
      playlistId: playlist,
      maxResults: "50",
      ...(pageToken ? { pageToken } : {}),
    }, key);
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
    for (const channel of channels ?? []) {
      const uploads = await fetchUploads(channel.youtube_channel_id, apiKey);

      const { data: existing } = await db.from("videos")
        .select("id, url, title").eq("channel_id", channel.id);
      const byVideoId = new Map<string, string>();
      for (const v of existing ?? []) {
        const vid = v.url?.match(/[?&]v=([A-Za-z0-9_-]{6,})/)?.[1];
        if (vid) byVideoId.set(vid, v.id);
      }

      let created = 0, snapshots = 0;
      for (const item of uploads) {
        const stats = {
          views: item.statistics?.viewCount ? Number(item.statistics.viewCount) : null,
        };
        const existingId = byVideoId.get(item.id);
        if (existingId) {
          await db.from("video_metric_snapshots").insert({
            video_id: existingId, views: stats.views, source: "youtube_api",
          });
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
            await db.from("video_metric_snapshots").insert({
              video_id: video.id, views: stats.views, source: "youtube_api",
            });
            created++;
          }
        }
      }
      results.push({ channel: channel.name, uploads: uploads.length, created, snapshots });
    }
    return jsonResponse({ ok: true, results });
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: String(err) }, 500);
  }
});

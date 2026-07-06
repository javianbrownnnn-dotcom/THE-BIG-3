// Server-side competitor channel scan. Pulls a competitor channel's recent
// uploads from the YouTube Data API v3, flags statistical outliers (views/day
// z-score vs the channel's own baseline), inserts the new videos, and rolls
// the whole tracked set up into channel-level headline stats. The in-app twin
// runs client-side with a stored API key (features/competitors/liveScan.ts);
// the demo provider simulates it. Set YOUTUBE_API_KEY with `supabase secrets set`.

// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/claude.ts";

const API = "https://www.googleapis.com/youtube/v3";
const DAY_MS = 86_400_000;
const MAX_UPLOADS = 60;

async function ytGet(path: string, params: Record<string, string>, key: string) {
  const qs = new URLSearchParams({ ...params, key });
  const res = await fetch(`${API}/${path}?${qs}`);
  if (!res.ok) throw new Error(`YouTube API ${path} → ${res.status}: ${await res.text()}`);
  return res.json();
}

function parseRef(input: string): { id?: string; handle?: string } {
  const s = input.trim();
  const m = s.match(/(?:youtube\.com\/channel\/|^)(UC[A-Za-z0-9_-]{20,})/);
  if (m) return { id: m[1] };
  const h = s.match(/(?:youtube\.com\/)?@([A-Za-z0-9_.-]+)/);
  if (h) return { handle: h[1] };
  if (/^[A-Za-z0-9_.-]+$/.test(s)) return { handle: s };
  return {};
}

async function resolveChannel(ref: string, key: string) {
  const p = parseRef(ref);
  const params: Record<string, string> = {
    part: "snippet,contentDetails,statistics",
    ...(p.id ? { id: p.id } : p.handle ? { forHandle: `@${p.handle}` } : { q: ref }),
  };
  const data = await ytGet("channels", params, key);
  const item = data.items?.[0];
  if (!item) throw new Error(`No YouTube channel found for "${ref}"`);
  return {
    id: item.id,
    title: item.snippet?.title ?? ref,
    uploads: item.contentDetails?.relatedPlaylists?.uploads,
    subscriberCount: item.statistics?.subscriberCount
      ? Number(item.statistics.subscriberCount)
      : null,
  };
}

async function fetchUploads(playlist: string, key: string) {
  const ids: string[] = [];
  let pageToken: string | undefined;
  while (ids.length < MAX_UPLOADS) {
    const page = await ytGet("playlistItems", {
      part: "contentDetails", playlistId: playlist, maxResults: "50",
      ...(pageToken ? { pageToken } : {}),
    }, key);
    for (const item of page.items ?? []) {
      if (item.contentDetails?.videoId) ids.push(item.contentDetails.videoId);
    }
    pageToken = page.nextPageToken;
    if (!pageToken || ids.length >= MAX_UPLOADS) break;
  }
  const videos: any[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const data = await ytGet("videos", {
      part: "snippet,statistics", id: ids.slice(i, i + 50).join(","),
    }, key);
    videos.push(...(data.items ?? []));
  }
  return videos;
}

const daysSince = (iso?: string) =>
  Math.max(1, (Date.now() - new Date(iso ?? Date.now()).getTime()) / DAY_MS);

function median(nums: number[]) {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

function cadence(dates: string[]) {
  const t = dates.map((d) => new Date(d).getTime()).sort((a, b) => b - a);
  if (t.length < 2) return null;
  let sum = 0;
  for (let i = 0; i < t.length - 1; i++) sum += t[i] - t[i + 1];
  return +(sum / (t.length - 1) / DAY_MS).toFixed(1);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const apiKey = Deno.env.get("YOUTUBE_API_KEY");
  if (!apiKey) return jsonResponse({ error: "YOUTUBE_API_KEY is not configured" }, 500);

  try {
    const { channelId } = await req.json();
    if (!channelId) return jsonResponse({ error: "channelId is required" }, 400);

    // Authorize the caller (must be an org member; RLS covers the reads below).
    const userDb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } },
    );
    const { data: auth } = await userDb.auth.getUser();
    if (!auth?.user) return jsonResponse({ error: "unauthorized" }, 401);

    const svc = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: chan } = await svc
      .from("competitor_channels").select("*").eq("id", channelId).single();
    if (!chan) return jsonResponse({ error: "competitor channel not found" }, 404);

    const ref = chan.url || chan.youtube_channel_id || chan.name;
    const yt = await resolveChannel(ref, apiKey);
    const uploads = yt.uploads ? await fetchUploads(yt.uploads, apiKey) : [];

    // views/day + within-channel z-score outliers.
    const mapped = uploads.map((item) => {
      const views = item.statistics?.viewCount ? Number(item.statistics.viewCount) : 0;
      const publishedAt = item.snippet?.publishedAt;
      return {
        videoId: item.id,
        title: item.snippet?.title ?? "(untitled)",
        url: `https://www.youtube.com/watch?v=${item.id}`,
        thumbnailUrl: item.snippet?.thumbnails?.medium?.url,
        publishedAt,
        views,
        viewsPerDay: Math.round(views / daysSince(publishedAt)),
      };
    });
    const vpds = mapped.map((m) => m.viewsPerDay);
    const mean = vpds.reduce((a, b) => a + b, 0) / (vpds.length || 1);
    const sd = Math.sqrt(vpds.reduce((a, b) => a + (b - mean) ** 2, 0) / (vpds.length || 1));

    const { data: existing } = await svc
      .from("competitor_videos").select("id, url, title").eq("competitor_channel_id", channelId);
    const seenIds = new Set(
      (existing ?? []).map((v: any) => v.url?.match(/[?&]v=([A-Za-z0-9_-]{6,})/)?.[1]).filter(Boolean),
    );
    const seenTitles = new Set((existing ?? []).map((v: any) => (v.title ?? "").toLowerCase()));

    let created = 0, outliers = 0;
    for (const m of mapped) {
      const isOutlier = sd > 0 && mapped.length >= 3 && (m.viewsPerDay - mean) / sd >= 2;
      const outlierScore = isOutlier ? +(((m.viewsPerDay - mean) / sd)).toFixed(1) : null;
      if (isOutlier) outliers++;
      if (seenIds.has(m.videoId) || seenTitles.has(m.title.toLowerCase())) continue;
      const { data: row } = await svc.from("competitor_videos").insert({
        competitor_channel_id: channelId,
        title: m.title,
        url: m.url,
        thumbnail_url: m.thumbnailUrl,
        published_at: m.publishedAt,
        is_outlier: isOutlier,
        outlier_score: outlierScore,
        ai_observations: isOutlier
          ? "Statistical outlier vs. this channel's views/day baseline (z ≥ 2)."
          : null,
      }).select("id").single();
      if (row) {
        await svc.from("competitor_video_snapshots").insert({
          competitor_video_id: row.id, views: m.views, views_per_day: m.viewsPerDay,
        });
        created++;
      }
    }

    const totalTracked = (existing?.length ?? 0) + created;
    await svc.from("competitor_channels").update({
      youtube_channel_id: yt.id,
      subscriber_count: yt.subscriberCount,
      tracked_video_count: totalTracked,
      outlier_count: mapped.filter((m) => sd > 0 && (m.viewsPerDay - mean) / sd >= 2).length,
      median_views_per_day: median(vpds),
      upload_cadence_days: cadence(mapped.map((m) => m.publishedAt).filter(Boolean)),
      last_scanned_at: new Date().toISOString(),
    }).eq("id", channelId);

    return jsonResponse({
      channelId,
      channelName: yt.title,
      created,
      totalTracked,
      outliers,
      simulated: false,
    });
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: String(err) }, 500);
  }
});

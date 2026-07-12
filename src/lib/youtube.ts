// YouTube Data API v3 client — public data only (views, likes, durations,
// publish dates) which needs just an API key, no OAuth. Private metrics
// (CTR, impressions, retention) require the Analytics API with channel-owner
// OAuth; the DataProvider snapshot model already has fields for them, so
// they slot in the day credentials exist.

const API = "https://www.googleapis.com/youtube/v3";

export interface YtChannel {
  id: string;
  title: string;
  uploadsPlaylistId: string;
  subscriberCount?: number;
  /** Human-readable topic labels from YouTube's own categorization. */
  topics?: string[];
}

/** "https://en.wikipedia.org/wiki/Society_(disambiguation)" → "Society" */
export function topicLabel(url: string): string {
  const raw = url.split("/").pop() ?? "";
  return decodeURIComponent(raw)
    .replace(/_\(.*\)$/, "")
    .replace(/_/g, " ")
    .trim();
}

export interface YtVideo {
  videoId: string;
  title: string;
  publishedAt: string;
  durationSeconds: number;
  views?: number;
  likes?: number;
  comments?: number;
  thumbnailUrl?: string;
}

export class YouTubeApiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
  }
}

async function ytGet(path: string, params: Record<string, string>, apiKey: string) {
  const qs = new URLSearchParams({ ...params, key: apiKey });
  let res: Response;
  try {
    res = await fetch(`${API}/${path}?${qs}`);
  } catch {
    throw new YouTubeApiError(
      "Couldn't reach the YouTube API. If you're inside a sandboxed preview, external requests are blocked — run the app from a normal deployment.",
    );
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const reason: string = body?.error?.errors?.[0]?.reason ?? body?.error?.status ?? "";
    const googleMsg: string = body?.error?.message ?? "";
    if (res.status === 403 && reason.includes("quota")) {
      throw new YouTubeApiError("YouTube API daily quota exceeded — try again tomorrow.", 403);
    }
    // Translate Google's reason codes into the exact fix, and always surface
    // the raw reason so a screenshot of the toast is enough to diagnose.
    const hint =
      reason === "API_KEY_INVALID" || reason === "keyInvalid"
        ? "The saved key doesn't match a real key — re-copy it from Google Cloud (Show key) and paste again."
        : reason.includes("REFERRER") || reason.includes("BLOCKED")
          ? "The key's Application restriction is blocking this site — set it to None in Google Cloud → Credentials."
          : reason === "accessNotConfigured" || reason === "SERVICE_DISABLED"
            ? "YouTube Data API v3 isn't enabled on the key's project — enable it in the API Library, wait 2 minutes."
            : "Check the key and that 'YouTube Data API v3' is enabled for it.";
    if (res.status === 400 || res.status === 403) {
      throw new YouTubeApiError(
        `YouTube said: ${reason || res.status}. ${hint}${googleMsg ? ` (${googleMsg})` : ""}`,
        res.status,
      );
    }
    throw new YouTubeApiError(`YouTube API error ${res.status}${reason ? ` (${reason})` : ""}`, res.status);
  }
  return res.json();
}

/**
 * Accepts any of: @handle, youtube.com/@handle, /channel/UC…, a bare UC… id,
 * or a plain handle without @.
 */
export function parseChannelRef(input: string): { channelId?: string; handle?: string } {
  const trimmed = input.trim();
  const channelMatch = trimmed.match(/(?:youtube\.com\/channel\/|^)(UC[A-Za-z0-9_-]{20,})/);
  if (channelMatch) return { channelId: channelMatch[1] };
  const handleMatch = trimmed.match(/(?:youtube\.com\/)?@([A-Za-z0-9_.-]+)/);
  if (handleMatch) return { handle: handleMatch[1] };
  if (/^[A-Za-z0-9_.-]+$/.test(trimmed)) return { handle: trimmed };
  return {};
}

export async function resolveChannel(ref: string, apiKey: string): Promise<YtChannel> {
  const parsed = parseChannelRef(ref);
  if (!parsed.channelId && !parsed.handle) {
    throw new YouTubeApiError(`Couldn't understand "${ref}" — paste the channel URL or @handle.`);
  }
  const params: Record<string, string> = {
    part: "snippet,contentDetails,statistics,topicDetails",
    ...(parsed.channelId ? { id: parsed.channelId } : { forHandle: `@${parsed.handle}` }),
  };
  const data = await ytGet("channels", params, apiKey);
  const item = data.items?.[0];
  if (!item) throw new YouTubeApiError(`No YouTube channel found for "${ref}".`);
  const topics = [
    ...new Set(
      (item.topicDetails?.topicCategories ?? [])
        .map((u: string) => topicLabel(u))
        .filter(Boolean),
    ),
  ] as string[];
  return {
    id: item.id,
    title: item.snippet?.title ?? ref,
    uploadsPlaylistId: item.contentDetails?.relatedPlaylists?.uploads,
    subscriberCount: item.statistics?.subscriberCount
      ? Number(item.statistics.subscriberCount)
      : undefined,
    topics: topics.length ? topics : undefined,
  };
}

/** "PT1H4M35S" → 3875. Handles day components ("P1DT2H") from 24h+ streams. */
export function isoDurationToSecs(iso: string | undefined): number {
  if (!iso) return 0;
  const m = iso.match(/P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?/);
  if (!m) return 0;
  const [, d, h, min, s] = m;
  return (
    (Number(d) || 0) * 86_400 + (Number(h) || 0) * 3600 + (Number(min) || 0) * 60 + (Number(s) || 0)
  );
}

/** Map a videos.list item to our shape. Exported for tests and the edge function mirror. */
// deno-lint-ignore no-explicit-any
export function mapVideoItem(item: any): YtVideo {
  return {
    videoId: item.id,
    title: item.snippet?.title ?? "(untitled)",
    publishedAt: item.snippet?.publishedAt,
    durationSeconds: isoDurationToSecs(item.contentDetails?.duration),
    views: item.statistics?.viewCount != null ? Number(item.statistics.viewCount) : undefined,
    likes: item.statistics?.likeCount != null ? Number(item.statistics.likeCount) : undefined,
    comments:
      item.statistics?.commentCount != null ? Number(item.statistics.commentCount) : undefined,
    thumbnailUrl:
      item.snippet?.thumbnails?.medium?.url ?? item.snippet?.thumbnails?.default?.url,
  };
}

/**
 * All uploads with current stats, newest first. Capped at `maxVideos`
 * (quota costs ~1 unit per 50 videos per endpoint).
 */
export async function fetchUploads(
  uploadsPlaylistId: string,
  apiKey: string,
  maxVideos = 200,
): Promise<YtVideo[]> {
  // A brand-new channel has no public uploads yet; YouTube 404s its uploads
  // playlist. That's an empty channel, not an error.
  if (!uploadsPlaylistId) return [];
  const ids: string[] = [];
  let pageToken: string | undefined;
  while (ids.length < maxVideos) {
    let page;
    try {
      page = await ytGet(
        "playlistItems",
        {
          part: "contentDetails",
          playlistId: uploadsPlaylistId,
          maxResults: "50",
          ...(pageToken ? { pageToken } : {}),
        },
        apiKey,
      );
    } catch (err) {
      if (err instanceof YouTubeApiError && err.status === 404) return [];
      throw err;
    }
    for (const item of page.items ?? []) {
      if (item.contentDetails?.videoId) ids.push(item.contentDetails.videoId);
    }
    pageToken = page.nextPageToken;
    if (!pageToken) break;
  }

  const videos: YtVideo[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    const data = await ytGet(
      "videos",
      { part: "snippet,contentDetails,statistics", id: chunk.join(","), maxResults: "50" },
      apiKey,
    );
    for (const item of data.items ?? []) videos.push(mapVideoItem(item));
  }
  videos.sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
  return videos;
}

// ---------------------------------------------------------------------------
// API key storage: localStorage for client-side sync (demo or real backend);
// the youtube-sync edge function uses a server secret instead.
// ---------------------------------------------------------------------------
const KEY_STORAGE = "big3.youtubeApiKey";

export function getStoredApiKey(): string {
  try {
    return localStorage.getItem(KEY_STORAGE) ?? "";
  } catch {
    return "";
  }
}

export function storeApiKey(key: string) {
  try {
    localStorage.setItem(KEY_STORAGE, key.trim());
  } catch {
    // storage unavailable — key just won't persist across reloads
  }
}

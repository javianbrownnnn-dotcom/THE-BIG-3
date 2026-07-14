// B-roll search across three sources, merged into one result list:
//
//   * Wikimedia Commons — public-domain & free-licensed art, manuscripts,
//     maps, artifacts. No key needed. The backbone for history/religion
//     documentaries (Ken Burns pans over paintings and codex pages).
//   * The Met Museum open access — public-domain museum photography.
//     No key needed.
//   * Pexels — modern stock video + photos. Optional; needs PEXELS_API_KEY
//     (free from https://www.pexels.com/api/, set with
//     `supabase secrets set PEXELS_API_KEY=...`). Without it the archive
//     sources still work.
//
// Returns items shaped like the app's BuilderBrollItem.

// deno-lint-ignore-file no-explicit-any
import { corsHeaders, jsonResponse } from "../_shared/claude.ts";

interface BrollItem {
  url: string;
  thumb?: string;
  kind: "video" | "image";
  source: "pexels" | "wikimedia" | "met";
  credit?: string;
}

const stripHtml = (s: string) => s.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

/** Wikimedia Commons file search — free-licensed images, license in credit. */
async function searchWikimedia(query: string, limit: number): Promise<BrollItem[]> {
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.search = new URLSearchParams({
    action: "query",
    format: "json",
    origin: "*",
    generator: "search",
    gsrsearch: `filetype:bitmap ${query}`,
    gsrnamespace: "6",
    gsrlimit: String(limit),
    prop: "imageinfo",
    iiprop: "url|extmetadata",
    iiurlwidth: "1280",
  }).toString();
  const res = await fetch(url, { headers: { "user-agent": "TheBig3-OS/1.0 (b-roll search)" } });
  if (!res.ok) return [];
  const data = await res.json();
  const out: BrollItem[] = [];
  for (const page of Object.values<any>(data?.query?.pages ?? {})) {
    const info = page?.imageinfo?.[0];
    if (!info?.thumburl) continue;
    const meta = info.extmetadata ?? {};
    const license = stripHtml(meta.LicenseShortName?.value ?? "");
    const artist = stripHtml(meta.Artist?.value ?? "").slice(0, 60);
    out.push({
      url: info.thumburl, // 1280px render — plenty for 720p/1080p canvases
      thumb: info.thumburl.replace(/\/1280px-/, "/320px-"),
      kind: "image",
      source: "wikimedia",
      credit: ["Wikimedia Commons", artist, license].filter(Boolean).join(" · "),
    });
  }
  return out;
}

/** Met Museum open access — public-domain objects only. */
async function searchMet(query: string, limit: number): Promise<BrollItem[]> {
  const search = await fetch(
    `https://collectionapi.metmuseum.org/public/collection/v1/search?q=${
      encodeURIComponent(query)
    }&hasImages=true`,
  );
  if (!search.ok) return [];
  const { objectIDs } = await search.json();
  const ids: number[] = (objectIDs ?? []).slice(0, limit * 2); // some won't be PD
  const out: BrollItem[] = [];
  for (const id of ids) {
    if (out.length >= limit) break;
    try {
      const res = await fetch(
        `https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`,
      );
      if (!res.ok) continue;
      const obj = await res.json();
      if (!obj?.isPublicDomain || !obj?.primaryImageSmall) continue;
      out.push({
        url: obj.primaryImageSmall,
        thumb: obj.primaryImageSmall,
        kind: "image",
        source: "met",
        credit: ["The Met (public domain)", obj.title, obj.objectDate]
          .filter(Boolean).join(" · ").slice(0, 120),
      });
    } catch {
      // one bad object never sinks the search
    }
  }
  return out;
}

/** Pexels stock — only when the (free) key is configured. */
async function searchPexels(query: string, perPage: number): Promise<BrollItem[]> {
  const apiKey = Deno.env.get("PEXELS_API_KEY");
  if (!apiKey) return [];
  const headers = { Authorization: apiKey };
  const q = encodeURIComponent(query.slice(0, 100));
  const [videosRes, photosRes] = await Promise.all([
    fetch(
      `https://api.pexels.com/videos/search?query=${q}&per_page=${perPage}&orientation=landscape`,
      { headers },
    ),
    fetch(
      `https://api.pexels.com/v1/search?query=${q}&per_page=${perPage}&orientation=landscape`,
      { headers },
    ),
  ]);
  const items: BrollItem[] = [];
  if (videosRes.ok) {
    const data = await videosRes.json();
    for (const v of data.videos ?? []) {
      // Prefer an HD-but-not-4K file: light enough to preview on a phone.
      const files = [...(v.video_files ?? [])].sort(
        (a: { width: number }, b: { width: number }) => b.width - a.width,
      );
      const file =
        files.find((f: { width: number }) => f.width <= 1920) ?? files[0];
      if (!file) continue;
      items.push({
        url: file.link,
        thumb: v.image,
        kind: "video",
        source: "pexels",
        credit: v.user?.name ? `Pexels · ${v.user.name}` : "Pexels",
      });
    }
  }
  if (photosRes.ok) {
    const data = await photosRes.json();
    for (const p of data.photos ?? []) {
      items.push({
        url: p.src?.large2x ?? p.src?.large ?? p.src?.original,
        thumb: p.src?.medium,
        kind: "image",
        source: "pexels",
        credit: p.photographer ? `Pexels · ${p.photographer}` : "Pexels",
      });
    }
  }
  return items;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { query, perPage = 6 } = await req.json();
    if (!query || typeof query !== "string") {
      return jsonResponse({ error: "query is required" }, 400);
    }

    // All sources in parallel, each best-effort — one being down or unkeyed
    // never blanks the others.
    const settle = (p: Promise<BrollItem[]>) => p.catch(() => [] as BrollItem[]);
    const [pexels, wikimedia, met] = await Promise.all([
      settle(searchPexels(query, perPage)),
      settle(searchWikimedia(query, perPage)),
      settle(searchMet(query, Math.min(perPage, 5))),
    ]);

    // Stock video leads (motion sells the preview), then the archives —
    // paintings, manuscripts, artifacts — then stock photos.
    const videos = pexels.filter((i) => i.kind === "video");
    const photos = pexels.filter((i) => i.kind === "image");
    const items = [...videos, ...wikimedia, ...met, ...photos];

    return jsonResponse({ items });
  } catch (err) {
    return jsonResponse(
      { error: err instanceof Error ? err.message : String(err) },
      500,
    );
  }
});

// B-roll search: proxies Pexels (videos + photos) so the API key stays server
// side. Free key from https://www.pexels.com/api/ — set it with
//   supabase secrets set PEXELS_API_KEY=...
// Returns items shaped like the app's BuilderBrollItem.

import { corsHeaders, jsonResponse } from "../_shared/claude.ts";

interface BrollItem {
  url: string;
  thumb?: string;
  kind: "video" | "image";
  source: "pexels";
  credit?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("PEXELS_API_KEY");
    if (!apiKey) {
      return jsonResponse(
        {
          error:
            "Pexels isn't connected yet. Grab a free API key at pexels.com/api " +
            "(takes ~2 min) and add it as the PEXELS_API_KEY secret — then b-roll " +
            "search lights up. Until then you can attach your own uploads and links.",
        },
        400,
      );
    }

    const { query, perPage = 6 } = await req.json();
    if (!query || typeof query !== "string") {
      return jsonResponse({ error: "query is required" }, 400);
    }

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
    if (!videosRes.ok && !photosRes.ok) {
      return jsonResponse({ error: `Pexels error ${videosRes.status}` }, 502);
    }

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

    return jsonResponse({ items });
  } catch (err) {
    return jsonResponse(
      { error: err instanceof Error ? err.message : String(err) },
      500,
    );
  }
});

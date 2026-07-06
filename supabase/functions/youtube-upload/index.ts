// YouTube auto-upload. Resumable upload of a production's finished video to the
// channel's connected YouTube account, then marks the production published and
// links a tracked video record — closing the loop into the Vault.
//
// The video FILE comes from a directly-downloadable URL: an asset link on the
// production labelled "final" or "video" (a Google Drive direct-download link,
// a Supabase Storage URL, etc.). Metadata (title, description) comes from the
// doc. Requires GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET secrets and a channel
// connected via youtube-oauth. See docs/YOUTUBE_UPLOAD.md.

// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/claude.ts";

async function accessTokenFromRefresh(refreshToken: string): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error("Could not refresh YouTube access token");
  return data.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { organizationId, productionId } = await req.json();
    if (!organizationId || !productionId) {
      return jsonResponse({ error: "organizationId and productionId are required" }, 400);
    }

    // User-scoped client to authorize the caller (must be org admin/owner).
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
    const { data: prod } = await svc.from("productions").select("*").eq("id", productionId).single();
    if (!prod) return jsonResponse({ error: "production not found" }, 404);

    // The finished video file.
    const assets: any[] = Array.isArray(prod.asset_links) ? prod.asset_links : [];
    const fileUrl = assets.find((a) =>
      ["final", "video", "final cut", "master"].includes(String(a.label).toLowerCase()),
    )?.url;
    if (!fileUrl) {
      return jsonResponse(
        { error: "Add an asset link labelled 'final' (a direct-download URL to the video file) before publishing." },
        400,
      );
    }

    const { data: cred } = await svc
      .from("youtube_credentials").select("refresh_token").eq("channel_id", prod.channel_id).single();
    if (!cred) {
      return jsonResponse({ error: "This channel isn't connected to YouTube yet." }, 400);
    }

    const accessToken = await accessTokenFromRefresh(cred.refresh_token);

    const titles: any[] = Array.isArray(prod.title_candidates) ? prod.title_candidates : [];
    const title = titles.find((t) => t.starred)?.text ?? prod.title;
    const snippet = {
      snippet: { title: String(title).slice(0, 100), description: prod.description ?? "" },
      status: { privacyStatus: prod.scheduled_at ? "private" : "public" },
    };

    // 1. Start a resumable upload session.
    const start = await fetch(
      "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${accessToken}`,
          "content-type": "application/json",
          "x-upload-content-type": "video/*",
        },
        body: JSON.stringify(snippet),
      },
    );
    const uploadUrl = start.headers.get("location");
    if (!uploadUrl) {
      return jsonResponse({ error: `YouTube rejected the upload start: ${await start.text()}` }, 502);
    }

    // 2. Stream the file bytes into the session.
    const fileRes = await fetch(fileUrl);
    if (!fileRes.ok || !fileRes.body) {
      return jsonResponse({ error: "Couldn't fetch the video file from its asset link." }, 400);
    }
    const put = await fetch(uploadUrl, {
      method: "PUT",
      headers: { authorization: `Bearer ${accessToken}`, "content-type": "video/*" },
      body: fileRes.body,
    });
    const result = await put.json();
    if (!result.id) {
      return jsonResponse({ error: `Upload failed: ${JSON.stringify(result)}` }, 502);
    }

    const videoUrl = `https://www.youtube.com/watch?v=${result.id}`;

    // 3. Link a tracked video record and mark the production published.
    let linkedVideoId = prod.linked_video_id;
    if (!linkedVideoId) {
      const { data: video } = await svc.from("videos").insert({
        channel_id: prod.channel_id,
        title,
        url: videoUrl,
        published_at: new Date().toISOString(),
        format: "long_form",
        manual_notes: prod.goal ? `Goal: ${prod.goal}` : null,
      }).select("id").single();
      linkedVideoId = video?.id;
    }
    await svc.from("productions").update({
      stage: "published",
      linked_video_id: linkedVideoId,
    }).eq("id", productionId);

    return jsonResponse({ videoUrl, youtubeId: result.id });
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: String(err) }, 500);
  }
});

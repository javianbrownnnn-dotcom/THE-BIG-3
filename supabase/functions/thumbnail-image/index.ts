// Thumbnail image generation — the Gemini provider adapter.
//
// Provider architecture: Gemini is the cheap automated image path; Canva is
// the design/template/export layer (link-out + prompt copy in the client —
// its API needs an OAuth app, so the client treats it as a guided manual
// path); manual upload is the always-available fallback. This function only
// handles the Gemini path, keyed by GEMINI_API_KEY:
//
//   supabase secrets set GEMINI_API_KEY=AIza...   (aistudio.google.com/apikey)
//
// If the key is missing we return actionable setup instructions in the error
// instead of breaking the UI.

// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/claude.ts";

const MODEL = Deno.env.get("GEMINI_IMAGE_MODEL") ?? "gemini-2.5-flash-image";
const API = "https://generativelanguage.googleapis.com/v1beta/models";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { organizationId, projectId, conceptName } = await req.json();
    if (!organizationId || !projectId || !conceptName) {
      return jsonResponse({ error: "organizationId, projectId, conceptName required" }, 400);
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return jsonResponse({
        error:
          "Gemini isn't connected yet. Get a free API key at aistudio.google.com/apikey, " +
          "then add it in Supabase → Edge Functions → Secrets as GEMINI_API_KEY. " +
          "Until then, use the Canva prompt or upload a thumbnail manually.",
      }, 400);
    }

    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } },
    );
    const { data: auth } = await db.auth.getUser();
    if (!auth?.user) return jsonResponse({ error: "unauthorized" }, 401);

    const { data: project } = await db
      .from("content_projects").select("thumbnail_lab,selected_title").eq("id", projectId).single();
    const concept = project?.thumbnail_lab?.concepts?.find(
      (c: any) => c.conceptName === conceptName,
    );
    if (!concept) {
      return jsonResponse({ error: "concept not found — run the Thumbnail Studio first" }, 404);
    }

    // Thumbnail prompt rules are baked into providerPromptGemini at concept
    // time; reinforce the invariants here.
    const prompt =
      `${concept.providerPromptGemini}\n` +
      `16:9 aspect ratio, 1280x720 YouTube thumbnail, premium documentary aesthetic, ` +
      `one clear subject, high contrast, mobile-first readability, no clutter, no text overlays, ` +
      `no copyrighted logos, no misleading depictions of real people.` +
      (concept.negativePrompt ? `\nAvoid: ${concept.negativePrompt}` : "");

    const res = await fetch(`${API}/${MODEL}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ["IMAGE"] },
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      if (res.status === 429) {
        return jsonResponse({
          error:
            "Gemini's free tier ran out of image quota for now. Options: " +
            "(1) wait — free quota resets daily; " +
            "(2) enable billing on your key at aistudio.google.com (images cost ~$0.04 each); " +
            "(3) use the Canva button or Copy prompt + any image tool, then upload the result here.",
        }, 429);
      }
      return jsonResponse({ error: `Gemini API ${res.status}: ${body.slice(0, 400)}` }, 502);
    }
    const data = await res.json();
    const part = data.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
    if (!part) {
      return jsonResponse({
        error: "Gemini returned no image (the prompt may have been filtered) — adjust the concept and retry.",
      }, 502);
    }

    const mime = part.inlineData.mimeType ?? "image/png";
    return jsonResponse({
      imageUrl: `data:${mime};base64,${part.inlineData.data}`,
      prompt,
    });
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: String(err) }, 500);
  }
});

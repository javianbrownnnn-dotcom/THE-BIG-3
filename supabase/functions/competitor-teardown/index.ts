// AI competitor teardown — Claude explains why a competitor outlier broke out
// and adapts the transferable mechanism into a ready-to-produce idea for one of
// your channels. Invoked with the caller's JWT so RLS scopes every read.

// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2";
import { askClaudeJson, corsHeaders, jsonResponse } from "../_shared/claude.ts";
import { loadOrgContext } from "../_shared/context.ts";

const SYSTEM = `You tear down why a competitor's YouTube video outperformed and turn the lesson into a producible idea for the user's channel.
Analyze the *mechanism* (packaging, hook, structure, promise), never just the topic. The idea must transfer the mechanism to the target channel's niche WITHOUT copying the subject, and must be honest (no clickbait the content can't pay off).
Return STRICT JSON:
{
  "whyItWorked": string,            // 2-3 sentences, specific to this video's signals
  "observations": string,          // what generalizes vs what is topic-specific
  "transferableMoves": string[],   // 3 concrete moves the team can reuse
  "idea": { "title": string, "description": string, "tags": string[] }
}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { organizationId, competitorVideoId, targetChannelId } = await req.json();
    if (!organizationId || !competitorVideoId) {
      return jsonResponse({ error: "organizationId and competitorVideoId required" }, 400);
    }

    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } },
    );
    const { data: auth } = await db.auth.getUser();
    if (!auth?.user) return jsonResponse({ error: "unauthorized" }, 401);

    const { data: video, error: vErr } = await db
      .from("competitor_videos").select("*").eq("id", competitorVideoId).single();
    if (vErr || !video) return jsonResponse({ error: "competitor video not found" }, 404);

    const ctx = await loadOrgContext(db, organizationId, { videoLimit: 40 });
    const channel = targetChannelId
      ? ctx.channels.find((c: any) => c.id === targetChannelId)
      : ctx.channels[0];

    const teardown = await askClaudeJson<{
      whyItWorked: string; observations: string;
      transferableMoves: string[]; idea: { title: string; description: string; tags: string[] };
    }>([
      {
        role: "user",
        content:
          `Tear down this competitor outlier and adapt it for our channel.\n\n` +
          `Competitor video: ${JSON.stringify({
            title: video.title, topic: video.topic, hook: video.hook,
            storyStructure: video.story_structure, views: video.views,
            viewsPerDay: video.views_per_day, outlierScore: video.outlier_score,
          })}\n\n` +
          `Target channel: ${JSON.stringify(channel ?? { name: "our channel" })}\n\n` +
          `Our recent videos (avoid repeating these topics): ${JSON.stringify(
            ctx.videos.slice(0, 20).map((v: any) => v.topic || v.title),
          )}`,
      },
    ], { system: SYSTEM });

    return jsonResponse(teardown);
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: String(err) }, 500);
  }
});

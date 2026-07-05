// AI idea generation — OpenAI proposes fresh video ideas grounded in the org's
// own performance and competitor landscape, deliberately avoiding topics
// already covered. Invoked with the caller's JWT so RLS scopes every read.

// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/claude.ts";
import { askOpenAiJson } from "../_shared/openai.ts";
import { loadOrgContext } from "../_shared/context.ts";

const SYSTEM = `You are an idea strategist for a YouTube media company using The Big 3 OS.
Generate fresh, specific video ideas that fit the channel's niche and what's already working.
Rules:
- Each idea is a concrete angle with tension, not a broad topic. "How Rolex manufactures scarcity", not "a video about Rolex".
- Ground ideas in the demand evidence: lean toward mechanisms proven by the competitor outliers provided.
- Do NOT repeat topics the channel has already covered (a list is provided).
- Favor the channel's best-performing hook types and story structures.
Return STRICT JSON: { "ideas": [{ "title": string, "description": string, "rationale": string, "suggestedHook": string, "tags": string[] }] }`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { organizationId, channelId, count = 6 } = await req.json();
    if (!organizationId) return jsonResponse({ error: "organizationId required" }, 400);

    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } },
    );
    const { data: auth } = await db.auth.getUser();
    if (!auth?.user) return jsonResponse({ error: "unauthorized" }, 401);

    const ctx = await loadOrgContext(db, organizationId, { videoLimit: 100 });
    const channel = channelId ? ctx.channels.find((c: any) => c.id === channelId) : null;
    const coveredTopics = ctx.videos
      .filter((v: any) => !channelId || v.channel_id === channelId)
      .map((v: any) => v.topic || v.title);

    const { ideas } = await askOpenAiJson<{ ideas: any[] }>([
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content:
          `Generate ${count} video ideas` +
          (channel ? ` for the channel "${channel.name}" (niche: ${channel.niche}).` : " across the channels below.") +
          `\n\nAlready covered (avoid these): ${JSON.stringify(coveredTopics)}` +
          `\n\nChannels: ${JSON.stringify(ctx.channels)}` +
          `\n\nCompetitor outliers (demand evidence): ${JSON.stringify(ctx.competitorOutliers)}` +
          `\n\nRecent videos with metrics: ${JSON.stringify(ctx.videos.slice(0, 30))}`,
      },
    ]);

    return jsonResponse({ ideas: ideas ?? [] });
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: String(err) }, 500);
  }
});

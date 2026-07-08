// AI idea generation — OpenAI proposes fresh video ideas grounded in the org's
// own performance and competitor landscape, deliberately avoiding topics
// already covered. Invoked with the caller's JWT so RLS scopes every read.

// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/claude.ts";
import { askOpenAiJson } from "../_shared/openai.ts";
import { loadOrgContext } from "../_shared/context.ts";

const SYSTEM = `You are an idea strategist for a YouTube media company using The Big 3 OS.
Relevance comes before generation. Work in two passes:
PASS 1 — generate twice as many candidate ideas as requested. Each is a concrete angle with tension, not a broad topic. "How Rolex manufactures scarcity", not "a video about Rolex".
PASS 2 — score every candidate 1-10 on this relevance rubric, then return ONLY the requested number, best first, discarding anything under 7:
  * demand evidence: is the mechanism proven by a competitor outlier or the channel's own best videos?
  * niche fit: does it belong on THIS channel, for its actual viewer?
  * emotional pull: is there a human stake, cost, or contradiction — not just information?
  * specificity: one person / one company / one decision, never a survey of a theme
  * freshness: clearly distinct from covered topics AND from everything currently in the works
Rules:
- Ground ideas in the demand evidence: lean toward mechanisms proven by the competitor outliers provided.
- Do NOT repeat topics the channel has already covered (a list is provided).
- Do NOT duplicate anything the team is currently working on (in-flight productions and Content Studio projects are provided) — propose ideas that complement the current slate instead.
- Follow the Script Bible rules (writing law distilled from the creator's own feedback).
- Favor the channel's best-performing hook types and story structures.
- Never inflate scores: a 9 must be an idea you would bet a production budget on.
Return STRICT JSON: { "ideas": [{ "title": string, "description": string, "rationale": string, "suggestedHook": string, "tags": string[], "relevanceScore": number, "whyRelevant": string, "personaFit": string }] }`;

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
          `Generate ${count * 2} candidates, score them, and return the ${count} most relevant video ideas` +
          (channel ? ` for the channel "${channel.name}" (niche: ${channel.niche}).` : " across the channels below.") +
          `\n\nAlready covered (avoid these): ${JSON.stringify(coveredTopics)}` +
          `\n\nChannels: ${JSON.stringify(ctx.channels)}` +
          `\n\nCompetitor outliers (demand evidence): ${JSON.stringify(ctx.competitorOutliers)}` +
          `\n\nRecent videos with metrics: ${JSON.stringify(ctx.videos.slice(0, 30))}` +
          `\n\nCurrently in the works (do not duplicate; complement): ${JSON.stringify(ctx.currentWork)}` +
          `\n\nScript Bible rules (follow): ${JSON.stringify(ctx.scriptBible)}`,
      },
    ]);

    // Server-side floor: whatever the model claims, nothing under 7 ships.
    const vetted = (ideas ?? [])
      .filter((i: any) => (i.relevanceScore ?? 0) >= 7)
      .sort((a: any, b: any) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0));
    return jsonResponse({ ideas: vetted.length ? vetted : (ideas ?? []).slice(0, count) });
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: String(err) }, 500);
  }
});

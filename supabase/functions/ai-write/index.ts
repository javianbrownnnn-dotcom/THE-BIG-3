// AI writing — Claude drafts a first pass (hook, script outline, description,
// title candidates) for a production, grounded in the org's SOPs, its
// best-performing hook type, and competitor mechanisms. "AI drafts, humans
// polish": the app only fills empty fields with this, never overwrites work.

// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2";
import { askClaudeJson, corsHeaders, jsonResponse } from "../_shared/claude.ts";
import { contextToPrompt, loadOrgContext } from "../_shared/context.ts";

const SYSTEM = `You write first-draft scripts for a YouTube media company using The Big 3 OS.
You produce a scaffold a human will polish — strong bones, not final copy.
Follow the company's own SOPs and data (provided). Return STRICT JSON:
{
  "hookText": string,          // first 30 seconds: a concrete cold-open scene with stakes, no "in this video"
  "scriptBody": string,        // act-by-act outline (Act 1/2/3) with the key beats and a midpoint turn
  "description": string,       // YouTube description with a one-line no-spoiler hook + chapters stub
  "titleCandidates": [{ "text": string, "starred": boolean }]  // 5 options, one starred, each <= 55 chars
}
Use the channel's best-performing hook type. Ground the angle in a competitor mechanism when relevant.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { organizationId, productionId } = await req.json();
    if (!organizationId || !productionId) {
      return jsonResponse({ error: "organizationId and productionId are required" }, 400);
    }
    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } },
    );
    const { data: auth } = await db.auth.getUser();
    if (!auth?.user) return jsonResponse({ error: "unauthorized" }, 401);

    const { data: prod } = await db.from("productions").select("*").eq("id", productionId).single();
    if (!prod) return jsonResponse({ error: "production not found" }, 404);

    const ctx = await loadOrgContext(db, organizationId);
    const draft = await askClaudeJson<any>([
      {
        role: "user",
        content:
          `Draft a first pass for this video.\n` +
          `Title: ${prod.title}\nTopic: ${prod.topic ?? ""}\nGoal: ${prod.goal ?? ""}\n\n` +
          `<company_data>\n${contextToPrompt(ctx)}\n</company_data>`,
      },
    ], { system: SYSTEM });

    // Guard the shape so the client always gets a usable DraftResult.
    return jsonResponse({
      hookText: draft.hookText ?? "",
      scriptBody: draft.scriptBody ?? "",
      description: draft.description ?? "",
      titleCandidates: Array.isArray(draft.titleCandidates)
        ? draft.titleCandidates.map((t: any) => ({
            text: String(t.text ?? t),
            starred: !!t.starred,
          }))
        : [],
    });
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: String(err) }, 500);
  }
});

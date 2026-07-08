// AI Shorts derivation — Claude cuts a finished (or drafted) long-form script
// into N self-contained vertical Shorts. Each Short is one beat of the source
// script: cold claim, one proof, twist, loop back. The client turns each into
// its own production doc (format 'short') so Shorts run the normal pipeline.

// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2";
import { askClaudeJson, corsHeaders, jsonResponse } from "../_shared/claude.ts";
import { loadOrgContext } from "../_shared/context.ts";

const SYSTEM = `You cut long-form YouTube scripts into Shorts for a documentary media company.
Each Short must stand alone: one idea, one beat of the source script, nothing that needs the full video for context.
Rules:
- Hook = the single most surprising claim of that beat, stated flat out in the first sentence. No setup, no "did you know".
- Script ≈ 110-160 words (~45-60 seconds spoken). Structure: cold claim → the one proof → twist/consequence → loop back to the opening claim so the Short rewatches.
- Pull concrete facts and lines FROM THE PROVIDED SCRIPT. Never invent facts that aren't in it; if the script is an outline, keep bracketed [placeholders] where the human must drop in the real detail.
- Titles <= 80 chars, curiosity-first, no clickbait lies.
- onScreenText = 3-6 words shown as the opening text overlay.
- Follow the Script Bible rules provided — they are writing law distilled from the creator's own feedback.
- Prefer the winning mechanisms from the competitor playbook provided; those hooks are proven in this niche.
Return STRICT JSON, no prose:
{ "shorts": [{ "title": string, "hook": string, "script": string, "onScreenText": string }] }`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { organizationId, productionId, count } = await req.json();
    if (!organizationId || !productionId) {
      return jsonResponse({ error: "organizationId and productionId are required" }, 400);
    }
    const n = Math.min(Math.max(Number(count) || 3, 1), 5);

    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } },
    );
    const { data: auth } = await db.auth.getUser();
    if (!auth?.user) return jsonResponse({ error: "unauthorized" }, 401);

    const { data: prod } = await db.from("productions")
      .select("*").eq("id", productionId).single();
    if (!prod) return jsonResponse({ error: "production not found" }, 404);

    const script = [prod.hook_text, prod.script_hook, prod.script_body, prod.script_outro]
      .filter((s: any) => typeof s === "string" && s.trim()).join("\n\n");
    if (script.trim().length < 80) {
      return jsonResponse({ error: "Not enough script yet — write or AI-draft the long-form script first" }, 400);
    }

    // Ground the cuts in everything the system has learned: the Script Bible
    // (creator feedback → rules) and the competitor playbook (proven hooks).
    const ctx = await loadOrgContext(db, organizationId, { videoLimit: 10 });

    const result = await askClaudeJson<any>([
      {
        role: "user",
        content:
          `Cut this long-form script into ${n} Shorts.\n` +
          `Video title: ${prod.title}\nTopic: ${prod.topic ?? ""}\n\n` +
          `<script>\n${script}\n</script>\n\n` +
          `<script_bible>\n${JSON.stringify(ctx.scriptBible)}\n</script_bible>\n\n` +
          `<competitor_playbook>\n${JSON.stringify(ctx.competitorPlaybook)}\n</competitor_playbook>`,
      },
    ], { system: SYSTEM, maxTokens: 3000 });

    // Guard the shape so the client always gets usable shorts.
    const shorts = (Array.isArray(result.shorts) ? result.shorts : [])
      .slice(0, n)
      .map((s: any) => ({
        title: String(s.title ?? prod.title).slice(0, 120),
        hook: String(s.hook ?? ""),
        script: String(s.script ?? ""),
        onScreenText: s.onScreenText ? String(s.onScreenText) : undefined,
      }))
      .filter((s: any) => s.script.trim());
    if (!shorts.length) return jsonResponse({ error: "Claude returned no usable shorts" }, 502);

    return jsonResponse({ shorts });
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: String(err) }, 500);
  }
});

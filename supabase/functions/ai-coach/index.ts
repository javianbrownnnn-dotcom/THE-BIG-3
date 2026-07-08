// AI Coach — the company strategist.
// Answers natural-language questions grounded in the org's real performance
// data. Invoked from the app with the caller's JWT, so RLS scopes every
// query to organizations the user actually belongs to.

// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2";
import { askClaude, corsHeaders, jsonResponse } from "../_shared/claude.ts";
import { contextToPrompt, loadOrgContext } from "../_shared/context.ts";

const SYSTEM_PROMPT = `You are the AI Coach for a YouTube media company using The Big 3 OS.
You are the company's strategist. Your one job is to help the team answer:
"What should we change next to consistently make better videos?"

Rules:
- Ground every claim in the data provided. Cite specific videos, metrics, and deltas.
- When sample sizes are small, say so — do not overclaim patterns from 2-3 videos.
- Prefer concrete, testable recommendations ("test X on the next 3 videos") over generalities.
- When a recommendation would change how the team works, suggest updating the relevant SOP.
- You can see what the team is working on RIGHT NOW (in-flight productions and Content Studio projects) — tie advice to the current slate, reference docs by title, and never suggest making something that's already in the works.
- Follow the Script Bible rules in the context; they are writing law distilled from the creator's own feedback.
- Be direct and concise. The team is small and busy.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { organizationId, conversationId, message } = await req.json();
    if (!organizationId || !message) {
      return jsonResponse({ error: "organizationId and message are required" }, 400);
    }

    // User-scoped client: RLS enforces org membership on every read/write.
    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } },
    );

    const { data: auth } = await db.auth.getUser();
    if (!auth?.user) return jsonResponse({ error: "unauthorized" }, 401);

    // Find or start the conversation.
    let convId = conversationId as string | undefined;
    if (!convId) {
      const { data: conv, error } = await db.from("ai_conversations")
        .insert({
          organization_id: organizationId,
          user_id: auth.user.id,
          title: message.slice(0, 80),
        })
        .select("id").single();
      if (error) throw error;
      convId = conv.id;
    }

    const { data: history } = await db.from("ai_messages")
      .select("role,content")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true })
      .limit(30);

    const ctx = await loadOrgContext(db, organizationId);

    const answer = await askClaude(
      [
        ...(history ?? []).map((m: any) => ({ role: m.role, content: m.content })),
        {
          role: "user" as const,
          content: `${message}\n\n<company_data>\n${contextToPrompt(ctx)}\n</company_data>`,
        },
      ],
      { system: SYSTEM_PROMPT },
    );

    await db.from("ai_messages").insert([
      { conversation_id: convId, role: "user", content: message },
      { conversation_id: convId, role: "assistant", content: answer },
    ]);

    return jsonResponse({ conversationId: convId, answer });
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: String(err) }, 500);
  }
});

// Public read-only endpoint for shared idea briefs. GET ?t=<token> returns the
// brief as plain markdown, so the link can be pasted into ChatGPT (or any tool
// that fetches URLs). No JWT — the unguessable token is the credential; reads
// go through the service role, scoped to the exact token.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/claude.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const token = new URL(req.url).searchParams.get("t");
  if (!token) {
    return new Response("Missing token", { status: 400, headers: corsHeaders });
  }

  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data } = await db
    .from("shared_briefs").select("title, content_md").eq("token", token).single();
  if (!data) {
    return new Response("Brief not found", { status: 404, headers: corsHeaders });
  }

  return new Response(data.content_md, {
    headers: {
      ...corsHeaders,
      "content-type": "text/markdown; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  });
});

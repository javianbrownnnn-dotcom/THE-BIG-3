// Report generation — weekly / monthly / quarterly / per-channel /
// cross-channel / competitor reports, written by Claude from real data and
// stored as markdown (exportable as-is).

// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2";
import { askClaude, corsHeaders, jsonResponse } from "../_shared/claude.ts";
import { contextToPrompt, loadOrgContext } from "../_shared/context.ts";

const REPORT_SYSTEM = `You write performance reports for a YouTube media company.
Write clean markdown with these sections:
# <title>
## Summary  (3-5 sentences, lead with the most important change)
## What worked
## What didn't
## Competitor landscape
## Experiments & SOP changes
## Recommended focus for next period
Ground every claim in the provided data with concrete numbers. Flag small sample
sizes honestly. No filler.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { organizationId, channelId, type, periodStart, periodEnd } = await req.json();
    if (!organizationId || !type || !periodStart || !periodEnd) {
      return jsonResponse(
        { error: "organizationId, type, periodStart, periodEnd are required" }, 400);
    }

    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } },
    );
    const { data: auth } = await db.auth.getUser();
    if (!auth?.user) return jsonResponse({ error: "unauthorized" }, 401);

    const ctx = await loadOrgContext(db, organizationId, { videoLimit: 100 });

    const title = channelId
      ? `${type} report — ${ctx.channels.find((c: any) => c.id === channelId)?.name ?? "channel"}`
      : `${type} report — all channels`;

    const content = await askClaude([{
      role: "user",
      content:
        `Write a ${type} report titled "${title}" covering ${periodStart} to ${periodEnd}.` +
        (channelId ? ` Focus only on channel ${channelId}.` : " Cover all channels and compare them.") +
        `\n\n<company_data>\n${contextToPrompt(ctx)}\n</company_data>`,
    }], { system: REPORT_SYSTEM, maxTokens: 8192 });

    const { data: report, error } = await db.from("reports").insert({
      organization_id: organizationId,
      channel_id: channelId ?? null,
      type,
      title,
      period_start: periodStart,
      period_end: periodEnd,
      content_md: content,
      source: "ai",
      created_by: auth.user.id,
    }).select("id").single();
    if (error) throw error;

    return jsonResponse({ id: report.id, title, content });
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: String(err) }, 500);
  }
});

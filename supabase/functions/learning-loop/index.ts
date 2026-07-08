// The learning loop — the heartbeat of The Big 3 OS.
//
// Runs on a schedule (GitHub Action or Supabase cron) with the service role.
// For every organization it:
//   1. Detects statistical changes in video metrics (CTR, retention).
//   2. Flags competitor outliers (views/day z-score vs. channel baseline).
//   3. Asks Claude to turn the statistics into insights + SOP recommendations.
//   4. Optionally drafts a new SOP version (append-only — old versions kept).
//   5. Notifies the team.
//   6. Scores past recommendations against videos published since adoption,
//      so the system learns which of its own suggestions actually worked.

// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2";
import { askClaudeJson, corsHeaders, jsonResponse } from "../_shared/claude.ts";
import { contextToPrompt, loadOrgContext } from "../_shared/context.ts";

const OUTLIER_Z_THRESHOLD = 2.0;
const MIN_SAMPLE = 4;

function mean(xs: number[]) {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}
function stddev(xs: number[]) {
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
}

/** Welch's t-statistic — good enough to rank "statistically interesting". */
function tStat(a: number[], b: number[]) {
  const va = stddev(a) ** 2 / a.length;
  const vb = stddev(b) ** 2 / b.length;
  if (va + vb === 0) return 0;
  return (mean(a) - mean(b)) / Math.sqrt(va + vb);
}

interface LoopFindings {
  metricShifts: any[];
  newOutliers: any[];
}

async function detectMetricShifts(db: any, channelIds: string[]): Promise<any[]> {
  const shifts: any[] = [];
  for (const channelId of channelIds) {
    const { data: videos } = await db.from("videos")
      .select("id,title,published_at")
      .eq("channel_id", channelId)
      .not("published_at", "is", null)
      .order("published_at", { ascending: false })
      .limit(MIN_SAMPLE * 4);
    if (!videos || videos.length < MIN_SAMPLE * 2) continue;

    const ids = videos.map((v: any) => v.id);
    const { data: metrics } = await db.from("video_current_metrics")
      .select("video_id,ctr,avg_percent_viewed").in("video_id", ids);
    const byId = new Map((metrics ?? []).map((m: any) => [m.video_id, m]));

    for (const metric of ["ctr", "avg_percent_viewed"] as const) {
      const series = videos
        .map((v: any) => byId.get(v.id)?.[metric])
        .filter((x: any): x is number => typeof x === "number");
      if (series.length < MIN_SAMPLE * 2) continue;
      const recent = series.slice(0, MIN_SAMPLE);
      const baseline = series.slice(MIN_SAMPLE);
      const t = tStat(recent, baseline);
      if (Math.abs(t) >= 2) {
        shifts.push({
          channelId, metric,
          recentMean: +mean(recent).toFixed(2),
          baselineMean: +mean(baseline).toFixed(2),
          tStat: +t.toFixed(2),
          direction: t > 0 ? "up" : "down",
          nRecent: recent.length,
          nBaseline: baseline.length,
        });
      }
    }
  }
  return shifts;
}

async function detectCompetitorOutliers(db: any, organizationId: string): Promise<any[]> {
  const { data: compChannels } = await db.from("competitor_channels")
    .select("id,name").eq("organization_id", organizationId);
  const found: any[] = [];

  for (const cc of compChannels ?? []) {
    const { data: vids } = await db.from("competitor_videos")
      .select("id,title,is_outlier").eq("competitor_channel_id", cc.id);
    if (!vids || vids.length < MIN_SAMPLE) continue;

    const { data: snaps } = await db.from("competitor_video_snapshots")
      .select("competitor_video_id,views_per_day,captured_at")
      .in("competitor_video_id", vids.map((v: any) => v.id))
      .order("captured_at", { ascending: false });

    const latest = new Map<string, number>();
    for (const s of snaps ?? []) {
      if (!latest.has(s.competitor_video_id) && s.views_per_day != null) {
        latest.set(s.competitor_video_id, s.views_per_day);
      }
    }
    const values = [...latest.values()];
    if (values.length < MIN_SAMPLE) continue;
    const m = mean(values), sd = stddev(values);
    if (sd === 0) continue;

    for (const v of vids) {
      const vpd = latest.get(v.id);
      if (vpd == null) continue;
      const z = (vpd - m) / sd;
      if (z >= OUTLIER_Z_THRESHOLD && !v.is_outlier) {
        await db.from("competitor_videos")
          .update({ is_outlier: true, outlier_score: +z.toFixed(2) })
          .eq("id", v.id);
        found.push({ channel: cc.name, title: v.title, viewsPerDay: vpd, z: +z.toFixed(2) });
      }
    }
  }
  return found;
}

/** Score past recommendations: did the metric improve after adoption? */
async function scoreRecommendations(db: any, organizationId: string) {
  const { data: recs } = await db.from("ai_recommendations")
    .select("id,created_at,measured_impact,sop_id")
    .eq("organization_id", organizationId)
    .eq("status", "testing");

  for (const rec of recs ?? []) {
    const { data: links } = await db.from("sop_video_links")
      .select("video_id").eq("sop_id", rec.sop_id);
    if (!links?.length) continue;
    const { data: metrics } = await db.from("video_current_metrics")
      .select("video_id,ctr").in("video_id", links.map((l: any) => l.video_id));
    const { data: vids } = await db.from("videos")
      .select("id,published_at").in("id", links.map((l: any) => l.video_id));
    const publishedAt = new Map((vids ?? []).map((v: any) => [v.id, v.published_at]));

    const before: number[] = [], after: number[] = [];
    for (const m of metrics ?? []) {
      if (m.ctr == null) continue;
      const pub = publishedAt.get(m.video_id);
      (pub && pub > rec.created_at ? after : before).push(m.ctr);
    }
    if (before.length >= MIN_SAMPLE && after.length >= MIN_SAMPLE) {
      const t = tStat(after, before);
      await db.from("ai_recommendations").update({
        status: t > 1 ? "validated" : t < -1 ? "failed" : "testing",
        measured_impact: {
          metric: "ctr",
          before: +mean(before).toFixed(2),
          after: +mean(after).toFixed(2),
          nBefore: before.length,
          nAfter: after.length,
          tStat: +t.toFixed(2),
        },
      }).eq("id", rec.id);
    }
  }
}

// ---------------------------------------------------------------------------
// Teardown synthesis: every 20 banked competitor teardowns, distill the
// winning mechanisms into (a) a playbook insight that grounds every AI
// surface (it flows into the shared context) and (b) SOP change proposals
// that land in the approval queue — a human still closes the loop.
// ---------------------------------------------------------------------------

const SYNTHESIS_BATCH = 20;

const SYNTHESIS_SYSTEM = `You distill competitor video teardowns into the winning playbook for a YouTube media company.
You receive the teardowns (why each outlier worked + transferable moves) and the company's active SOPs.
Find the mechanisms that REPEAT across teardowns — hooks, packaging promises, structures. Ignore one-offs.
Return STRICT JSON, no prose:
{
  "playbook": { "title": string, "body": string, "confidence": number },
  "recommendations": [{
    "title": string, "rationale": string, "sopId": string|null,
    "proposedVersion": { "purpose": string, "whenToUse": string, "steps": string[], "examples": string, "changeSummary": string }
  }]
}
Rules: only claim a pattern if it appears in at least a quarter of the teardowns, and cite the count (e.g. "12 of 20 teardowns").
Target an existing SOP by its id when one fits; otherwise sopId null proposes a new SOP.
Keep the playbook body under 150 words — it is injected into every AI prompt. Never invent data.`;

async function synthesizeTeardowns(db: any, organizationId: string) {
  const { data: torn } = await db.from("competitor_videos")
    .select("title,topic,hook,story_structure,outlier_score,teardown,teardown_at,competitor_channels!inner(name,organization_id)")
    .eq("competitor_channels.organization_id", organizationId)
    .not("teardown", "is", null)
    .order("teardown_at", { ascending: false });
  const count = torn?.length ?? 0;
  if (count < SYNTHESIS_BATCH) return null;

  // Gate: run once per batch of 20 (20, 40, 60…), tracked on the last
  // synthesis insight so scheduled reruns don't re-synthesize.
  const { data: lastRuns } = await db.from("ai_insights")
    .select("data")
    .eq("organization_id", organizationId)
    .eq("data->>source", "teardown_synthesis")
    .order("created_at", { ascending: false })
    .limit(1);
  const lastCount = Number(lastRuns?.[0]?.data?.teardownCount ?? 0);
  if (Math.floor(count / SYNTHESIS_BATCH) <= Math.floor(lastCount / SYNTHESIS_BATCH)) {
    return null;
  }

  const { data: sops } = await db.from("sops")
    .select("id,title,category").eq("organization_id", organizationId)
    .eq("status", "active");

  const input = (torn ?? []).slice(0, 60).map((v: any) => ({
    channel: v.competitor_channels?.name,
    title: v.title,
    hook: v.hook,
    structure: v.story_structure,
    z: v.outlier_score,
    whyItWorked: v.teardown?.whyItWorked,
    moves: v.teardown?.transferableMoves,
  }));

  const result = await askClaudeJson<{
    playbook: { title: string; body: string; confidence: number };
    recommendations: any[];
  }>([{
    role: "user",
    content:
      `Synthesize the winning playbook from these ${count} competitor teardowns.\n\n` +
      `<teardowns>\n${JSON.stringify(input)}\n</teardowns>\n\n` +
      `<active_sops>\n${JSON.stringify(sops ?? [])}\n</active_sops>`,
  }], { system: SYNTHESIS_SYSTEM });

  await db.from("ai_insights").insert({
    organization_id: organizationId,
    kind: "competitor",
    title: result.playbook?.title ?? `Competitor playbook (from ${count} teardowns)`,
    body: result.playbook?.body ?? "",
    confidence: result.playbook?.confidence ?? 0.7,
    data: { source: "teardown_synthesis", teardownCount: count },
  });

  let recs = 0;
  for (const rec of result.recommendations ?? []) {
    if (!rec?.proposedVersion) continue;
    let sopTitle = rec.title;
    let category: string | null = null;
    if (rec.sopId) {
      const match = (sops ?? []).find((s: any) => s.id === rec.sopId);
      if (!match) rec.sopId = null; // model pointed at a nonexistent SOP — propose new
      else {
        sopTitle = match.title;
        category = match.category ?? null;
      }
    }
    await db.from("ai_recommendations").insert({
      organization_id: organizationId,
      sop_id: rec.sopId ?? null,
      title: rec.title,
      rationale: rec.rationale,
      proposed_change: {
        ...(rec.sopId ? { sop_id: rec.sopId } : {}),
        sop_title: sopTitle,
        category,
        purpose: rec.proposedVersion.purpose,
        when_to_use: rec.proposedVersion.whenToUse,
        steps: rec.proposedVersion.steps,
        examples: rec.proposedVersion.examples,
        change_summary: rec.proposedVersion.changeSummary,
      },
    });
    recs++;
  }

  await db.from("notifications").insert({
    organization_id: organizationId,
    type: "ai_recommendation",
    title: "Competitor playbook synthesized",
    body: `${count} teardowns distilled into the winning playbook — ` +
      `${recs} SOP update${recs === 1 ? "" : "s"} waiting for approval. ` +
      `Every AI surface now trains on it.`,
  });

  return { teardowns: count, recommendations: recs };
}

const ANALYST_SYSTEM = `You are the analysis engine of The Big 3 OS, an operating system for YouTube media companies.
You receive (a) statistically detected changes and (b) the company's full performance context.
Return STRICT JSON, no prose, matching:
{
  "insights": [{ "kind": "pattern"|"anomaly"|"competitor", "title": string, "body": string, "confidence": number, "channelId": string|null }],
  "recommendations": [{
    "title": string, "rationale": string, "sopId": string|null,
    "proposedVersion": { "purpose": string, "whenToUse": string, "steps": string[], "examples": string, "changeSummary": string } | null
  }]
}
Only propose a new SOP version when the evidence is strong (clear metric shift plus a plausible mechanism).
Never invent data. Reference concrete numbers from the input. Keep insights under 120 words each.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { data: orgs } = await db.from("organizations").select("id,name");
    const results: any[] = [];

    for (const org of orgs ?? []) {
      const { data: channels } = await db.from("channels")
        .select("id").eq("organization_id", org.id);
      const channelIds = (channels ?? []).map((c: any) => c.id);

      const findings: LoopFindings = {
        metricShifts: await detectMetricShifts(db, channelIds),
        newOutliers: await detectCompetitorOutliers(db, org.id),
      };
      await scoreRecommendations(db, org.id);
      // Independent of metric shifts: distill the competitor playbook once
      // every 20 banked teardowns.
      let synthesis: { teardowns: number; recommendations: number } | null = null;
      try {
        synthesis = await synthesizeTeardowns(db, org.id);
      } catch (err) {
        console.error("teardown synthesis failed", err);
      }

      // Notify on outliers regardless of whether Claude runs.
      for (const o of findings.newOutliers) {
        await db.from("notifications").insert({
          organization_id: org.id,
          type: "competitor_outlier",
          title: `Competitor outlier: ${o.title}`,
          body: `${o.channel} is doing ${Math.round(o.viewsPerDay).toLocaleString()} views/day (z=${o.z}).`,
        });
      }
      for (const s of findings.metricShifts) {
        if (s.metric === "ctr" && s.direction === "down") {
          await db.from("notifications").insert({
            organization_id: org.id,
            type: "ctr_drop",
            title: "CTR is trending down",
            body: `Recent mean ${s.recentMean}% vs baseline ${s.baselineMean}% (t=${s.tStat}).`,
          });
        }
        if (s.metric === "avg_percent_viewed" && s.direction === "up") {
          await db.from("notifications").insert({
            organization_id: org.id,
            type: "retention_improved",
            title: "Retention is improving",
            body: `Recent mean ${s.recentMean}% vs baseline ${s.baselineMean}% (t=${s.tStat}).`,
          });
        }
      }

      const nothingNew =
        findings.metricShifts.length === 0 && findings.newOutliers.length === 0;
      if (nothingNew) {
        results.push({ org: org.name, skipped: true, synthesis });
        continue;
      }

      const ctx = await loadOrgContext(db, org.id);
      const analysis = await askClaudeJson<{
        insights: any[];
        recommendations: any[];
      }>([{
        role: "user",
        content:
          `<detected_changes>\n${JSON.stringify(findings)}\n</detected_changes>\n\n` +
          `<company_data>\n${contextToPrompt(ctx)}\n</company_data>`,
      }], { system: ANALYST_SYSTEM });

      for (const ins of analysis.insights ?? []) {
        await db.from("ai_insights").insert({
          organization_id: org.id,
          channel_id: ins.channelId ?? null,
          kind: ins.kind,
          title: ins.title,
          body: ins.body,
          confidence: ins.confidence,
          data: { findings },
        });
      }

      for (const rec of analysis.recommendations ?? []) {
        // Store the drafted SOP edit as a *pending* change on the recommendation.
        // It is NOT written to sop_versions here — a human approves it in-app
        // (approveRecommendation), which is what actually creates the new,
        // immutable version. This keeps humans in the loop for every SOP change.
        let proposedChange: Record<string, unknown> | null = null;
        if (rec.proposedVersion) {
          let sopTitle = rec.title;
          if (rec.sopId) {
            const { data: sopRow } = await db.from("sops")
              .select("title, category").eq("id", rec.sopId).single();
            if (sopRow?.title) sopTitle = sopRow.title;
            proposedChange = {
              sop_id: rec.sopId,
              sop_title: sopTitle,
              category: sopRow?.category ?? null,
              purpose: rec.proposedVersion.purpose,
              when_to_use: rec.proposedVersion.whenToUse,
              steps: rec.proposedVersion.steps,
              examples: rec.proposedVersion.examples,
              change_summary: rec.proposedVersion.changeSummary,
            };
          } else {
            proposedChange = {
              sop_title: sopTitle,
              purpose: rec.proposedVersion.purpose,
              when_to_use: rec.proposedVersion.whenToUse,
              steps: rec.proposedVersion.steps,
              examples: rec.proposedVersion.examples,
              change_summary: rec.proposedVersion.changeSummary,
            };
          }
        }
        await db.from("ai_recommendations").insert({
          organization_id: org.id,
          sop_id: rec.sopId ?? null,
          proposed_change: proposedChange,
          title: rec.title,
          rationale: rec.rationale,
        });
        await db.from("notifications").insert({
          organization_id: org.id,
          type: "ai_recommendation",
          title: `New recommendation: ${rec.title}`,
          body: rec.rationale.slice(0, 200),
        });
      }

      results.push({
        org: org.name,
        shifts: findings.metricShifts.length,
        outliers: findings.newOutliers.length,
        insights: analysis.insights?.length ?? 0,
        recommendations: analysis.recommendations?.length ?? 0,
        synthesis,
      });
    }

    return jsonResponse({ ok: true, results });
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: String(err) }, 500);
  }
});

// Fact-check collection: turns AI-flagged claims into tracked items.
// Sources: research packet unverifiedClaims, [FACT-CHECK: …] marks in the
// script, and the critique's factCheck list. Merging preserves the human's
// verify/waive decisions — re-running a step never resets resolved items.
// The edge function mirrors this logic server-side (content-studio).

import type { ContentProject, FactCheckItem } from "@/types";

export function extractScriptClaims(script: string | undefined): string[] {
  if (!script) return [];
  const out: string[] = [];
  const re = /\[FACT-CHECK:?\s*([^\]]+)\]/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(script))) {
    const claim = m[1].trim();
    if (claim) out.push(claim);
  }
  return out;
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

export function mergeFactChecks(
  existing: FactCheckItem[] | undefined,
  claims: string[],
  origin: FactCheckItem["origin"],
): FactCheckItem[] {
  const items = [...(existing ?? [])];
  const seen = new Set(items.map((i) => norm(i.claim)));
  for (const claim of claims) {
    const key = norm(claim);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    items.push({
      id: `fc_${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`,
      claim: claim.trim(),
      origin,
      status: "pending",
    });
  }
  return items;
}

export function pendingFactChecks(project: Pick<ContentProject, "factChecks">): number {
  return (project.factChecks ?? []).filter((f) => f.status === "pending").length;
}

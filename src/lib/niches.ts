// Niche grouping for the dashboard filter. Channels and competitors carry
// free-text niche strings; this maps them onto the company's three niches so
// the home screen can be scoped per niche or viewed all together. Keyword
// order matters: religion terms win over business terms ("Business / history
// hybrid" is business; "Ancient religion, mythology" is religion).

export type NicheKey = "business" | "religion" | "sales" | "other";

export const NICHE_LABELS: Record<NicheKey, string> = {
  business: "Business",
  religion: "Religion",
  sales: "Sales",
  other: "Other",
};

const RELIGION =
  /(religio|myth|christ|bible|biblical|church|theolog|esoteric|gnostic|scriptur|catholic|jewish|judais|islam|apolog|secular|faith|assyriolog)/;
const SALES = /(sales|negotiat|persuas|influence)/;
const BUSINESS =
  /(business|founder|startup|finance|financ|econom|ambition|wealth|entrepreneur|creator|logistic|crypto|invest)/;

export function nicheKeyOf(niche?: string): NicheKey {
  const n = (niche ?? "").toLowerCase();
  if (RELIGION.test(n)) return "religion";
  if (SALES.test(n)) return "sales";
  if (BUSINESS.test(n)) return "business";
  return "other";
}


/**
 * Competitor rows: classify by provenance first — every seeded competitor
 * belongs to a known CI cycle (cc_ci_ business; cc_cx_, cc_rfb, cc_eso
 * religion; cc_chris sales) — and fall back to niche keywords for rows the
 * user adds later. Keyword matching alone drops channels whose niche string
 * names no niche ("Internet culture", "Ancient history documentaries").
 */
export function nicheKeyOfCompetitor(c: { id: string; niche?: string }): NicheKey {
  if (c.id.startsWith("cc_ci_") || c.id === "cc_mag" || c.id === "cc_hoc") return "business";
  if (c.id.startsWith("cc_cx_") || c.id === "cc_rfb" || c.id === "cc_eso") return "religion";
  if (c.id === "cc_chris") return "sales";
  return nicheKeyOf(c.niche);
}

// Shared, persistent niche scope — one selection that follows the user
// across Dashboard, Competitors, Ideas, Videos, and SOPs.
import { useState } from "react";

export type NicheScope = NicheKey | "all";
const SCOPE_KEY = "big3.nicheScope";

export function useNicheScope(): [NicheScope, (n: NicheScope) => void] {
  const [scope, setScope] = useState<NicheScope>(() => {
    const saved = localStorage.getItem(SCOPE_KEY);
    return saved === "business" || saved === "religion" || saved === "sales" || saved === "other"
      ? saved
      : "all";
  });
  const pick = (n: NicheScope) => {
    setScope(n);
    localStorage.setItem(SCOPE_KEY, n);
  };
  return [scope, pick];
}

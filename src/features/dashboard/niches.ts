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

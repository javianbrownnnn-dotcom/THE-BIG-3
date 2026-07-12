// The niche scope selector — one chip row used on every list page so the
// whole app can be viewed per niche or all together.
import { Button } from "@/components/ui/button";
import { NICHE_LABELS, type NicheKey, type NicheScope } from "@/lib/niches";

export function NicheChips({
  scope,
  onPick,
  options,
}: {
  scope: NicheScope;
  onPick: (n: NicheScope) => void;
  options: NicheKey[];
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-1.5 md:mb-4" role="tablist" aria-label="Niche filter">
      <Button
        size="sm"
        variant={scope === "all" ? "default" : "outline"}
        className="h-7 rounded-full px-3 text-xs"
        onClick={() => onPick("all")}
      >
        All niches
      </Button>
      {options.map((k) => (
        <Button
          key={k}
          size="sm"
          variant={scope === k ? "default" : "outline"}
          className="h-7 rounded-full px-3 text-xs"
          onClick={() => onPick(k)}
        >
          {NICHE_LABELS[k]}
        </Button>
      ))}
    </div>
  );
}

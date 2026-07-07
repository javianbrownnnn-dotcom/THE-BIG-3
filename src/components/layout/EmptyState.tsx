import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * The "nothing here yet" moment, treated as a first-run invitation: a tinted
 * icon tile, a confident one-liner, and one obvious next step.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-xl border px-6 py-12 text-center md:py-16">
      {/* soft top glow so the card doesn't read as a flat void */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-primary/[0.07] to-transparent"
      />
      <div className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <h3 className="relative mt-4 text-base font-semibold tracking-tight">{title}</h3>
      <p className="relative mt-1.5 max-w-sm text-[13px] leading-relaxed text-muted-foreground md:text-sm">
        {description}
      </p>
      {action && <div className="relative mt-5">{action}</div>}
    </div>
  );
}

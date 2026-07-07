import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 md:mb-6">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2.5">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight md:text-xl">{title}</h1>
          {description && (
            <p className="mt-0.5 max-w-2xl text-[13px] leading-snug text-muted-foreground md:text-sm">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

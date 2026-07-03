// Shared tooltip body for all charts. Identity is carried by a colored chip
// next to the label; the text itself stays in ink tokens, never series color.

interface Entry {
  name?: string;
  value?: number | string;
  color?: string;
}

export function ChartTooltipContent({
  active,
  label,
  payload,
  formatter,
}: {
  active?: boolean;
  label?: string | number;
  payload?: Entry[];
  formatter?: (value: number | string) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
      {label != null && <div className="mb-1 font-medium text-foreground">{label}</div>}
      <div className="space-y-1">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center gap-2">
            <span
              className="h-2 w-2 shrink-0 rounded-[2px]"
              style={{ background: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}</span>
            <span className="ml-auto pl-3 font-medium tabular-nums text-foreground">
              {formatter && entry.value != null ? formatter(entry.value) : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

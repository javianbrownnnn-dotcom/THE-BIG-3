// The dashboard hero: one line chart answering "are the results moving?"
// Three metrics tell the funnel story — views (reach), CTR (packaging) and
// avg % viewed (retention). They live on wildly different scales, so each is
// indexed to its first month in the window (= 100); the legend and tooltip
// carry the real values. One axis, no dual scales.
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useChartTheme } from "@/components/charts/theme";
import { compactNumber, percent } from "@/lib/format";
import { monthlyResults, type MonthlyResults } from "./stats";
import type { Video } from "@/types";

const METRICS = [
  { key: "views", label: "Views", format: (v: number) => compactNumber(v) },
  { key: "ctr", label: "CTR", format: (v: number) => percent(v) },
  { key: "pct", label: "Avg % viewed", format: (v: number) => percent(v, 0) },
] as const;

type MetricKey = (typeof METRICS)[number]["key"];

interface HeroRow extends MonthlyResults {
  viewsIdx?: number;
  ctrIdx?: number;
  pctIdx?: number;
}

function indexSeries(rows: MonthlyResults[], key: MetricKey): number | undefined {
  const base = rows.find((r) => r[key] != null)?.[key];
  if (base == null || base === 0) return undefined;
  return base;
}

function ResultsTooltip({
  active,
  payload,
  label,
  series,
}: {
  active?: boolean;
  payload?: Array<{ payload: HeroRow }>;
  label?: string;
  series: Array<{ key: MetricKey; label: string; color: string; format: (v: number) => string }>;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-md border bg-popover p-2.5 text-xs shadow-md">
      <div className="mb-1 font-medium text-popover-foreground">{label}</div>
      <div className="space-y-1">
        {series.map((s) => {
          const raw = row[s.key];
          return (
            <div key={s.key} className="flex items-center gap-1.5 text-muted-foreground">
              <span className="h-2 w-2 rounded-[2px]" style={{ background: s.color }} />
              <span className="min-w-24">{s.label}</span>
              <span className="ml-auto font-medium tabular-nums text-popover-foreground">
                {raw != null ? s.format(raw) : "—"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ResultsTrend({ videos }: { videos: Video[] }) {
  const theme = useChartTheme();
  const rows = monthlyResults(videos);

  // Index each metric to its first available month; keep only metrics with
  // enough history to draw a line (2+ points). CTR simply doesn't render
  // until the owner connection supplies it — no fake zeros.
  const bases: Partial<Record<MetricKey, number>> = {};
  const series = METRICS.map((m, i) => ({ ...m, color: theme.series[i] })).filter((m) => {
    const points = rows.filter((r) => r[m.key] != null).length;
    const base = indexSeries(rows, m.key);
    if (points < 2 || base == null) return false;
    bases[m.key] = base;
    return true;
  });

  // Instead of vanishing, explain why there's nothing to plot yet — the card
  // stays put so the homepage layout is stable and the reason is visible.
  if (series.length === 0) {
    const anyViews = rows.some((r) => r.views != null);
    return (
      <Card className="mb-3 md:mb-4">
        <CardHeader className="pb-2">
          <CardTitle>Results — last 6 months</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex min-h-32 flex-col items-center justify-center gap-1 py-6 text-center">
            <p className="text-sm font-medium">Not enough history to chart yet</p>
            <p className="max-w-md text-xs text-muted-foreground">
              {anyViews
                ? "Publish across at least two months so there's a trend to draw. CTR and retention lines appear once a channel's YouTube owner connection has pulled private analytics (Channels → YouTube → Pull latest analytics)."
                : "Sync your channels (Channels → YouTube) so published videos and their metrics flow in. Two months of data draws the first trend."}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const data: HeroRow[] = rows.map((r) => {
    const out: HeroRow = { ...r };
    for (const m of series) {
      const raw = r[m.key];
      out[`${m.key}Idx` as const] = raw != null ? +((raw / bases[m.key]!) * 100).toFixed(1) : undefined;
    }
    return out;
  });

  const latestOf = (key: MetricKey) => [...rows].reverse().find((r) => r[key] != null)?.[key];

  return (
    <Card className="mb-3 md:mb-4">
      <CardHeader className="pb-2">
        <CardTitle>Results — last 6 months</CardTitle>
        <p className="text-xs text-muted-foreground">
          Reach (views), packaging (CTR) and retention on one scale: each line starts at
          100, so 120 means 20% above where the window began. Hover for real values.
        </p>
      </CardHeader>
      <CardContent>
        {/* Legend carries identity + the real current value, so the indexed
            axis never has to be decoded. */}
        <div className="mb-2 flex flex-wrap gap-x-5 gap-y-1">
          {series.map((s) => {
            const latest = latestOf(s.key);
            return (
              <div key={s.key} className="flex items-center gap-1.5 text-xs">
                <span className="h-2 w-2 rounded-[2px]" style={{ background: s.color }} />
                <span className="text-muted-foreground">{s.label}</span>
                {latest != null && (
                  <span className="font-medium tabular-nums">{s.format(latest)}</span>
                )}
              </div>
            );
          })}
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -4 }}>
            <CartesianGrid stroke={theme.grid} strokeWidth={1} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: theme.tick, fontSize: 11 }}
              axisLine={{ stroke: theme.axis }}
              tickLine={false}
              minTickGap={24}
            />
            <YAxis
              tick={{ fill: theme.tick, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={40}
              domain={["auto", "auto"]}
            />
            <ReferenceLine y={100} stroke={theme.axis} strokeDasharray="4 4" />
            <Tooltip
              cursor={{ stroke: theme.axis, strokeDasharray: "3 3" }}
              content={<ResultsTooltip series={series} />}
            />
            {series.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={`${s.key}Idx`}
                name={s.label}
                stroke={s.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: theme.surface }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

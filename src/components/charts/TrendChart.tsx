import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useChartTheme } from "./theme";
import { ChartTooltipContent } from "./ChartTooltip";

export interface TrendSeries {
  key: string;
  label: string;
}

/**
 * Change-over-time line chart. 2px lines, hairline grid, muted ticks,
 * crosshair + tooltip on hover. With 2+ series a legend row renders above
 * the plot (a single series is named by the card title, so no legend).
 */
export function TrendChart({
  data,
  series,
  height = 220,
  formatter,
  yDomain,
}: {
  data: Array<Record<string, string | number | undefined>>;
  series: TrendSeries[];
  height?: number;
  formatter?: (value: number | string) => string;
  yDomain?: [number | "auto" | "dataMin", number | "auto" | "dataMax"];
}) {
  const theme = useChartTheme();

  return (
    <div>
      {series.length > 1 && (
        <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1">
          {series.map((s, i) => (
            <div key={s.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span
                className="h-2 w-2 rounded-[2px]"
                style={{ background: theme.series[i % theme.series.length] }}
              />
              {s.label}
            </div>
          ))}
        </div>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -12 }}>
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
            width={48}
            domain={yDomain ?? ["auto", "auto"]}
            tickFormatter={(v) => (formatter ? formatter(v) : String(v))}
          />
          <Tooltip
            cursor={{ stroke: theme.axis, strokeDasharray: "3 3" }}
            content={<ChartTooltipContent formatter={formatter} />}
          />
          {series.map((s, i) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={theme.series[i % theme.series.length]}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: theme.surface }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

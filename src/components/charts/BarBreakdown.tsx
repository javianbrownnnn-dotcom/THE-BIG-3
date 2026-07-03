import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useChartTheme } from "./theme";
import { ChartTooltipContent } from "./ChartTooltip";

/**
 * Horizontal magnitude comparison for one measure across categories.
 * Single-hue bars (magnitude, not identity), thin marks with rounded
 * data-ends, per-mark hover tooltip.
 */
export function BarBreakdown({
  data,
  height = 200,
  formatter,
  valueLabel = "Value",
}: {
  data: Array<{ label: string; value: number }>;
  height?: number;
  formatter?: (value: number | string) => string;
  valueLabel?: string;
}) {
  const theme = useChartTheme();

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 16, bottom: 0, left: 8 }}
        barCategoryGap="28%"
      >
        <CartesianGrid stroke={theme.grid} strokeWidth={1} horizontal={false} />
        <XAxis
          type="number"
          tick={{ fill: theme.tick, fontSize: 11 }}
          axisLine={{ stroke: theme.axis }}
          tickLine={false}
          tickFormatter={(v) => (formatter ? formatter(v) : String(v))}
        />
        <YAxis
          type="category"
          dataKey="label"
          tick={{ fill: theme.tick, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={130}
        />
        <Tooltip
          cursor={{ fill: "transparent" }}
          content={<ChartTooltipContent formatter={formatter} />}
        />
        <Bar dataKey="value" name={valueLabel} radius={[0, 4, 4, 0]} maxBarSize={18}>
          {data.map((_, i) => (
            <Cell key={i} fill={theme.series[0]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

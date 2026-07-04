import { ArrowDownRight, ArrowUpRight, Info } from "lucide-react";
import { Line, LineChart, ResponsiveContainer } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useChartTheme } from "./theme";

/**
 * Stat tile: one headline number with an optional delta and sparkline.
 * The value wears ink, never a series color; the delta carries direction
 * with both an arrow and color (never color alone).
 */
export function MetricCard({
  label,
  value,
  delta,
  deltaLabel = "vs prior period",
  goodWhenUp = true,
  spark,
  hint,
  className,
}: {
  label: string;
  value: string;
  delta?: number; // percent change
  deltaLabel?: string;
  goodWhenUp?: boolean;
  spark?: number[];
  /** "What does good look like?" — benchmark context shown behind an info icon. */
  hint?: string;
  className?: string;
}) {
  const theme = useChartTheme();
  const isUp = (delta ?? 0) >= 0;
  const isGood = goodWhenUp ? isUp : !isUp;
  const sparkData = spark?.map((y, i) => ({ i, y }));

  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <CardContent className="p-5">
        <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
          {hint && (
            <Tooltip>
              <TooltipTrigger aria-label={`What's a good ${label}?`}>
                <Info className="h-3.5 w-3.5" />
              </TooltipTrigger>
              <TooltipContent className="max-w-64 normal-case tracking-normal">
                {hint}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <div className="mt-2 flex items-end justify-between gap-3">
          <div className="text-2xl font-semibold leading-none tracking-tight">{value}</div>
          {sparkData && sparkData.length > 1 && (
            <div className="h-9 w-24 shrink-0" aria-hidden>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparkData} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
                  <Line
                    type="monotone"
                    dataKey="y"
                    stroke={theme.series[0]}
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        {delta != null && (
          <div className="mt-2 flex items-center gap-1 text-xs">
            <span
              className="flex items-center gap-0.5 font-medium"
              style={{ color: isGood ? theme.deltaUp : theme.deltaDown }}
            >
              {isUp ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
              {Math.abs(delta).toFixed(1)}%
            </span>
            <span className="text-muted-foreground">{deltaLabel}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

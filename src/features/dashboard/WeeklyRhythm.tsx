import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Circle, Repeat } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// The learning loop as a literal weekly checklist. Progress is stored per
// ISO week and resets automatically when a new week starts.

const STEPS: Array<{ label: string; to: string; detail: string }> = [
  { label: "Sync fresh metrics", to: "/channels", detail: "Channel → Sync YouTube" },
  { label: "Run the learning loop", to: "/coach", detail: "AI Coach → Run learning loop" },
  { label: "Review recommendations", to: "/coach", detail: "Accept, test, or reject each" },
  { label: "Review competitor outliers", to: "/competitors", detail: "Write why each one worked" },
  { label: "Plan next uploads", to: "/ideas", detail: "Approved ideas → production" },
  { label: "Update SOPs from results", to: "/sops", detail: "Validated wins become new versions" },
];

function isoWeekKey(): string {
  const d = new Date();
  const thursday = new Date(d);
  thursday.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const firstWeek = new Date(thursday.getFullYear(), 0, 4);
  const week =
    1 +
    Math.round(
      ((thursday.getTime() - firstWeek.getTime()) / 86_400_000 -
        3 +
        ((firstWeek.getDay() + 6) % 7)) /
        7,
    );
  return `big3.rhythm.${thursday.getFullYear()}-w${week}`;
}

function readDone(key: string): number[] {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "[]");
  } catch {
    return [];
  }
}

export function WeeklyRhythm() {
  const key = isoWeekKey();
  const [done, setDone] = useState<number[]>(() => readDone(key));

  const toggle = (index: number) => {
    const next = done.includes(index)
      ? done.filter((i) => i !== index)
      : [...done, index];
    setDone(next);
    localStorage.setItem(key, JSON.stringify(next));
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Repeat className="h-4 w-4 text-muted-foreground" /> This week's rhythm
        </CardTitle>
        <Badge variant={done.length === STEPS.length ? "success" : "secondary"}>
          {done.length}/{STEPS.length}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-1">
        {STEPS.map((step, i) => {
          const checked = done.includes(i);
          return (
            <div key={i} className="flex items-center gap-2.5 rounded-md px-1 py-1.5">
              <button
                onClick={() => toggle(i)}
                aria-label={checked ? `Mark "${step.label}" not done` : `Mark "${step.label}" done`}
                className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
              >
                {checked ? (
                  <CheckCircle2 className="h-4.5 w-4.5 h-[18px] w-[18px] text-success" />
                ) : (
                  <Circle className="h-[18px] w-[18px]" />
                )}
              </button>
              <Link
                to={step.to}
                className={cn(
                  "min-w-0 flex-1 text-sm underline-offset-2 hover:underline",
                  checked && "text-muted-foreground line-through",
                )}
              >
                {step.label}
              </Link>
              <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
                {step.detail}
              </span>
            </div>
          );
        })}
        <p className="pt-2 text-xs text-muted-foreground">
          One hour a week. This checklist resets every Monday — the loop only works if it
          repeats.
        </p>
      </CardContent>
    </Card>
  );
}

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Bot, Download, FileText, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { Markdown } from "@/components/Markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useChannels, useGenerateReport, useReports } from "@/hooks/queries";
import { shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Report, ReportType } from "@/types";

const TYPES: ReportType[] = ["weekly", "monthly", "quarterly", "channel", "cross_channel", "competitor"];

function downloadMarkdown(report: Report) {
  const blob = new Blob([report.contentMd], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${report.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ReportsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: reports, isLoading } = useReports();
  const { data: channels } = useChannels();
  const generate = useGenerateReport();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ type: "monthly" as ReportType, channelId: "" });

  const selected = useMemo(
    () => (reports ?? []).find((r) => r.id === id) ?? (reports ?? [])[0],
    [reports, id],
  );

  // Keep the URL in sync with the selected report so reports are linkable.
  useEffect(() => {
    if (!id && selected) navigate(`/reports/${selected.id}`, { replace: true });
  }, [id, selected, navigate]);

  const submit = async () => {
    const end = new Date();
    const start = new Date();
    if (form.type === "weekly") start.setDate(end.getDate() - 7);
    else if (form.type === "quarterly") start.setMonth(end.getMonth() - 3);
    else start.setMonth(end.getMonth() - 1);

    const promise = generate.mutateAsync({
      type: form.type,
      channelId: form.channelId || undefined,
      periodStart: start.toISOString().slice(0, 10),
      periodEnd: end.toISOString().slice(0, 10),
    });
    toast.promise(promise, {
      loading: "Generating report from your data…",
      success: "Report ready",
      error: "Report generation failed",
    });
    const report = await promise;
    setDialogOpen(false);
    navigate(`/reports/${report.id}`);
  };

  if (isLoading) return <Skeleton className="h-96" />;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Reports"
        description="AI-written from real data on a schedule, or on demand. Every report exports as markdown."
        actions={
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Sparkles /> Generate report
          </Button>
        }
      />

      {(reports ?? []).length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No reports yet"
          description="Generate your first report, or let the scheduled loop write the weekly one."
          action={
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Sparkles /> Generate report
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <div className="space-y-2">
            {(reports ?? []).map((r) => (
              <button
                key={r.id}
                onClick={() => navigate(`/reports/${r.id}`)}
                className={cn(
                  "w-full rounded-md border p-3 text-left transition-colors hover:bg-accent/50",
                  selected?.id === r.id && "border-primary/50 bg-accent/60",
                )}
              >
                <div className="line-clamp-2 text-sm font-medium">{r.title}</div>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary">{r.type.replace(/_/g, " ")}</Badge>
                  {shortDate(r.createdAt)}
                </div>
              </button>
            ))}
          </div>

          {selected && (
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="flex items-center gap-2">
                  {selected.source === "ai" && <Bot className="h-4 w-4 text-muted-foreground" />}
                  {selected.periodStart} → {selected.periodEnd}
                </CardTitle>
                <Button variant="outline" size="sm" onClick={() => downloadMarkdown(selected)}>
                  <Download /> Export .md
                </Button>
              </CardHeader>
              <CardContent>
                <Markdown content={selected.contentMd} />
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generate a report</DialogTitle>
            <DialogDescription>
              Written by the AI from your videos, competitors, SOPs, and experiments.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Type</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm({ ...form, type: v as ReportType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Channel scope</Label>
              <Select
                value={form.channelId || "__all__"}
                onValueChange={(v) => setForm({ ...form, channelId: v === "__all__" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All channels</SelectItem>
                  {(channels ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={generate.isPending}>
              {generate.isPending ? "Generating…" : "Generate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Bot, Plus, User } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
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
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAddSopVersion, useCompetitorVideos, useSop, useVideos } from "@/hooks/queries";
import { useRecordRecent } from "@/hooks/useRecents";
import { relativeTime, shortDate } from "@/lib/format";
import type { SopVersion } from "@/types";

function VersionBody({ version }: { version: SopVersion }) {
  return (
    <div className="space-y-5">
      <section>
        <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Purpose
        </h4>
        <p className="text-sm">{version.purpose}</p>
      </section>
      {version.whenToUse && (
        <section>
          <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            When to use
          </h4>
          <p className="text-sm">{version.whenToUse}</p>
        </section>
      )}
      <section>
        <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Steps
        </h4>
        <ol className="space-y-2">
          {version.steps.map((step, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium tabular-nums">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </section>
      {version.examples && (
        <section>
          <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Examples
          </h4>
          <p className="rounded-md border bg-muted/40 p-3 text-sm italic">{version.examples}</p>
        </section>
      )}
    </div>
  );
}

export function SopDetailPage() {
  const { id = "" } = useParams();
  const { data: sop, isLoading } = useSop(id);
  const { data: videos } = useVideos();
  const { data: competitorVideos } = useCompetitorVideos();
  const addVersion = useAddSopVersion();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ purpose: "", whenToUse: "", steps: "", examples: "", changeSummary: "" });
  useRecordRecent(sop ? { to: `/sops/${sop.id}`, label: sop.title, kind: "sop" } : null);

  if (isLoading) return <Skeleton className="h-96" />;
  if (!sop) return <div className="py-20 text-center text-muted-foreground">SOP not found.</div>;

  const current = sop.versions[0];
  const linkedVideos = (videos ?? []).filter((v) => sop.linkedVideoIds.includes(v.id));
  const linkedComp = (competitorVideos ?? []).filter((c) =>
    sop.linkedCompetitorVideoIds.includes(c.id),
  );

  const openNewVersion = () => {
    setForm({
      purpose: current?.purpose ?? "",
      whenToUse: current?.whenToUse ?? "",
      steps: (current?.steps ?? []).join("\n"),
      examples: current?.examples ?? "",
      changeSummary: "",
    });
    setDialogOpen(true);
  };

  const submit = async () => {
    if (!form.changeSummary) {
      toast.error("Say what changed and why — future-you will thank you");
      return;
    }
    try {
      await addVersion.mutateAsync({
        sopId: sop.id,
        input: {
          purpose: form.purpose,
          whenToUse: form.whenToUse || undefined,
          steps: form.steps.split("\n").map((s) => s.trim()).filter(Boolean),
          examples: form.examples || undefined,
          changeSummary: form.changeSummary,
        },
      });
      toast.success(`Version ${(current?.versionNumber ?? 0) + 1} saved — history preserved`);
      setDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="animate-fade-in">
      <Button variant="ghost" size="sm" className="mb-3 -ml-2" asChild>
        <Link to="/sops">
          <ArrowLeft /> SOPs
        </Link>
      </Button>
      <PageHeader
        title={sop.title}
        description={`${sop.category ?? "uncategorized"} · ${sop.versions.length} version${sop.versions.length === 1 ? "" : "s"} · next review ${sop.nextReviewAt ? shortDate(sop.nextReviewAt) : "unscheduled"}`}
        actions={
          <Button size="sm" onClick={openNewVersion}>
            <Plus /> New version
          </Button>
        }
      />

      <Tabs defaultValue="current">
        <TabsList>
          <TabsTrigger value="current">
            Current — v{current?.versionNumber ?? 1}
          </TabsTrigger>
          <TabsTrigger value="history">Version history ({sop.versions.length})</TabsTrigger>
          <TabsTrigger value="links">
            Linked ({linkedVideos.length + linkedComp.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="current">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Version {current?.versionNumber}</CardTitle>
              {current && (
                <Badge variant={current.source === "ai" ? "default" : "secondary"} className="gap-1">
                  {current.source === "ai" ? <Bot className="h-3 w-3" /> : <User className="h-3 w-3" />}
                  {current.source === "ai" ? "AI-authored" : "Human-authored"}
                </Badge>
              )}
            </CardHeader>
            <CardContent>{current && <VersionBody version={current} />}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <div className="space-y-4">
            {sop.versions.map((v, idx) => (
              <Card key={v.id}>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <CardTitle className="flex items-center gap-2">
                    Version {v.versionNumber}
                    {idx === 0 && <Badge variant="success">current</Badge>}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant={v.source === "ai" ? "default" : "secondary"} className="gap-1">
                      {v.source === "ai" ? <Bot className="h-3 w-3" /> : <User className="h-3 w-3" />}
                      {v.source}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {relativeTime(v.createdAt)}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  {v.changeSummary && (
                    <>
                      <div className="rounded-md border-l-2 border-primary bg-primary/5 px-3 py-2 text-sm">
                        <span className="font-medium">What changed: </span>
                        {v.changeSummary}
                      </div>
                      <Separator className="my-4" />
                    </>
                  )}
                  <VersionBody version={v} />
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="links">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Linked videos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {linkedVideos.map((v) => (
                  <Link
                    key={v.id}
                    to={`/videos/${v.id}`}
                    className="block truncate text-sm underline-offset-2 hover:underline"
                  >
                    {v.title}
                  </Link>
                ))}
                {linkedVideos.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No linked videos. Links let the loop measure whether this SOP works.
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Linked competitor evidence</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {linkedComp.map((c) => (
                  <div key={c.id} className="text-sm">
                    <span className="font-medium">{c.title}</span>
                    <span className="text-muted-foreground"> — {c.competitorChannelName}</span>
                  </div>
                ))}
                {linkedComp.length === 0 && (
                  <p className="text-sm text-muted-foreground">No competitor references yet.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>New version of “{sop.title}”</DialogTitle>
            <DialogDescription>
              v{(current?.versionNumber ?? 0) + 1} — the previous version stays in history forever.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">What changed and why (required)</Label>
              <Textarea
                value={form.changeSummary}
                onChange={(e) => setForm({ ...form, changeSummary: e.target.value })}
                placeholder="e.g. Made cold opens the default — 1.35x baseline CTR across 14 videos."
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Purpose</Label>
              <Textarea
                value={form.purpose}
                onChange={(e) => setForm({ ...form, purpose: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">When to use</Label>
              <Textarea
                value={form.whenToUse}
                onChange={(e) => setForm({ ...form, whenToUse: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Steps (one per line)</Label>
              <Textarea
                rows={6}
                value={form.steps}
                onChange={(e) => setForm({ ...form, steps: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Examples</Label>
              <Textarea
                value={form.examples}
                onChange={(e) => setForm({ ...form, examples: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={addVersion.isPending}>
              Save v{(current?.versionNumber ?? 0) + 1}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

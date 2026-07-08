import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Bot, Clock, ListChecks, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { STARTER_PLAYBOOK } from "./starterPlaybook";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useCreateSop, useSops } from "@/hooks/queries";
import { relativeTime } from "@/lib/format";

export function SopsPage() {
  const { data: sops, isLoading } = useSops();
  const createSop = useCreateSop();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [form, setForm] = useState({ title: "", category: "", purpose: "", steps: "" });

  const existingTitles = new Set((sops ?? []).map((s) => s.title.toLowerCase()));
  const missingStarters = STARTER_PLAYBOOK.filter(
    (s) => !existingTitles.has(s.title.toLowerCase()),
  );

  const installPlaybook = async () => {
    setInstalling(true);
    try {
      for (const sop of missingStarters) {
        await createSop.mutateAsync(sop);
      }
      toast.success(
        `Starter Playbook installed — ${missingStarters.length} SOPs added. Make them yours: the loop rewrites them as your data comes in.`,
      );
    } catch (err) {
      toast.error(`Install failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setInstalling(false);
    }
  };

  const submit = async () => {
    if (!form.title || !form.purpose) {
      toast.error("Title and purpose are required");
      return;
    }
    try {
      await createSop.mutateAsync({
        title: form.title,
        category: form.category || undefined,
        purpose: form.purpose,
        steps: form.steps.split("\n").map((s) => s.trim()).filter(Boolean),
      });
      toast.success("SOP created — version 1 saved");
      setForm({ title: "", category: "", purpose: "", steps: "" });
      setDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  if (isLoading) return <Skeleton className="h-96" />;

  const now = Date.now();

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="SOPs"
        description="The heart of the platform: how you work, versioned forever, improved by data."
        actions={
          <>
            {missingStarters.length > 0 && (
              <Button variant="outline" size="sm" onClick={installPlaybook} disabled={installing}>
                <Sparkles />
                {installing
                  ? "Installing…"
                  : `Install Starter Playbook (${missingStarters.length})`}
              </Button>
            )}
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus /> New SOP
            </Button>
          </>
        }
      />

      {missingStarters.length > 0 && (
        <Card className="mb-4 border-primary/30 bg-primary/5">
          <CardContent className="flex flex-wrap items-center gap-3 p-4 text-sm">
            <Sparkles className="h-4 w-4 shrink-0 text-primary" />
            <span className="min-w-0 flex-1">
              <span className="font-medium">New to YouTube systems?</span> The Starter Playbook
              installs {missingStarters.length} proven procedures — a weekly rhythm, topic
              validation, packaging, hooks, retention — written for a team starting from
              marketing experience. Your data rewrites them over time.
            </span>
            <Button size="sm" onClick={installPlaybook} disabled={installing}>
              {installing ? "Installing…" : "Install"}
            </Button>
          </CardContent>
        </Card>
      )}

      {(sops ?? []).length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="No SOPs yet"
          description="Write down how you make videos today. The learning loop will propose improvements as data accumulates."
          action={
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus /> New SOP
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {(sops ?? []).map((sop) => {
            const overdue = sop.nextReviewAt && new Date(sop.nextReviewAt).getTime() < now;
            const aiAuthored = sop.currentVersion?.source === "ai";
            return (
              <Link key={sop.id} to={`/sops/${sop.id}`} className="group">
                <Card className="h-full transition-colors group-hover:border-primary/40">
                  <CardHeader className="flex-row items-start justify-between space-y-0">
                    <div>
                      <CardTitle className="text-base">{sop.title}</CardTitle>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {sop.category && <Badge variant="secondary">{sop.category}</Badge>}
                        <Badge variant={sop.status === "active" ? "success" : "outline"}>
                          {sop.status}
                        </Badge>
                        {sop.currentVersion && (
                          <Badge variant="outline">v{sop.currentVersion.versionNumber}</Badge>
                        )}
                        {aiAuthored && (
                          <Badge className="gap-1">
                            <Bot className="h-3 w-3" /> AI-authored
                          </Badge>
                        )}
                        {overdue && (
                          <Badge variant="warning" className="gap-1">
                            <Clock className="h-3 w-3" /> review due
                          </Badge>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </CardHeader>
                  <CardContent>
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {sop.currentVersion?.purpose}
                    </p>
                    <div className="mt-3 flex items-center gap-3 border-t pt-3 text-xs text-muted-foreground">
                      <span>{sop.linkedVideoIds.length} linked videos</span>
                      <span>·</span>
                      <span>{sop.linkedCompetitorVideoIds.length} competitor refs</span>
                      {sop.currentVersion && (
                        <span className="ml-auto">
                          updated {relativeTime(sop.currentVersion.createdAt)}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New SOP</DialogTitle>
            <DialogDescription>
              This becomes version 1. Every future change is a new version — nothing is ever
              overwritten.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Title</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Hook Writing"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Category</Label>
                <Input
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="hooks, thumbnails, editing…"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Purpose</Label>
              <Textarea
                value={form.purpose}
                onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                placeholder="What outcome does this procedure protect?"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Steps (one per line)</Label>
              <Textarea
                rows={5}
                value={form.steps}
                onChange={(e) => setForm({ ...form, steps: e.target.value })}
                placeholder={"Draft 5 hook options\nOpen on a concrete scene\n…"}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={createSop.isPending}>
              Create v1
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

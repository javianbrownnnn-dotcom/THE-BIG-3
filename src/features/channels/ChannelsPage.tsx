import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Plus, Tv } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useChannels, useCreateChannel, useVideos } from "@/hooks/queries";
import { percent } from "@/lib/format";
import { THIRTY_DAYS, windowStats } from "@/features/dashboard/stats";

export function ChannelsPage() {
  const { data: channels, isLoading } = useChannels();
  const { data: videos } = useVideos();
  const createChannel = useCreateChannel();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", youtube: "", niche: "", uploadCadence: "" });

  const submit = async () => {
    if (!form.name.trim()) {
      toast.error("The channel needs a name");
      return;
    }
    try {
      await createChannel.mutateAsync({
        name: form.name.trim(),
        niche: form.niche.trim() || undefined,
        uploadCadence: form.uploadCadence.trim() || undefined,
        youtubeChannelId: form.youtube.trim() || undefined,
      });
      toast.success(
        `${form.name} added — every dashboard, chart, and the AI now include it. Open it and hit "Sync YouTube" to pull its videos.`,
      );
      setForm({ name: "", youtube: "", niche: "", uploadCadence: "" });
      setDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-52" />
        ))}
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Channels"
        description="One brand per channel. Each carries its own goals, KPIs, and performance history — add one and everything adapts to it."
        actions={
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus /> Add channel
          </Button>
        }
      />

      {(channels ?? []).length === 0 ? (
        <EmptyState
          icon={Tv}
          title="No channels yet"
          description="Add your first channel — then sync it from YouTube and every dashboard lights up."
          action={
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus /> Add channel
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(channels ?? []).map((ch) => {
            const chVideos = (videos ?? []).filter((v) => v.channelId === ch.id);
            const now = Date.now();
            const stats = windowStats(chVideos, now - THIRTY_DAYS, now);
            const ctrGoal = ch.goals.find((g) => g.metric === "ctr");
            return (
              <Link key={ch.id} to={`/channels/${ch.id}`} className="group">
                <Card className="h-full transition-colors group-hover:border-primary/40">
                  <CardHeader className="flex-row items-start justify-between space-y-0">
                    <div>
                      <CardTitle className="text-base">{ch.name}</CardTitle>
                      <div className="mt-1 text-xs text-muted-foreground">{ch.brand}</div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="line-clamp-2 text-sm text-muted-foreground">{ch.description}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {ch.niche && <Badge variant="secondary">{ch.niche.split(",")[0]}</Badge>}
                      {ch.uploadCadence && <Badge variant="outline">{ch.uploadCadence}</Badge>}
                      {!ch.youtubeChannelId && (
                        <Badge variant="warning">YouTube not connected</Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2 border-t pt-3 text-center">
                      <div>
                        <div className="text-sm font-semibold tabular-nums">{stats.published}</div>
                        <div className="text-[11px] text-muted-foreground">videos / 30d</div>
                      </div>
                      <div>
                        <div className="text-sm font-semibold tabular-nums">
                          {percent(stats.avgCtr)}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          CTR{ctrGoal ? ` · goal ${ctrGoal.targetValue}%` : ""}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-semibold tabular-nums">
                          {percent(stats.avgPercentViewed)}
                        </div>
                        <div className="text-[11px] text-muted-foreground">viewed</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 border-t pt-3">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-[10px]">
                          {ch.ownerName?.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-muted-foreground">
                        Owned by {ch.ownerName}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add a channel</DialogTitle>
            <DialogDescription>
              Every chart, filter, and AI analysis picks it up automatically. Link its YouTube
              channel now or later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Sales Psychology"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>YouTube channel (optional)</Label>
              <Input
                value={form.youtube}
                onChange={(e) => setForm({ ...form, youtube: e.target.value })}
                placeholder="@handle or channel URL"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Niche</Label>
                <Input
                  value={form.niche}
                  onChange={(e) => setForm({ ...form, niche: e.target.value })}
                  placeholder="Sales psychology"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Upload cadence</Label>
                <Input
                  value={form.uploadCadence}
                  onChange={(e) => setForm({ ...form, uploadCadence: e.target.value })}
                  placeholder="1 long-form / week"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={createChannel.isPending}>
              {createChannel.isPending ? "Adding…" : "Add channel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

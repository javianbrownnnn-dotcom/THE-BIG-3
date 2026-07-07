import { useMemo, useState, type ReactNode } from "react";
import { Flame, Plus, Radar, Swords, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  useCompetitorChannels,
  useCompetitorVideos,
  useCreateCompetitorChannel,
  useCreateCompetitorVideo,
  useDeleteCompetitorChannel,
  useScanCompetitorChannel,
} from "@/hooks/queries";
import { getStoredApiKey } from "@/lib/youtube";
import { CompetitorTeardownDialog } from "./CompetitorTeardownDialog";
import { compactNumber, humanize, relativeTime, shortDate } from "@/lib/format";
import type { CompetitorChannel } from "@/types";

export function CompetitorsPage() {
  const [onlyOutliers, setOnlyOutliers] = useState(false);
  const [channelFilter, setChannelFilter] = useState<string | null>(null);
  const { data: videos, isLoading } = useCompetitorVideos(onlyOutliers);
  const { data: compChannels } = useCompetitorChannels();
  const createVideo = useCreateCompetitorVideo();
  const createChannel = useCreateCompetitorChannel();
  const scan = useScanCompetitorChannel();
  const deleteCompetitor = useDeleteCompetitorChannel();

  const removeCompetitor = (c: CompetitorChannel) => {
    if (!window.confirm(`Stop tracking "${c.name}"? Its tracked videos are removed too.`)) return;
    deleteCompetitor.mutate(c.id, {
      onSuccess: () => {
        if (channelFilter === c.id) setChannelFilter(null);
        toast.success(`Stopped tracking ${c.name}`);
      },
    });
  };
  const [scanningId, setScanningId] = useState<string | null>(null);

  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [channelDialogOpen, setChannelDialogOpen] = useState(false);
  const [channelForm, setChannelForm] = useState({ name: "", url: "", niche: "" });
  const [form, setForm] = useState({
    competitorChannelId: "",
    title: "",
    url: "",
    topic: "",
    hook: "",
    whyItWorked: "",
    views: "",
    viewsPerDay: "",
  });

  const filteredVideos = useMemo(
    () => (videos ?? []).filter((v) => !channelFilter || v.competitorChannelId === channelFilter),
    [videos, channelFilter],
  );
  const outlierCount = useMemo(
    () => filteredVideos.filter((v) => v.isOutlier).length,
    [filteredVideos],
  );

  const addChannel = async () => {
    if (!channelForm.name.trim()) {
      toast.error("Give the channel a name");
      return;
    }
    const created = await createChannel.mutateAsync({
      name: channelForm.name.trim(),
      url: channelForm.url.trim() || undefined,
      niche: channelForm.niche.trim() || undefined,
    });
    setChannelDialogOpen(false);
    setChannelForm({ name: "", url: "", niche: "" });
    toast.success(`Tracking ${created.name}`, {
      action: { label: "Scan now", onClick: () => runScan(created) },
    });
  };

  const runScan = async (channel: CompetitorChannel) => {
    setScanningId(channel.id);
    try {
      const res = await scan.mutateAsync(channel);
      setChannelFilter(channel.id);
      toast.success(
        `Scanned ${res.channelName}: +${res.created} video${res.created === 1 ? "" : "s"}, ` +
          `${res.outliers} outlier${res.outliers === 1 ? "" : "s"} flagged` +
          (res.simulated ? " (simulated — add a YouTube API key in Channels to pull real data)" : ""),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setScanningId(null);
    }
  };

  const submitVideo = async () => {
    if (!form.competitorChannelId || !form.title) {
      toast.error("Channel and title are required");
      return;
    }
    await createVideo.mutateAsync({
      competitorChannelId: form.competitorChannelId,
      title: form.title,
      url: form.url || undefined,
      topic: form.topic || undefined,
      hook: form.hook || undefined,
      whyItWorked: form.whyItWorked || undefined,
      views: form.views ? +form.views : undefined,
      viewsPerDay: form.viewsPerDay ? +form.viewsPerDay : undefined,
    });
    toast.success("Competitor video tracked");
    setVideoDialogOpen(false);
  };

  if (isLoading) return <Skeleton className="h-96" />;

  const hasKey = !!getStoredApiKey();

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Competitors"
        description="Track whole channels in your niche, not just single videos. A scan pulls a channel's recent uploads and flags outliers (views/day z-score vs its own baseline)."
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setVideoDialogOpen(true)}>
              <Plus /> Track video
            </Button>
            <Button size="sm" onClick={() => setChannelDialogOpen(true)}>
              <Plus /> Add channel
            </Button>
          </div>
        }
      />

      {!hasKey && (
        <p className="mb-4 text-xs text-muted-foreground">
          No YouTube API key connected — scans are simulated. Add a key on the Channels page to
          pull real uploads and stats.
        </p>
      )}

      {/* Channel cards — the niche at a glance. */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(compChannels ?? []).map((c) => {
          const active = channelFilter === c.id;
          return (
            <Card
              key={c.id}
              role="button"
              onClick={() => setChannelFilter(active ? null : c.id)}
              className={`cursor-pointer transition-colors ${active ? "border-primary" : "hover:border-muted-foreground/40"}`}
            >
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{c.name}</p>
                    {c.niche && (
                      <p className="truncate text-xs text-muted-foreground">{c.niche}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={scanningId === c.id || scan.isPending}
                      onClick={(e) => {
                        e.stopPropagation();
                        runScan(c);
                      }}
                    >
                      <Radar className={scanningId === c.id ? "animate-pulse" : ""} />
                      {scanningId === c.id ? "Scanning…" : "Scan"}
                    </Button>
                    <button
                      className="p-1 text-muted-foreground transition-colors hover:text-destructive"
                      aria-label={`Stop tracking ${c.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeCompetitor(c);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  {c.subscriberCount != null && (
                    <Stat icon={<Users className="h-3 w-3" />} label="subs" value={compactNumber(c.subscriberCount)} />
                  )}
                  <Stat label="videos tracked" value={String(c.trackedVideoCount ?? 0)} />
                  <Stat
                    icon={<Flame className="h-3 w-3 text-warning" />}
                    label="outliers"
                    value={String(c.outlierCount ?? 0)}
                  />
                  {c.medianViewsPerDay != null && c.medianViewsPerDay > 0 && (
                    <Stat label="median views/day" value={compactNumber(c.medianViewsPerDay)} />
                  )}
                  {c.uploadCadenceDays != null && (
                    <Stat label="uploads every" value={`${c.uploadCadenceDays}d`} />
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {c.lastScannedAt ? `Scanned ${relativeTime(c.lastScannedAt)}` : "Not scanned yet"}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Switch id="outliers" checked={onlyOutliers} onCheckedChange={setOnlyOutliers} />
          <Label htmlFor="outliers" className="cursor-pointer text-sm">
            Outliers only
          </Label>
        </div>
        <Badge variant="warning" className="gap-1">
          <Flame className="h-3 w-3" /> {outlierCount} outlier{outlierCount === 1 ? "" : "s"}
        </Badge>
        {channelFilter && (
          <Badge variant="secondary" className="gap-1">
            {compChannels?.find((c) => c.id === channelFilter)?.name}
            <button className="ml-1" onClick={() => setChannelFilter(null)} aria-label="Clear filter">
              ✕
            </button>
          </Badge>
        )}
        <span className="ml-auto text-sm text-muted-foreground">
          Tracking {compChannels?.length ?? 0} channels
        </span>
      </div>

      {filteredVideos.length === 0 ? (
        <EmptyState
          icon={Swords}
          title="Track the channels you compete with"
          description="Add a channel and scan it — we flag the uploads that broke out beyond its normal range. Those outliers are proven demand you can learn from."
          action={
            <Button size="sm" onClick={() => setChannelDialogOpen(true)}>
              <Plus /> Add channel
            </Button>
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Video</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead>Hook</TableHead>
                  <TableHead>Structure</TableHead>
                  <TableHead className="text-right">Views</TableHead>
                  <TableHead className="text-right">Views/day</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVideos.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="max-w-[280px]">
                      <div className="flex items-center gap-2">
                        {v.isOutlier && (
                          <Tooltip>
                            <TooltipTrigger>
                              <Flame className="h-4 w-4 shrink-0 text-warning" />
                            </TooltipTrigger>
                            <TooltipContent>
                              Statistical outlier — z = {v.outlierScore}
                            </TooltipContent>
                          </Tooltip>
                        )}
                        <span className="line-clamp-1 font-medium">{v.title}</span>
                      </div>
                      {v.whyItWorked && (
                        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                          {v.whyItWorked}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {v.competitorChannelName}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {shortDate(v.publishedAt)}
                    </TableCell>
                    <TableCell>
                      {v.hook && <Badge variant="secondary">{humanize(v.hook)}</Badge>}
                    </TableCell>
                    <TableCell>
                      {v.storyStructure && (
                        <Badge variant="outline">{humanize(v.storyStructure)}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {compactNumber(v.views)}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {compactNumber(v.viewsPerDay)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1.5">
                        {v.isOutlier && <Badge variant="warning">outlier</Badge>}
                        <CompetitorTeardownDialog video={v} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Add channel dialog */}
      <Dialog open={channelDialogOpen} onOpenChange={setChannelDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Track a channel</DialogTitle>
            <DialogDescription>
              Add a channel in your niche. Paste its URL or @handle to scan its real uploads;
              without a key we simulate a plausible batch so you can try the flow.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Name</Label>
              <Input
                value={channelForm.name}
                onChange={(e) => setChannelForm({ ...channelForm, name: e.target.value })}
                placeholder="Magnates Media"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Channel URL or @handle</Label>
              <Input
                value={channelForm.url}
                onChange={(e) => setChannelForm({ ...channelForm, url: e.target.value })}
                placeholder="https://youtube.com/@MagnatesMedia"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Niche</Label>
              <Input
                value={channelForm.niche}
                onChange={(e) => setChannelForm({ ...channelForm, niche: e.target.value })}
                placeholder="Business documentaries"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setChannelDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={addChannel} disabled={createChannel.isPending}>
              Add & scan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Track single video dialog */}
      <Dialog open={videoDialogOpen} onOpenChange={setVideoDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Track competitor video</DialogTitle>
            <DialogDescription>
              Log what's working for others — the learning loop mines this for patterns.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Channel</Label>
              <Select onValueChange={(v) => setForm({ ...form, competitorChannelId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Pick a tracked channel" />
                </SelectTrigger>
                <SelectContent>
                  {(compChannels ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Topic</Label>
              <Input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Hook</Label>
              <Input
                value={form.hook}
                onChange={(e) => setForm({ ...form, hook: e.target.value })}
                placeholder="story_cold_open…"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Views</Label>
              <Input
                type="number"
                value={form.views}
                onChange={(e) => setForm({ ...form, views: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Views per day</Label>
              <Input
                type="number"
                value={form.viewsPerDay}
                onChange={(e) => setForm({ ...form, viewsPerDay: e.target.value })}
              />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Why it worked</Label>
              <Textarea
                value={form.whyItWorked}
                onChange={(e) => setForm({ ...form, whyItWorked: e.target.value })}
                placeholder="Mechanism, not description — what made people click and stay?"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setVideoDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitVideo} disabled={createVideo.isPending}>
              Track
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ icon, label, value }: { icon?: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-1">
      <span className="font-semibold tabular-nums">{value}</span>
      <span className="flex items-center gap-0.5 text-muted-foreground">
        {icon}
        {label}
      </span>
    </div>
  );
}

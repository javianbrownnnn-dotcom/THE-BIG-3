import { useMemo, useState } from "react";
import { Flame, Plus, Swords } from "lucide-react";
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
  useCreateCompetitorVideo,
} from "@/hooks/queries";
import { compactNumber, humanize, shortDate } from "@/lib/format";

export function CompetitorsPage() {
  const [onlyOutliers, setOnlyOutliers] = useState(false);
  const { data: videos, isLoading } = useCompetitorVideos(onlyOutliers);
  const { data: compChannels } = useCompetitorChannels();
  const createVideo = useCreateCompetitorVideo();
  const [dialogOpen, setDialogOpen] = useState(false);
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

  const outlierCount = useMemo(
    () => (videos ?? []).filter((v) => v.isOutlier).length,
    [videos],
  );

  const submit = async () => {
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
    setDialogOpen(false);
  };

  if (isLoading) return <Skeleton className="h-96" />;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Competitors"
        description="What's working in the niche right now. Outliers are flagged statistically (views/day z-score vs each channel's baseline)."
        actions={
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus /> Track video
          </Button>
        }
      />

      <div className="mb-4 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Switch id="outliers" checked={onlyOutliers} onCheckedChange={setOnlyOutliers} />
          <Label htmlFor="outliers" className="cursor-pointer text-sm">
            Outliers only
          </Label>
        </div>
        <Badge variant="warning" className="gap-1">
          <Flame className="h-3 w-3" /> {outlierCount} outlier{outlierCount === 1 ? "" : "s"}
        </Badge>
        <span className="ml-auto text-sm text-muted-foreground">
          Tracking {compChannels?.length ?? 0} channels
        </span>
      </div>

      {(videos ?? []).length === 0 ? (
        <EmptyState
          icon={Swords}
          title="No competitor videos tracked"
          description="Add videos from channels in your niches. The learning loop detects outliers automatically."
          action={
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus /> Track video
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
                  <TableHead className="text-right">Velocity</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(videos ?? []).map((v) => (
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
                    <TableCell className="text-right tabular-nums">
                      {v.velocity != null ? `${v.velocity > 0 ? "+" : ""}${v.velocity}` : "—"}
                    </TableCell>
                    <TableCell>
                      {v.isOutlier && <Badge variant="warning">outlier</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={createVideo.isPending}>
              Track
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

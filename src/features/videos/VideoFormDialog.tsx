import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { useChannels, useCreateVideo } from "@/hooks/queries";

const schema = z.object({
  channelId: z.string().min(1, "Pick a channel"),
  title: z.string().min(3, "Title is required"),
  url: z.string().url().optional().or(z.literal("")),
  publishedAt: z.string().min(1, "Publish date is required"),
  topic: z.string().optional(),
  hookType: z.string().optional(),
  storyStructure: z.string().optional(),
  durationMinutes: z.coerce.number().positive().optional(),
  format: z.enum(["long_form", "short", "livestream"]),
  views: z.coerce.number().nonnegative().optional(),
  ctr: z.coerce.number().min(0).max(100).optional(),
  avgPercentViewed: z.coerce.number().min(0).max(100).optional(),
  subscribersGained: z.coerce.number().optional(),
});

type FormValues = z.infer<typeof schema>;

const HOOKS = ["story_cold_open", "question", "bold_claim", "statistic", "contrarian"];
const STRUCTURES = ["rise_and_fall", "case_study", "chronological", "problem_solution", "listicle"];

export function VideoFormDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: channels } = useChannels();
  const createVideo = useCreateVideo();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { format: "long_form", publishedAt: new Date().toISOString().slice(0, 10) },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    const hasMetrics =
      values.views != null || values.ctr != null || values.avgPercentViewed != null;
    await createVideo.mutateAsync({
      input: {
        channelId: values.channelId,
        title: values.title,
        url: values.url || undefined,
        publishedAt: new Date(values.publishedAt).toISOString(),
        topic: values.topic,
        hookType: values.hookType,
        storyStructure: values.storyStructure,
        durationSeconds: values.durationMinutes ? Math.round(values.durationMinutes * 60) : undefined,
        format: values.format,
      },
      metrics: hasMetrics
        ? {
            views: values.views,
            ctr: values.ctr,
            avgPercentViewed: values.avgPercentViewed,
            subscribersGained: values.subscribersGained,
          }
        : undefined,
    });
    toast.success("Video logged");
    form.reset();
    onOpenChange(false);
  });

  const err = form.formState.errors;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Log a video</DialogTitle>
          <DialogDescription>
            Record the packaging decisions and first metrics. Snapshots keep the history.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-1.5">
            <Label>Title</Label>
            <Input {...form.register("title")} placeholder="The collapse of…" />
            {err.title && <p className="text-xs text-destructive">{err.title.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Channel</Label>
            <Select onValueChange={(v) => form.setValue("channelId", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Pick a channel" />
              </SelectTrigger>
              <SelectContent>
                {(channels ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {err.channelId && <p className="text-xs text-destructive">{err.channelId.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Publish date</Label>
            <Input type="date" {...form.register("publishedAt")} />
          </div>
          <div className="space-y-1.5">
            <Label>Hook type</Label>
            <Select onValueChange={(v) => form.setValue("hookType", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Optional" />
              </SelectTrigger>
              <SelectContent>
                {HOOKS.map((h) => (
                  <SelectItem key={h} value={h}>
                    {h.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Story structure</Label>
            <Select onValueChange={(v) => form.setValue("storyStructure", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Optional" />
              </SelectTrigger>
              <SelectContent>
                {STRUCTURES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Length (minutes)</Label>
            <Input type="number" step="0.5" {...form.register("durationMinutes")} />
          </div>
          <div className="space-y-1.5">
            <Label>URL</Label>
            <Input {...form.register("url")} placeholder="https://youtube.com/…" />
          </div>
          <div className="col-span-2 grid grid-cols-4 gap-3 rounded-md border p-3">
            <div className="col-span-4 text-xs font-medium text-muted-foreground">
              First metric snapshot (optional)
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Views</Label>
              <Input type="number" {...form.register("views")} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">CTR %</Label>
              <Input type="number" step="0.1" {...form.register("ctr")} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">% viewed</Label>
              <Input type="number" step="0.1" {...form.register("avgPercentViewed")} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Subs gained</Label>
              <Input type="number" {...form.register("subscribersGained")} />
            </div>
          </div>
          <DialogFooter className="col-span-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createVideo.isPending}>
              {createVideo.isPending ? "Saving…" : "Log video"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

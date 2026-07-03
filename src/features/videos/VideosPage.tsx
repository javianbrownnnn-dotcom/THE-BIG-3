import { useMemo, useState } from "react";
import { Plus, Video as VideoIcon } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/layout/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useChannels, useVideos } from "@/hooks/queries";
import { humanize } from "@/lib/format";
import { VideoTable } from "./VideoTable";
import { VideoFormDialog } from "./VideoFormDialog";

const ALL = "__all__";

export function VideosPage() {
  const { data: videos, isLoading } = useVideos();
  const { data: channels } = useChannels();
  const [search, setSearch] = useState("");
  const [channelId, setChannelId] = useState(ALL);
  const [hook, setHook] = useState(ALL);
  const [dialogOpen, setDialogOpen] = useState(false);

  const hooks = useMemo(
    () => [...new Set((videos ?? []).map((v) => v.hookType).filter(Boolean))] as string[],
    [videos],
  );

  const filtered = useMemo(
    () =>
      (videos ?? []).filter((v) => {
        if (channelId !== ALL && v.channelId !== channelId) return false;
        if (hook !== ALL && v.hookType !== hook) return false;
        if (search && !v.title.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      }),
    [videos, channelId, hook, search],
  );

  if (isLoading) return <Skeleton className="h-96" />;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Videos"
        description="Every published video, its packaging decisions, and its full metric history."
        actions={
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus /> Log video
          </Button>
        }
      />

      {/* Filter row — one row above the content */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by title…"
          className="w-56"
        />
        <Select value={channelId} onValueChange={setChannelId}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All channels</SelectItem>
            {(channels ?? []).map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={hook} onValueChange={setHook}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All hooks</SelectItem>
            {hooks.map((h) => (
              <SelectItem key={h} value={h}>
                {humanize(h)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="ml-auto text-sm text-muted-foreground">
          {filtered.length} video{filtered.length === 1 ? "" : "s"}
        </span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={VideoIcon}
          title="No videos match"
          description="Log your first video or loosen the filters. Every video keeps a full history of metric snapshots."
          action={
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus /> Log video
            </Button>
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <VideoTable videos={filtered} />
          </CardContent>
        </Card>
      )}

      <VideoFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}

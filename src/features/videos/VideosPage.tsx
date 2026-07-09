import { useMemo, useState } from "react";
import { Download, FileUp, Plus, Star, Video as VideoIcon } from "lucide-react";
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
import { useFavorites } from "@/hooks/useFavorites";
import { usePersistentState } from "@/hooks/usePersistentState";
import { humanize } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Video } from "@/types";
import { VideoTable } from "./VideoTable";
import { VideoFormDialog } from "./VideoFormDialog";
import { ImportCsvDialog } from "./ImportCsvDialog";

const ALL = "__all__";

function exportCsv(videos: Video[], channelName: (id: string) => string) {
  const esc = (x: unknown) => `"${String(x ?? "").replace(/"/g, '""')}"`;
  const rows = [
    ["title", "channel", "published", "hook", "structure", "duration_secs",
     "views", "impressions", "ctr_pct", "avg_pct_viewed", "watch_hours", "subs_gained"],
    ...videos.map((v) => [
      v.title, channelName(v.channelId), v.publishedAt?.slice(0, 10),
      v.hookType, v.storyStructure, v.durationSeconds,
      v.metrics?.views, v.metrics?.impressions, v.metrics?.ctr,
      v.metrics?.avgPercentViewed, v.metrics?.watchTimeHours,
      v.metrics?.subscribersGained,
    ]),
  ];
  const csv = rows.map((r) => r.map(esc).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "big3-videos.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function VideosPage() {
  const { data: videos, isLoading } = useVideos();
  const { data: channels } = useChannels();
  const [search, setSearch] = useState("");
  // Filters survive reloads — checking one channel's videos repeatedly
  // shouldn't mean re-picking the filter every visit.
  const [channelId, setChannelId] = usePersistentState("videos.channel", ALL);
  const [hook, setHook] = usePersistentState("videos.hook", ALL);
  const [favOnly, setFavOnly] = usePersistentState("videos.favOnly", false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const { favorites } = useFavorites();

  const hooks = useMemo(
    () => [...new Set((videos ?? []).map((v) => v.hookType).filter(Boolean))] as string[],
    [videos],
  );

  const filtered = useMemo(
    () =>
      (videos ?? []).filter((v) => {
        if (favOnly && !favorites.has(v.id)) return false;
        if (channelId !== ALL && v.channelId !== channelId) return false;
        if (hook !== ALL && v.hookType !== hook) return false;
        if (search && !v.title.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      }),
    [videos, channelId, hook, search, favOnly, favorites],
  );

  if (isLoading) return <Skeleton className="h-96" />;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Videos"
        description="Every published video, its packaging decisions, and its full metric history."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
              <FileUp /> Import CSV
            </Button>
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus /> Log video
            </Button>
          </>
        }
      />

      {/* Filters: search on top, paired selects, then one quiet utility row */}
      <div className="mb-4 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search videos…"
            className="w-full sm:w-56"
          />
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
            <Select value={channelId} onValueChange={setChannelId}>
              <SelectTrigger className="sm:w-52">
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
              <SelectTrigger className="sm:w-44">
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
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={favOnly ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setFavOnly((f) => !f)}
          >
            <Star className={cn("h-4 w-4", favOnly && "fill-warning text-warning")} />
            Favorites
          </Button>
          <span className="ml-auto text-xs text-muted-foreground">
            {filtered.length} video{filtered.length === 1 ? "" : "s"}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              exportCsv(filtered, (id) => channels?.find((c) => c.id === id)?.name ?? "")
            }
          >
            <Download /> CSV
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={VideoIcon}
          title="No videos here yet"
          description="Log your first video (or loosen the filters). Every video keeps its full metric history, so the loop can learn what works."
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
      <ImportCsvDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}

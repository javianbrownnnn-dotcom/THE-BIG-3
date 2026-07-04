import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Youtube } from "lucide-react";
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
import { getStoredApiKey, storeApiKey } from "@/lib/youtube";
import type { Channel } from "@/types";
import { syncChannelFromYouTube } from "./sync";

export function SyncYouTubeDialog({
  channel,
  open,
  onOpenChange,
}: {
  channel: Channel;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();
  const [ref, setRef] = useState(channel.youtubeChannelId ?? "");
  const [apiKey, setApiKey] = useState(getStoredApiKey());
  const [busy, setBusy] = useState(false);

  const runSync = async () => {
    if (!ref.trim() || !apiKey.trim()) {
      toast.error("Both the channel and an API key are needed");
      return;
    }
    setBusy(true);
    try {
      storeApiKey(apiKey);
      const result = await syncChannelFromYouTube(channel, ref, apiKey.trim());
      await qc.invalidateQueries({ queryKey: ["videos"] });
      await qc.invalidateQueries({ queryKey: ["channels"] });
      toast.success(
        `Synced ${result.channelTitle}: ${result.created} new videos, ${result.snapshotsAppended} snapshots appended (${result.totalFetched} uploads checked)`,
      );
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Youtube className="h-4 w-4" /> Sync from YouTube
          </DialogTitle>
          <DialogDescription>
            Pulls every upload with current view counts straight from the YouTube API. Re-sync
            any time — existing videos get a new metric snapshot, never a duplicate.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>YouTube channel</Label>
            <Input
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              placeholder="@handle or channel URL"
            />
          </div>
          <div className="space-y-1.5">
            <Label>YouTube API key</Label>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIza…"
            />
            <p className="text-xs leading-relaxed text-muted-foreground">
              Free from console.cloud.google.com → create a project → enable “YouTube Data
              API v3” → Credentials → API key. Saved on this device and shared by all
              channels. Public stats only — CTR and retention need the (future) OAuth
              connection.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={runSync} disabled={busy}>
            <RefreshCw className={busy ? "animate-spin" : ""} />
            {busy ? "Syncing…" : "Sync now"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, PlugZap, RefreshCw, Youtube } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { data } from "@/lib/data";
import { getStoredApiKey, storeApiKey } from "@/lib/youtube";
import type { Channel } from "@/types";
import { syncChannelFromYouTube } from "./sync";

/**
 * One place for everything YouTube on a channel: step 1 links the channel and
 * pulls public stats (API key, asked for once); step 2 is the owner connection
 * (Google consent) that unlocks retention/traffic analytics and uploads.
 */
export function YouTubeDialog({
  channel,
  open,
  onOpenChange,
}: {
  channel: Channel;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();
  const savedKey = getStoredApiKey();
  const [ref, setRef] = useState(channel.youtubeChannelId ?? "");
  const [apiKey, setApiKey] = useState(savedKey);
  const [editKey, setEditKey] = useState(!savedKey);
  const [busy, setBusy] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const linked = !!channel.youtubeChannelId;
  const connected = !!channel.youtubeConnectedAt;

  const runSync = async () => {
    if (!ref.trim() || !apiKey.trim()) {
      toast.error(!ref.trim() ? "Paste your channel @handle or URL" : "An API key is needed once");
      return;
    }
    setBusy(true);
    try {
      storeApiKey(apiKey);
      const result = await syncChannelFromYouTube(channel, ref, apiKey.trim());
      await qc.invalidateQueries({ queryKey: ["videos"] });
      await qc.invalidateQueries({ queryKey: ["channels"] });
      toast.success(
        result.totalFetched === 0
          ? `Linked ${result.channelTitle} — no public uploads yet. Sync again after your first video goes live.`
          : `Synced ${result.channelTitle}: ${result.created} new videos, ${result.snapshotsAppended} snapshots updated`,
      );
      setEditKey(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const pullAnalytics = async () => {
    setBusy(true);
    try {
      const res = await data.syncOwnerAnalytics();
      await qc.invalidateQueries({ queryKey: ["videos"] });
      await qc.invalidateQueries({ queryKey: ["channels"] });
      toast.success(
        res.videosUpdated > 0
          ? `Pulled private analytics for ${res.videosUpdated} videos — CTR, impressions and retention are now live.`
          : "Sync ran, but no private metrics came back yet. New analytics can take a day to populate after connecting.",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const connect = async () => {
    setConnecting(true);
    try {
      const url = await data.connectYouTubeUrl(channel.id);
      window.open(url, "_blank", "noopener");
      toast.success("Approve access in the new tab, then come back", {
        description: "Once approved, analytics go live and uploads work.",
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setConnecting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Youtube className="h-4 w-4" /> YouTube — {channel.name}
          </DialogTitle>
          <DialogDescription>Two steps. Do them once; everything updates from then on.</DialogDescription>
        </DialogHeader>

        {/* Step 1 — link + public stats */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            {linked ? (
              <CheckCircle2 className="h-4 w-4 text-success" />
            ) : (
              <span className="grid h-4 w-4 place-items-center rounded-full border text-[10px]">1</span>
            )}
            Link the channel &amp; pull stats
            {linked && <span className="text-xs font-normal text-success">linked</span>}
          </div>
          <div className="space-y-1.5 pl-6">
            <Input
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              placeholder="@yourhandle or channel URL"
            />
            {editKey ? (
              <div className="space-y-1">
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="API key (AIza…) — asked once, saved on this device"
                />
                <p className="text-xs text-muted-foreground">
                  console.cloud.google.com → Credentials → <b>Create credentials → API key</b>.
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Using your saved API key.{" "}
                <button className="underline" onClick={() => setEditKey(true)}>
                  Change
                </button>
              </p>
            )}
            <Button size="sm" onClick={runSync} disabled={busy}>
              <RefreshCw className={busy ? "animate-spin" : ""} />
              {busy ? "Syncing…" : linked ? "Sync now" : "Link & sync"}
            </Button>
          </div>
        </div>

        <Separator />

        {/* Step 2 — owner connection */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            {connected ? (
              <CheckCircle2 className="h-4 w-4 text-success" />
            ) : (
              <span className="grid h-4 w-4 place-items-center rounded-full border text-[10px]">2</span>
            )}
            Connect as owner — analytics &amp; uploads
            {connected && <span className="text-xs font-normal text-success">connected</span>}
          </div>
          <div className="space-y-2 pl-6">
            {connected ? (
              <>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Google connection active — live retention, traffic sources, impressions, and
                  publishing are on for this channel. Nothing else to do here.
                </p>
                <div className="flex items-center gap-1.5">
                  <Button size="sm" onClick={pullAnalytics} disabled={busy}>
                    <RefreshCw className={busy ? "animate-spin" : ""} />
                    {busy ? "Pulling…" : "Pull latest analytics"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={connect} disabled={connecting}>
                    <PlugZap /> {connecting ? "Opening Google…" : "Reconnect"}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Sign in with the Google account that owns this channel. Unlocks the real
                  retention curve, traffic sources, impressions — and lets the app publish videos
                  for you. No keys to copy; just approve on Google's screen.
                </p>
                <Button size="sm" variant="outline" onClick={connect} disabled={connecting}>
                  <PlugZap /> {connecting ? "Opening Google…" : "Connect with Google"}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

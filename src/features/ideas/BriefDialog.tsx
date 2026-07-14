import { useMemo, useState } from "react";
import { Check, Copy, Download, Link2, MessageCircleQuestion } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  useChannels,
  useCompetitorVideos,
  useOrg,
  useSops,
  useVideos,
} from "@/hooks/queries";
import { buildIdeaBrief } from "@/lib/brief";
import { data } from "@/lib/data";
import { messageOf } from "@/lib/errors";

export function BriefDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: org } = useOrg();
  const { data: channels } = useChannels();
  const { data: videos } = useVideos();
  const { data: competitorVideos } = useCompetitorVideos();
  const { data: sops } = useSops();

  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const brief = useMemo(() => {
    if (!open) return "";
    return buildIdeaBrief({
      orgName: org?.name ?? "Our company",
      channels: channels ?? [],
      videos: videos ?? [],
      competitorVideos: competitorVideos ?? [],
      sops: sops ?? [],
    });
  }, [open, org, channels, videos, competitorVideos, sops]);

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(label);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't access the clipboard — select the text and copy manually.");
    }
  };

  const download = () => {
    const blob = new Blob([brief], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "idea-brief.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  const share = async () => {
    setSharing(true);
    try {
      const url = await data.shareBrief("Idea brief", brief);
      setShareUrl(url);
      await copy(url, "Share link copied — paste it into ChatGPT");
    } catch (err) {
      toast.error(messageOf(err));
    } finally {
      setSharing(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setShareUrl(null);
      }}
    >
      <DialogContent className="max-h-[85vh] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircleQuestion className="h-4 w-4 text-primary" /> Brief for ChatGPT
          </DialogTitle>
          <DialogDescription>
            Your real performance data, packed into one prompt. Copy it into ChatGPT (or share
            the link) and ask for ideas — it answers with your numbers instead of guesses.
          </DialogDescription>
        </DialogHeader>

        <Textarea
          readOnly
          value={brief}
          rows={14}
          className="font-mono text-xs"
          onFocus={(e) => e.currentTarget.select()}
        />

        {shareUrl && (
          <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-2 text-xs">
            <Link2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{shareUrl}</span>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={download}>
            <Download /> Download .md
          </Button>
          {!data.isDemo && (
            <Button variant="outline" onClick={share} disabled={sharing}>
              <Link2 /> {sharing ? "Creating…" : "Create share link"}
            </Button>
          )}
          <Button onClick={() => copy(brief, "Brief copied — paste into ChatGPT")}>
            {copied ? <Check /> : <Copy />} Copy brief
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

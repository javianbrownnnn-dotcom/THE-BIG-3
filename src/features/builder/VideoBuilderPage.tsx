// Video Builder — the video gets made here, in the app: script sections as a
// teleprompter, narration recorded on the device mic (a human voice, by
// design — no AI narration), b-roll attached per section, captions generated
// from real timings. Shorts render to an actual video file in the browser;
// long-form exports an edit kit for CapCut/DaVinci.

import { useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  Clapperboard,
  Download,
  Film,
  ImagePlus,
  Mic,
  Play,
  RefreshCw,
  Search,
  Square,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useProduction, useSearchBroll, useUpdateProduction } from "@/hooks/queries";
import { cn } from "@/lib/utils";
import type { BuilderBrollItem, BuilderSection, Production } from "@/types";
import {
  buildShotList,
  buildSrt,
  builderProgress,
  estimateSeconds,
  parseSections,
  sectionSeconds,
  syncSections,
} from "./captions";
import { renderShort, type RenderProgress } from "./renderShort";
import { useRecorder } from "./useRecorder";

function download(filename: string, content: Blob | string, type = "text/plain") {
  const blob = typeof content === "string" ? new Blob([content], { type }) : content;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function fmtSec(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Assembled script text from a production doc (studio-synced or manual). */
function scriptOf(p: Production): string {
  const parts = [p.scriptHook, p.scriptBody, p.scriptOutro].filter(Boolean);
  return parts.join("\n\n").trim();
}

function SectionCard({
  section,
  index,
  onPatch,
}: {
  section: BuilderSection;
  index: number;
  onPatch: (patch: Partial<BuilderSection>) => void;
}) {
  const recorder = useRecorder();
  const search = useSearchBroll();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BuilderBrollItem[] | null>(null);
  const [teleprompter, setTeleprompter] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const stopAndSave = async () => {
    const result = await recorder.stop();
    if (!result) return toast.error("Recording failed — try again.");
    onPatch({ voDataUrl: result.dataUrl, voDurationSec: result.durationSec });
    toast.success(`Narration saved — ${fmtSec(result.durationSec)}`);
  };

  const onUpload = (file: File) => {
    if (!file.type.startsWith("audio/")) return toast.error("Pick an audio file.");
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const audio = new Audio(dataUrl);
      audio.onloadedmetadata = () => {
        const dur = Number.isFinite(audio.duration)
          ? audio.duration
          : estimateSeconds(section.text);
        onPatch({ voDataUrl: dataUrl, voDurationSec: dur });
        toast.success("Narration attached");
      };
      audio.onerror = () => {
        onPatch({ voDataUrl: dataUrl, voDurationSec: estimateSeconds(section.text) });
        toast.success("Narration attached");
      };
    };
    reader.readAsDataURL(file);
  };

  const runSearch = (q: string) => {
    if (!q.trim()) return;
    search.mutate(q, {
      onSuccess: (items) => {
        setResults(items);
        if (!items.length) toast("No b-roll found — try different words.");
      },
      onError: (err) => toast.error(err instanceof Error ? err.message : String(err)),
    });
  };

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0 pb-3">
        <div className="min-w-0">
          <CardTitle className="text-sm leading-snug">
            {index + 1}. {section.heading}
          </CardTitle>
          <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
            {section.voDataUrl
              ? `recorded · ${fmtSec(section.voDurationSec ?? 0)}`
              : `~${fmtSec(estimateSeconds(section.text))} at 150 wpm`}
            {" · "}
            {section.broll.length} b-roll
          </p>
        </div>
        {section.voDataUrl && <Check className="h-4 w-4 shrink-0 text-success" />}
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Teleprompter */}
        <button
          onClick={() => setTeleprompter((t) => !t)}
          className="block w-full rounded-md border p-3 text-left transition-colors hover:bg-muted/50"
        >
          <p
            className={cn(
              "whitespace-pre-wrap",
              teleprompter
                ? "text-lg leading-relaxed"
                : "line-clamp-3 text-sm text-muted-foreground",
            )}
          >
            {section.text || "(no narration text in this section)"}
          </p>
          <span className="mt-1.5 block text-[11px] text-muted-foreground">
            {teleprompter ? "tap to shrink" : "tap for teleprompter view"}
          </span>
        </button>

        {/* Record / playback */}
        {recorder.error && <p className="text-xs text-destructive">{recorder.error}</p>}
        <div className="flex flex-wrap items-center gap-2">
          {recorder.recording ? (
            <>
              <Button size="sm" variant="destructive" onClick={stopAndSave}>
                <Square className="h-3.5 w-3.5" /> Stop — {fmtSec(recorder.elapsed)}
              </Button>
              <Button size="sm" variant="ghost" onClick={recorder.cancel}>
                Discard
              </Button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                onClick={() => {
                  setTeleprompter(true);
                  recorder.start();
                }}
              >
                <Mic /> {section.voDataUrl ? "Re-record" : "Record"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
                <Upload /> Upload audio
              </Button>
              {section.voDataUrl && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onPatch({ voDataUrl: undefined, voDurationSec: undefined })}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(f);
              e.target.value = "";
            }}
          />
        </div>
        {section.voDataUrl && !recorder.recording && (
          <audio controls src={section.voDataUrl} className="h-9 w-full" preload="metadata" />
        )}

        {/* B-roll */}
        {section.broll.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {section.broll.map((b, i) => (
              <div key={i} className="relative shrink-0">
                <img
                  src={b.thumb ?? b.url}
                  alt={b.credit ?? "b-roll"}
                  className="h-16 w-28 rounded-md border object-cover"
                  loading="lazy"
                />
                {b.kind === "video" && (
                  <Play className="absolute left-1 top-1 h-3.5 w-3.5 text-white drop-shadow" />
                )}
                <button
                  aria-label="Remove b-roll"
                  onClick={() =>
                    onPatch({ broll: section.broll.filter((_, bi) => bi !== i) })
                  }
                  className="absolute -right-1.5 -top-1.5 rounded-full bg-background p-0.5 shadow"
                >
                  <Trash2 className="h-3 w-3 text-muted-foreground" />
                </button>
              </div>
            ))}
          </div>
        )}
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            runSearch(query || section.heading);
          }}
        >
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`B-roll search — e.g. "${section.heading.slice(0, 24)}"`}
            className="h-9 text-sm"
          />
          <Button type="submit" size="sm" variant="outline" disabled={search.isPending}>
            {search.isPending ? <RefreshCw className="animate-spin" /> : <Search />}
          </Button>
        </form>
        {results && (
          <div className="grid grid-cols-3 gap-2">
            {results.map((r, i) => (
              <button
                key={i}
                onClick={() => {
                  onPatch({ broll: [...section.broll, r] });
                  toast.success("B-roll attached");
                }}
                className="group relative overflow-hidden rounded-md border"
                title={r.credit}
              >
                <img
                  src={r.thumb ?? r.url}
                  alt={r.credit ?? "b-roll result"}
                  className="aspect-video w-full object-cover transition-transform group-hover:scale-105"
                  loading="lazy"
                />
                <span className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-1 bg-black/60 py-0.5 text-[10px] text-white">
                  <ImagePlus className="h-3 w-3" /> {r.kind}
                </span>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function VideoBuilderPage() {
  const { id = "" } = useParams();
  const { data: production, isLoading } = useProduction(id);
  const update = useUpdateProduction();
  const [rendering, setRendering] = useState<RenderProgress | null>(null);

  const sections = production?.builder?.sections ?? [];
  const script = production ? scriptOf(production) : "";
  const progress = useMemo(() => builderProgress(production?.builder), [production?.builder]);
  const totalSec = sections.reduce((sum, s) => sum + sectionSeconds(s), 0);
  const isShort = production?.format === "short";

  const saveSections = (next: BuilderSection[]) => {
    if (!production) return;
    update.mutate(
      {
        id: production.id,
        patch: { builder: { sections: next, updatedAt: new Date().toISOString() } },
      },
      { onError: (err) => toast.error(err instanceof Error ? err.message : String(err)) },
    );
  };

  const syncFromScript = () => {
    if (!script) {
      return toast.error(
        "No script on this doc yet — write it (or advance the Studio project) first.",
      );
    }
    const next = syncSections(parseSections(script), sections);
    saveSections(next);
    toast.success(
      sections.length
        ? "Synced with the script — recordings kept where headings match."
        : `${next.length} section${next.length === 1 ? "" : "s"} ready to record.`,
    );
  };

  const patchSection = (sectionId: string, patch: Partial<BuilderSection>) =>
    saveSections(sections.map((s) => (s.id === sectionId ? { ...s, ...patch } : s)));

  const exportKit = () => {
    if (!production) return;
    download("captions.srt", buildSrt(sections), "text/plain");
    download("shot-list.md", buildShotList(production.title, sections), "text/markdown");
    sections.forEach((s, i) => {
      if (s.voDataUrl) {
        fetch(s.voDataUrl)
          .then((r) => r.blob())
          .then((b) => download(`vo-${String(i + 1).padStart(2, "0")}.webm`, b));
      }
    });
    toast.success("Edit kit downloading — captions, shot list, and narration files.");
  };

  const doRender = async () => {
    if (!production) return;
    if (!progress.recorded) {
      return toast.error("Record narration first — the video needs a voice.");
    }
    try {
      setRendering({ fraction: 0, sectionHeading: "" });
      const blob = await renderShort(sections, setRendering);
      const safe = production.title.replace(/[^a-z0-9]+/gi, "-").slice(0, 60);
      download(`${safe}.webm`, blob);
      toast.success("Video rendered — check your downloads. YouTube uploads WebM directly.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setRendering(null);
    }
  };

  if (isLoading) return <Skeleton className="h-96" />;
  if (!production) {
    return <p className="text-sm text-muted-foreground">This video doc doesn't exist.</p>;
  }

  return (
    <div className="animate-fade-in">
      <Button variant="ghost" size="sm" className="-ml-2 mb-3" asChild>
        <Link to={`/production/${production.id}`}>
          <ArrowLeft /> {production.title}
        </Link>
      </Button>

      <div className="mb-1 flex items-center gap-2">
        <h1 className="text-lg font-semibold">Video Builder</h1>
        {isShort && <Badge variant="secondary">Short · 9:16</Badge>}
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Record the narration in your own voice, attach b-roll per section, and the captions
        take their timing from your actual read.
      </p>

      {/* Status strip */}
      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-center gap-x-4 gap-y-1 p-3 text-xs text-muted-foreground">
          <span>
            <span className="font-medium text-foreground">{progress.recorded}</span>/
            {progress.total} recorded
          </span>
          <span>
            <span className="font-medium text-foreground">{progress.withBroll}</span>/
            {progress.total} with b-roll
          </span>
          <span>
            runtime <span className="font-medium tabular-nums text-foreground">{fmtSec(totalSec)}</span>
          </span>
          <Button size="sm" variant="ghost" className="ml-auto h-7" onClick={syncFromScript}>
            <RefreshCw className="h-3.5 w-3.5" /> {sections.length ? "Re-sync script" : "Load script"}
          </Button>
        </CardContent>
      </Card>

      {sections.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <Clapperboard className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Start from the script</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                One tap splits this doc's script into recordable sections — each becomes a
                teleprompter with its own narration and b-roll.
              </p>
            </div>
            <Button size="sm" onClick={syncFromScript}>
              <Film /> Load script into sections
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {sections.map((s, i) => (
              <SectionCard
                key={s.id}
                section={s}
                index={i}
                onPatch={(patch) => patchSection(s.id, patch)}
              />
            ))}
          </div>

          {/* Output */}
          <Card className="mt-4 border-primary/25">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Make the video</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {rendering ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      Rendering{rendering.sectionHeading ? ` — ${rendering.sectionHeading}` : "…"}
                    </span>
                    <span className="tabular-nums">{Math.round(rendering.fraction * 100)}%</span>
                  </div>
                  <Progress value={rendering.fraction * 100} />
                  <p className="text-xs text-muted-foreground">
                    Renders in real time on this device — keep the tab open.
                  </p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {(isShort || totalSec <= 180) && (
                    <Button size="sm" onClick={doRender} disabled={!progress.recorded}>
                      <Clapperboard /> Render video ({fmtSec(totalSec)})
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={exportKit}>
                    <Download /> Export edit kit
                  </Button>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {isShort || totalSec <= 180
                  ? "Render produces a finished 1080×1920 video (WebM — YouTube takes it directly): your narration, b-roll with a slow zoom, burned-in captions."
                  : "Long-form: the edit kit (narration files + captions.srt + timed shot list) drops straight into CapCut or DaVinci. In-browser rendering is Shorts-only — a 20-minute render on a phone isn't realistic."}
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

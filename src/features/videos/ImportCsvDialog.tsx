import { useRef, useState } from "react";
import Papa from "papaparse";
import { useQueryClient } from "@tanstack/react-query";
import { FileUp, Upload } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useChannels, useVideos } from "@/hooks/queries";
import { data } from "@/lib/data";
import { messageOf } from "@/lib/errors";
import {
  FIELD_LABELS,
  IMPORT_FIELDS,
  extractRows,
  guessMapping,
  titleKey,
  type ImportField,
} from "./importer";

const NONE = "__none__";

export function ImportCsvDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: channels } = useChannels();
  const { data: videos } = useVideos();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState<string>();
  const [headers, setHeaders] = useState<string[]>([]);
  const [records, setRecords] = useState<Array<Record<string, string>>>([]);
  const [mapping, setMapping] = useState<Partial<Record<ImportField, string>>>({});
  const [channelId, setChannelId] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setFileName(undefined);
    setHeaders([]);
    setRecords([]);
    setMapping({});
    if (fileRef.current) fileRef.current.value = "";
  };

  const onFile = (file: File) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const cols = (result.meta.fields ?? []).filter(Boolean);
        if (!cols.length) {
          toast.error("Couldn't read any columns from that file");
          return;
        }
        setFileName(file.name);
        setHeaders(cols);
        setRecords(result.data);
        setMapping(guessMapping(cols));
      },
      error: (err) => toast.error(`Couldn't parse the file: ${err.message}`),
    });
  };

  const rows = records.length && mapping.title ? extractRows(records, mapping) : [];

  // Preview how the import will land: existing titles get a new snapshot,
  // unknown titles become new videos.
  const existingKeys = new Map(
    (videos ?? [])
      .filter((v) => !channelId || v.channelId === channelId)
      .map((v) => [titleKey(v.title), v.id]),
  );
  const willUpdate = rows.filter((r) => existingKeys.has(titleKey(r.title))).length;
  const willCreate = rows.length - willUpdate;

  const runImport = async () => {
    if (!channelId) {
      toast.error("Pick which channel this export belongs to");
      return;
    }
    setBusy(true);
    try {
      let created = 0;
      let updated = 0;
      for (const row of rows) {
        const existingId = existingKeys.get(titleKey(row.title));
        if (existingId) {
          await data.addVideoSnapshot(existingId, row.metrics);
          updated++;
        } else {
          await data.createVideo(
            {
              channelId,
              title: row.title,
              publishedAt: row.publishedAt,
              durationSeconds: row.durationSeconds,
              format: "long_form",
            },
            row.metrics,
          );
          created++;
        }
      }
      await qc.invalidateQueries({ queryKey: ["videos"] });
      toast.success(
        `Import complete: ${created} new video${created === 1 ? "" : "s"}, ${updated} snapshot${updated === 1 ? "" : "s"} appended`,
      );
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(`Import failed: ${messageOf(err)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import from CSV</DialogTitle>
          <DialogDescription>
            Works with YouTube Studio analytics exports (Advanced mode → Export → CSV) and
            most other tools. Re-import any time — videos already in the system get a new
            metric snapshot instead of a duplicate.
          </DialogDescription>
        </DialogHeader>

        {!fileName ? (
          <button
            onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed py-12 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
          >
            <FileUp className="h-6 w-6" />
            Tap to choose a .csv file
          </button>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              <span className="truncate font-medium">{fileName}</span>
              <Button variant="ghost" size="sm" onClick={reset}>
                Change file
              </Button>
            </div>

            <div className="space-y-1.5">
              <Label>Channel</Label>
              <Select value={channelId} onValueChange={setChannelId}>
                <SelectTrigger>
                  <SelectValue placeholder="Which channel is this export from?" />
                </SelectTrigger>
                <SelectContent>
                  {(channels ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-2 block">Column mapping (auto-detected — adjust if wrong)</Label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {IMPORT_FIELDS.map((field) => (
                  <div key={field} className="flex items-center gap-2">
                    <span className="w-32 shrink-0 text-xs text-muted-foreground">
                      {FIELD_LABELS[field]}
                      {field === "title" && " *"}
                    </span>
                    <Select
                      value={mapping[field] ?? NONE}
                      onValueChange={(v) =>
                        setMapping({ ...mapping, [field]: v === NONE ? undefined : v })
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>— skip —</SelectItem>
                        {headers.map((h) => (
                          <SelectItem key={h} value={h}>
                            {h}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
              {mapping.title ? (
                <>
                  <span className="font-medium">{rows.length}</span> rows ready —{" "}
                  <span className="font-medium">{willCreate}</span> new videos,{" "}
                  <span className="font-medium">{willUpdate}</span> metric snapshots appended
                  {rows[0] && (
                    <div className="mt-1 truncate text-xs text-muted-foreground">
                      First row: “{rows[0].title}” · {rows[0].metrics.views ?? "—"} views ·{" "}
                      {rows[0].metrics.ctr ?? "—"}% CTR
                    </div>
                  )}
                </>
              ) : (
                <span className="text-destructive">
                  Map the Title column to continue — it's the only required one.
                </span>
              )}
            </div>
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
          }}
        />

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={runImport}
            disabled={busy || !rows.length || !mapping.title || !channelId}
          >
            <Upload />
            {busy ? "Importing…" : `Import ${rows.length || ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

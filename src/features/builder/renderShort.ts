// In-browser Shorts renderer: draws each section's visual on a 1080×1920
// canvas with a slow zoom and burned-in captions, plays the recorded
// narration through an AudioContext, and captures both with MediaRecorder.
// Output is a WebM file — YouTube accepts WebM uploads directly.
//
// Renders in real time (a 45s Short takes 45s) — that's the price of doing it
// on-device with zero services. Progress is reported so the UI can show it.

import type { BuilderSection } from "@/types";
import { cueChunks, sectionSeconds, wordCount } from "./captions";

export interface RenderProgress {
  /** 0..1 across the whole video */
  fraction: number;
  sectionHeading: string;
}

interface Cue {
  text: string;
  start: number;
  end: number;
}

const W = 1080;
const H = 1920;

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function decodeAudio(ctx: AudioContext, dataUrl: string): Promise<AudioBuffer | null> {
  return fetch(dataUrl)
    .then((r) => r.arrayBuffer())
    .then((buf) => ctx.decodeAudioData(buf))
    .catch(() => null);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const attempt = line ? `${line} ${word}` : word;
    if (ctx.measureText(attempt).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = attempt;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Build the cue timeline for one section (local seconds). */
function sectionCues(section: BuilderSection): Cue[] {
  const total = sectionSeconds(section);
  const chunks = cueChunks(section.text);
  const totalWords = chunks.reduce((sum, c) => sum + wordCount(c), 0) || 1;
  let offset = 0;
  return chunks.map((text) => {
    const dur = (wordCount(text) / totalWords) * total;
    const cue = { text, start: offset, end: offset + dur };
    offset += dur;
    return cue;
  });
}

export async function renderShort(
  sections: BuilderSection[],
  onProgress: (p: RenderProgress) => void,
): Promise<Blob> {
  const ready = sections.filter((s) => s.text.trim());
  if (!ready.length) throw new Error("Nothing to render — the script is empty.");

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Preload visuals (first attached b-roll per section; poster frame for clips).
  const images = await Promise.all(
    ready.map((s) => {
      const visual = s.broll[0];
      const src = visual?.kind === "image" ? visual.url : visual?.thumb;
      return src ? loadImage(src) : Promise.resolve(null);
    }),
  );

  // Audio graph: narration buffers scheduled back to back into a stream.
  const audioCtx = new AudioContext();
  await audioCtx.resume();
  const dest = audioCtx.createMediaStreamDestination();
  const buffers = await Promise.all(
    ready.map((s) => (s.voDataUrl ? decodeAudio(audioCtx, s.voDataUrl) : Promise.resolve(null))),
  );

  const durations = ready.map((s, i) => buffers[i]?.duration ?? sectionSeconds(s));
  const totalDur = durations.reduce((a, b) => a + b, 0);
  if (totalDur < 1) throw new Error("Record narration first — the video has no runtime.");

  const stream = canvas.captureStream(30);
  dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
  const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
    ? "video/webm;codecs=vp9,opus"
    : "video/webm";
  const recorder = new MediaRecorder(stream, {
    mimeType: mime,
    videoBitsPerSecond: 6_000_000,
  });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);

  // Schedule narration audio.
  let at = audioCtx.currentTime + 0.1;
  buffers.forEach((buf) => {
    if (!buf) return;
    const node = audioCtx.createBufferSource();
    node.buffer = buf;
    node.connect(dest);
    node.start(at);
    at += buf.duration;
  });

  // Section start times on the shared clock.
  const starts: number[] = [];
  durations.reduce((acc, d, i) => {
    starts[i] = acc;
    return acc + d;
  }, 0);
  const cues = ready.map(sectionCues);

  recorder.start();
  const t0 = performance.now();

  await new Promise<void>((resolve) => {
    const draw = () => {
      const t = (performance.now() - t0) / 1000;
      if (t >= totalDur) return resolve();

      let idx = starts.findIndex((s, i) => t >= s && t < s + durations[i]);
      if (idx < 0) idx = ready.length - 1;
      const local = t - starts[idx];
      const section = ready[idx];

      // Background: b-roll with a slow zoom, else a dark gradient.
      ctx.fillStyle = "#0a0a0f";
      ctx.fillRect(0, 0, W, H);
      const img = images[idx];
      if (img) {
        const zoom = 1 + 0.08 * (local / durations[idx]);
        const scale = Math.max(W / img.width, H / img.height) * zoom;
        const dw = img.width * scale;
        const dh = img.height * scale;
        try {
          ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
          ctx.fillStyle = "rgba(0,0,0,0.35)"; // darken for caption legibility
          ctx.fillRect(0, 0, W, H);
        } catch {
          /* tainted canvas (no CORS) — keep the gradient */
        }
      } else {
        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, "#101018");
        grad.addColorStop(1, "#05050a");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
      }

      // Section heading, small at top.
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.font = "500 34px system-ui, sans-serif";
      ctx.fillText(section.heading.slice(0, 48), W / 2, 180);

      // Active caption, big and centered in the lower third.
      const cue = cues[idx].find((c) => local >= c.start && local < c.end) ?? cues[idx].at(-1);
      if (cue) {
        ctx.font = "700 64px system-ui, sans-serif";
        const lines = wrapText(ctx, cue.text, W - 160);
        const lineH = 84;
        const baseY = H - 420 - (lines.length - 1) * lineH;
        ctx.lineWidth = 10;
        ctx.strokeStyle = "rgba(0,0,0,0.85)";
        ctx.fillStyle = "#ffffff";
        lines.forEach((line, li) => {
          ctx.strokeText(line, W / 2, baseY + li * lineH);
          ctx.fillText(line, W / 2, baseY + li * lineH);
        });
      }

      onProgress({ fraction: t / totalDur, sectionHeading: section.heading });
      requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
  });

  const blob = await new Promise<Blob>((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mime }));
    recorder.stop();
  });
  stream.getTracks().forEach((t) => t.stop());
  await audioCtx.close();
  onProgress({ fraction: 1, sectionHeading: "" });
  if (blob.size === 0) throw new Error("Rendering produced no data — try again.");
  return blob;
}

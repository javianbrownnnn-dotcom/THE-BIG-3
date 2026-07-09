// Narration recording via the device mic (MediaRecorder). Duration is timed
// during capture because webm blobs often report Infinity for duration.

import { useEffect, useRef, useState } from "react";

export interface RecordingResult {
  dataUrl: string;
  durationSec: number;
}

export function useRecorder() {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const startedAt = useRef(0);
  const timerRef = useRef<number>();

  useEffect(() => () => window.clearInterval(timerRef.current), []);

  const start = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : undefined;
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      recorderRef.current = recorder;
      recorder.start();
      startedAt.current = performance.now();
      setElapsed(0);
      setRecording(true);
      timerRef.current = window.setInterval(
        () => setElapsed((performance.now() - startedAt.current) / 1000),
        200,
      );
    } catch {
      setError(
        "Mic access was blocked. Allow the microphone for this site (or upload an audio file instead).",
      );
    }
  };

  const stop = (): Promise<RecordingResult | null> =>
    new Promise((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder || recorder.state === "inactive") return resolve(null);
      const durationSec = (performance.now() - startedAt.current) / 1000;
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      recorder.onstop = () => {
        recorder.stream.getTracks().forEach((t) => t.stop());
        window.clearInterval(timerRef.current);
        setRecording(false);
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        const reader = new FileReader();
        reader.onload = () =>
          resolve({ dataUrl: reader.result as string, durationSec });
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      };
      recorder.stop();
    });

  const cancel = () => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = () => recorder.stream.getTracks().forEach((t) => t.stop());
      recorder.stop();
    }
    window.clearInterval(timerRef.current);
    setRecording(false);
  };

  return { recording, elapsed, error, start, stop, cancel };
}

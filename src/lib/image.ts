// Client-side image downscale + compress to a small data URL. Keeps thumbnails
// tiny (~30–60KB) so they fit comfortably in the productions row (asset_links
// jsonb) and sync across the team — no separate file storage required.

export async function compressImage(
  file: File,
  maxWidth = 640,
  quality = 0.72,
): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxWidth / bitmap.width);
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not available");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  // PNGs with transparency lose it here — thumbnails are opaque, so JPEG is fine
  // and far smaller.
  return canvas.toDataURL("image/jpeg", quality);
}

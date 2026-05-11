// Compress an image Blob/File down to roughly `targetBytes` (default ~100KB)
// by iteratively reducing JPEG/WebP quality and dimensions.
// Returns the original blob if it's already small enough or compression fails.

export async function compressImageToTarget(
  input: Blob,
  targetBytes = 100 * 1024,
  opts: { startMaxDim?: number; minDim?: number; mimeType?: "image/jpeg" | "image/webp" } = {}
): Promise<Blob> {
  if (input.size <= targetBytes) return input;
  const { startMaxDim = 1600, minDim = 480, mimeType = "image/jpeg" } = opts;

  const dataUrl: string = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(input);
  });

  const img: HTMLImageElement = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });

  let maxDim = startMaxDim;
  let best: Blob | null = null;

  // Try several (dim, quality) combinations until we get under target.
  while (maxDim >= minDim) {
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) break;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, w, h);

    for (const q of [0.8, 0.65, 0.5, 0.4, 0.3]) {
      const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, mimeType, q));
      if (!blob) continue;
      if (!best || blob.size < best.size) best = blob;
      if (blob.size <= targetBytes) return blob;
    }
    maxDim = Math.round(maxDim * 0.75);
  }

  return best && best.size < input.size ? best : input;
}

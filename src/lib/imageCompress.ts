// Lightweight client-side image compression/resizing for faster uploads.
// Returns a JPEG (or WebP) Blob no larger than `maxDim` on its longest side.

export type CompressOptions = {
  maxDim?: number;        // max width/height in pixels (default 1024)
  quality?: number;       // 0..1 (default 0.82)
  mimeType?: "image/jpeg" | "image/webp"; // default jpeg (broad support)
};

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function readAsDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

/** Compress + resize an image Blob/File. Falls back to original on failure. */
export async function compressImage(
  input: Blob,
  opts: CompressOptions = {}
): Promise<Blob> {
  const { maxDim = 1024, quality = 0.82, mimeType = "image/jpeg" } = opts;

  // Skip tiny files — overhead isn't worth it.
  if (input.size < 80 * 1024) return input;

  try {
    const dataUrl = await readAsDataURL(input);
    const img = await loadImage(dataUrl);

    const { width, height } = img;
    const scale = Math.min(1, maxDim / Math.max(width, height));
    const outW = Math.round(width * scale);
    const outH = Math.round(height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return input;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, outW, outH);

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, mimeType, quality)
    );
    if (!blob) return input;
    // If compression actually made it bigger (rare), keep original.
    return blob.size < input.size ? blob : input;
  } catch {
    return input;
  }
}

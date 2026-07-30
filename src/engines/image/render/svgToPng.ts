import { sanitizeSvg } from "@/lib/security/sanitize";
import { ProcessingError } from "@/lib/errors/ProcessingError";

const FALLBACK_SIZE = 300;

export interface SvgToPngOptions {
  /** If omitted, uses the SVG's own intrinsic size (falling back to 300x300
   * if it has no explicit width/height/viewBox-derived size). */
  width?: number;
  height?: number;
  /** PNG supports transparency, so this is undefined (transparent) by
   * default — only set when the user explicitly wants an opaque background. */
  backgroundColor?: string;
}

/**
 * SVG→PNG is the one image operation that must stay main-thread: unlike
 * every other format, `createImageBitmap()` cannot decode an SVG Blob
 * directly in Chromium (confirmed empirically — "source image could not be
 * decoded") — only a real `<img>` element can, and `Image`/`HTMLImageElement`
 * don't exist inside a Worker. Loading via `<img>` is also what makes this
 * safe from script execution by construction (verified with a real
 * `<script>`-carrying SVG payload), on top of the `sanitizeSvg()` call below.
 */
export async function renderSvgToPng(file: File, options: SvgToPngOptions = {}): Promise<Blob> {
  const rawText = await file.text();
  const sanitized = sanitizeSvg(rawText);

  const img = new Image();
  const objectUrl = URL.createObjectURL(new Blob([sanitized], { type: "image/svg+xml" }));

  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () =>
        reject(new ProcessingError("MALFORMED_FILE", "This file doesn't look like a valid SVG."));
      img.src = objectUrl;
    });

    const width = options.width ?? img.naturalWidth ?? FALLBACK_SIZE;
    const height = options.height ?? img.naturalHeight ?? FALLBACK_SIZE;

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width));
    canvas.height = Math.max(1, Math.round(height));
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new ProcessingError("WORKER_CRASH", "Your browser could not create a canvas to render this SVG.");
    }

    if (options.backgroundColor) {
      ctx.fillStyle = options.backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) {
      throw new ProcessingError("WORKER_CRASH", "Could not encode this SVG as a PNG.");
    }
    return blob;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

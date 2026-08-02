import { ProcessingError } from "@/lib/errors/ProcessingError";
import { computeRotatedDimensions } from "./transform/dimensions";
import { MIME_BY_FORMAT, formatIsLossy } from "./transform/mime";
import type { ImageProcessOptions } from "./types";

const DEFAULT_QUALITY = 0.85;

function toProcessingError(cause: unknown): ProcessingError {
  if (cause instanceof ProcessingError) return cause;
  const message = cause instanceof Error ? cause.message : String(cause);
  if (message.toLowerCase().includes("decode")) {
    return new ProcessingError(
      "MALFORMED_FILE",
      "This file doesn't look like a valid image, or it may be corrupted."
    );
  }
  return new ProcessingError("UNSUPPORTED_FORMAT", "This image couldn't be processed.");
}

/**
 * Decode → crop → rotate/flip → resize → color adjust → encode, in that
 * order. `createImageBitmap` auto-applies EXIF orientation on every decode
 * path (verified against a real oriented JPEG fixture before relying on
 * this — see PROJECT_LOG.md), so no manual orientation correction is needed
 * here; it also means the output of this pipeline is always already
 * correctly oriented, and never carries the source's EXIF data forward
 * (canvas re-encoding drops it, separately verified), which is what makes
 * "Remove EXIF Metadata" just a plain call into this same pipeline rather
 * than a special case.
 */
export async function processImage(source: Blob, options: ImageProcessOptions): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(source);
  } catch (cause) {
    throw toProcessingError(cause);
  }

  try {
    // Pass 0: crop, if requested — draws only the requested sub-rectangle,
    // in the source's own pixel coordinates, before any rotate/flip/resize,
    // so every later pass operates on the cropped dimensions.
    let cropSource: CanvasImageSource = bitmap;
    let cropWidth = bitmap.width;
    let cropHeight = bitmap.height;
    if (options.crop) {
      const { x, y, width, height } = options.crop;
      const cropped = new OffscreenCanvas(width, height);
      const croppedCtx = cropped.getContext("2d");
      if (!croppedCtx) {
        throw new ProcessingError("WORKER_CRASH", "Could not create a canvas to process this image.");
      }
      croppedCtx.drawImage(bitmap, x, y, width, height, 0, 0, width, height);
      bitmap.close();
      cropSource = cropped;
      cropWidth = width;
      cropHeight = height;
    }

    const rotateDegrees = options.rotateDegrees ?? 0;
    const rotatedDimensions = computeRotatedDimensions({ width: cropWidth, height: cropHeight }, rotateDegrees);

    // Pass 1: draw at the rotated/flipped orientation, same pixel count as
    // the (possibly cropped) source — keeps the rotate/flip transform math
    // independent of any resize, which is applied as a separate, simpler
    // scaling pass below.
    const oriented = new OffscreenCanvas(rotatedDimensions.width, rotatedDimensions.height);
    const orientedCtx = oriented.getContext("2d");
    if (!orientedCtx) {
      throw new ProcessingError("WORKER_CRASH", "Could not create a canvas to process this image.");
    }
    orientedCtx.save();
    orientedCtx.translate(oriented.width / 2, oriented.height / 2);
    orientedCtx.rotate((rotateDegrees * Math.PI) / 180);
    orientedCtx.scale(options.flip === "horizontal" ? -1 : 1, options.flip === "vertical" ? -1 : 1);
    orientedCtx.drawImage(cropSource, -cropWidth / 2, -cropHeight / 2);
    orientedCtx.restore();
    if (cropSource === bitmap) bitmap.close();

    // Pass 2: resize, if requested.
    const target = options.resize ?? { width: oriented.width, height: oriented.height };
    let finalCanvas: OffscreenCanvas = oriented;
    if (target.width !== oriented.width || target.height !== oriented.height) {
      finalCanvas = new OffscreenCanvas(target.width, target.height);
      const resizeCtx = finalCanvas.getContext("2d");
      if (!resizeCtx) {
        throw new ProcessingError("WORKER_CRASH", "Could not create a canvas to process this image.");
      }
      resizeCtx.drawImage(oriented, 0, 0, target.width, target.height);
    }

    // Pass 3: brightness/contrast/grayscale, composed into one CSS filter
    // string and applied via canvas 2D's `filter` — confirmed empirically
    // (a throwaway Worker+OffscreenCanvas script) that this works inside a
    // real Worker in this project's target Chromium before relying on it.
    const filters: string[] = [];
    if (options.grayscale) filters.push("grayscale(1)");
    if (options.brightness) filters.push(`brightness(${100 + options.brightness}%)`);
    if (options.contrast) filters.push(`contrast(${100 + options.contrast}%)`);
    if (filters.length > 0) {
      const adjusted = new OffscreenCanvas(finalCanvas.width, finalCanvas.height);
      const adjustedCtx = adjusted.getContext("2d");
      if (!adjustedCtx) {
        throw new ProcessingError("WORKER_CRASH", "Could not create a canvas to process this image.");
      }
      adjustedCtx.filter = filters.join(" ");
      adjustedCtx.drawImage(finalCanvas, 0, 0);
      finalCanvas = adjusted;
    }

    // Pass 4: text watermark, drawn over everything else so it isn't
    // rotated, cropped or colour-adjusted along with the image. `fillText`
    // and `measureText` inside a real Worker's OffscreenCanvas were
    // confirmed empirically (a throwaway worker rendering text at 50% alpha
    // and counting inked pixels) before this was built on them, same
    // discipline as the `filter` pass above.
    if (options.watermark && options.watermark.text.trim() !== "") {
      const { text, position, opacity, fontScale, color } = options.watermark;
      const ctx = finalCanvas.getContext("2d");
      if (ctx) {
        const margin = Math.round(Math.min(finalCanvas.width, finalCanvas.height) * 0.04);
        const fontSize = Math.max(8, Math.round(Math.min(finalCanvas.width, finalCanvas.height) * fontScale));
        ctx.save();
        ctx.globalAlpha = Math.min(Math.max(opacity, 0), 1);
        ctx.fillStyle = color;
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textBaseline = position.startsWith("top") ? "top" : position.startsWith("bottom") ? "bottom" : "middle";
        ctx.textAlign = position.endsWith("right") ? "right" : position.endsWith("left") ? "left" : "center";
        const x =
          ctx.textAlign === "left" ? margin : ctx.textAlign === "right" ? finalCanvas.width - margin : finalCanvas.width / 2;
        const y =
          ctx.textBaseline === "top" ? margin : ctx.textBaseline === "bottom" ? finalCanvas.height - margin : finalCanvas.height / 2;
        ctx.fillText(text, x, y);
        ctx.restore();
      }
    }

    // Background fill happens last, composited *under* the final image via
    // globalCompositeOperation, so it only fills what the (possibly
    // transparent) source left uncovered — needed when converting a
    // transparent PNG/WebP to opaque JPEG.
    if (options.backgroundColor) {
      const ctx = finalCanvas.getContext("2d");
      if (ctx) {
        ctx.save();
        ctx.globalCompositeOperation = "destination-over";
        ctx.fillStyle = options.backgroundColor;
        ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
        ctx.restore();
      }
    }

    const mimeType = MIME_BY_FORMAT[options.outputFormat];
    const quality = formatIsLossy(options.outputFormat) ? options.quality ?? DEFAULT_QUALITY : undefined;
    return await finalCanvas.convertToBlob({ type: mimeType, quality });
  } catch (cause) {
    throw toProcessingError(cause);
  }
}

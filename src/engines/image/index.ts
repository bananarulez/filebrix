import { createLazyEngineWorker } from "@/engines/shared/workerClient";
import { ProcessingError, type SerializedProcessingError } from "@/lib/errors/ProcessingError";
import type { ImageProcessOptions } from "./types";
// Type-only import: never pulls the pipeline into this module's chunk — the
// worker module itself only loads on first `new Worker(...)` below.
import type { ImageWorkerApi } from "./worker";

const worker = createLazyEngineWorker<ImageWorkerApi>(
  () => new Worker(new URL("./worker.ts", import.meta.url))
);

async function call<T>(fn: (api: ImageWorkerApi) => Promise<T>): Promise<T> {
  try {
    return await worker.call(fn);
  } catch (cause) {
    throw reconstructError(cause);
  }
}

function reconstructError(cause: unknown): ProcessingError {
  if (cause instanceof ProcessingError) return cause;
  if (ProcessingError.isSerializedProcessingError(cause)) {
    return ProcessingError.fromSerialized(cause as SerializedProcessingError);
  }
  const message = cause instanceof Error ? cause.message : "Something went wrong while processing this image.";
  return new ProcessingError("UNSUPPORTED_FORMAT", message);
}

export function processImageFile(file: File, options: ImageProcessOptions): Promise<Blob> {
  return call((api) => api.processImageFile(file, options));
}

export type {
  ImageDimensions,
  ImageProcessOptions,
  RasterFormat,
  FlipAxis,
  WatermarkOptions,
  WatermarkPosition,
} from "./types";
export { computeResizeDimensions, computeRotatedDimensions } from "./transform/dimensions";
export { MIME_BY_FORMAT, EXTENSION_BY_FORMAT, formatSupportsTransparency, formatIsLossy } from "./transform/mime";

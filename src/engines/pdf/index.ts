import { createLazyEngineWorker, proxyCallback } from "@/engines/shared/workerClient";
import type { Progress } from "@/engines/shared/types";
import { ProcessingError, type SerializedProcessingError } from "@/lib/errors/ProcessingError";
import type { PageRef, PdfDocumentInfo, PdfMetadataInfo } from "./types";
// Type-only, like PdfWorkerApi below — `structural/stamp.ts` imports pdf-lib,
// so a value import here would drag it out of the worker and into this chunk.
import type { PageNumberOptions, WatermarkPdfOptions } from "./structural/stamp";
// Type-only import: never pulls pdf-lib into this module's chunk — the
// worker module itself only loads on first `new Worker(...)` below.
import type { PdfWorkerApi } from "./worker";

const worker = createLazyEngineWorker<PdfWorkerApi>(
  () => new Worker(new URL("./worker.ts", import.meta.url))
);

async function call<T>(
  fn: (api: PdfWorkerApi, keepAlive: () => void) => Promise<T>
): Promise<T> {
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
  const message = cause instanceof Error ? cause.message : "Something went wrong while processing this PDF.";
  return new ProcessingError("UNSUPPORTED_FORMAT", message);
}

export function inspectPdfFile(file: File): Promise<PdfDocumentInfo> {
  return call((api) => api.inspectPdfFile(file));
}

/**
 * `onProgress` is optional and reports per copied page (throttled worker-
 * side). Whether or not the caller passes one, a proxied callback always
 * goes across: every report also resets this call's RPC timeout, so a
 * genuinely enormous — but healthy — merge is never mistaken for a wedged
 * worker.
 */
export function buildPdfFromSelectionFiles(
  files: File[],
  selection: PageRef[],
  onProgress?: (progress: Progress) => void
): Promise<Blob> {
  return call((api, keepAlive) =>
    api.buildPdfFromSelectionFiles(
      files,
      selection,
      proxyCallback((progress: Progress) => {
        keepAlive();
        onProgress?.(progress);
      })
    )
  );
}

export function buildPdfFromImageFiles(images: File[]): Promise<Blob> {
  return call((api) => api.buildPdfFromImageFiles(images));
}

export function readPdfMetadataFile(file: File): Promise<PdfMetadataInfo> {
  return call((api) => api.readPdfMetadataFile(file));
}

export function removePdfMetadataFile(file: File): Promise<Blob> {
  return call((api) => api.removePdfMetadataFile(file));
}

export function watermarkPdfFile(file: File, options: WatermarkPdfOptions): Promise<Blob> {
  return call((api) => api.watermarkPdfFile(file, options));
}

export function addPageNumbersToFile(file: File, options: PageNumberOptions): Promise<Blob> {
  return call((api) => api.addPageNumbersToFile(file, options));
}

export type { PageRef, PdfDocumentInfo, PdfMetadataInfo, PdfPageInfo, PdfImageFormat } from "./types";
export type { PageNumberOptions, StampPosition, WatermarkPdfOptions } from "./structural/stamp";

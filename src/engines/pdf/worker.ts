import { exposeEngine, releaseProxiedCallback } from "@/engines/shared/workerClient";
import type { Progress } from "@/engines/shared/types";
import { ProcessingError } from "@/lib/errors/ProcessingError";
import { inspectPdf } from "./structural/inspect";
import { buildPdfFromSelection } from "./structural/pages";
import { buildPdfFromImages } from "./structural/imagesToPdf";
import { readPdfMetadata, removePdfMetadata } from "./structural/metadata";
import { addPageNumbers, watermarkPdf, type PageNumberOptions, type WatermarkPdfOptions } from "./structural/stamp";
import type { PageRef, PdfDocumentInfo, PdfMetadataInfo } from "./types";

/** Same serialize-before-crossing-the-worker-boundary dance as
 * engines/spreadsheet/worker.ts — see CLAUDE.md. */
async function runOrThrowSerialized<T>(fn: () => Promise<T> | T): Promise<T> {
  try {
    return await fn();
  } catch (cause) {
    if (cause instanceof ProcessingError) throw cause.toJSON();
    throw cause;
  }
}

const api = {
  inspectPdfFile(file: File): Promise<PdfDocumentInfo> {
    return runOrThrowSerialized(async () => inspectPdf(await file.arrayBuffer()));
  },

  buildPdfFromSelectionFiles(
    files: File[],
    selection: PageRef[],
    // Arrives as a Comlink proxy: calling it posts back to the main thread,
    // so it returns a promise we deliberately don't await — a progress
    // report must never pace the copy loop.
    onProgress?: (progress: Progress) => void
  ): Promise<Blob> {
    return runOrThrowSerialized(async () => {
      try {
        const sources = await Promise.all(files.map((file) => file.arrayBuffer()));
        const bytes = await buildPdfFromSelection(sources, selection, onProgress);
        return new Blob([bytes as BlobPart], { type: "application/pdf" });
      } finally {
        releaseProxiedCallback(onProgress);
      }
    });
  },

  buildPdfFromImageFiles(images: File[]): Promise<Blob> {
    return runOrThrowSerialized(async () => {
      const sources = await Promise.all(images.map((image) => image.arrayBuffer()));
      const bytes = await buildPdfFromImages(sources);
      return new Blob([bytes as BlobPart], { type: "application/pdf" });
    });
  },

  readPdfMetadataFile(file: File): Promise<PdfMetadataInfo> {
    return runOrThrowSerialized(async () => readPdfMetadata(await file.arrayBuffer()));
  },

  watermarkPdfFile(file: File, options: WatermarkPdfOptions): Promise<Blob> {
    return runOrThrowSerialized(async () => {
      const bytes = await watermarkPdf(await file.arrayBuffer(), options);
      return new Blob([bytes as BlobPart], { type: "application/pdf" });
    });
  },

  addPageNumbersToFile(file: File, options: PageNumberOptions): Promise<Blob> {
    return runOrThrowSerialized(async () => {
      const bytes = await addPageNumbers(await file.arrayBuffer(), options);
      return new Blob([bytes as BlobPart], { type: "application/pdf" });
    });
  },

  removePdfMetadataFile(file: File): Promise<Blob> {
    return runOrThrowSerialized(async () => {
      const bytes = await removePdfMetadata(await file.arrayBuffer());
      return new Blob([bytes as BlobPart], { type: "application/pdf" });
    });
  },
};

export type PdfWorkerApi = typeof api;

exposeEngine(api);

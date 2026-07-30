import { exposeEngine } from "@/engines/shared/workerClient";
import { ProcessingError } from "@/lib/errors/ProcessingError";
import { processImage } from "./pipeline";
import type { ImageProcessOptions } from "./types";

/** Same serialize-before-crossing-the-worker-boundary dance as
 * engines/spreadsheet/worker.ts and engines/pdf/worker.ts — see CLAUDE.md. */
async function runOrThrowSerialized<T>(fn: () => Promise<T> | T): Promise<T> {
  try {
    return await fn();
  } catch (cause) {
    if (cause instanceof ProcessingError) throw cause.toJSON();
    throw cause;
  }
}

const api = {
  processImageFile(file: File, options: ImageProcessOptions): Promise<Blob> {
    return runOrThrowSerialized(() => processImage(file, options));
  },
};

export type ImageWorkerApi = typeof api;

exposeEngine(api);

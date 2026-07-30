import { createLazyEngineWorker } from "@/engines/shared/workerClient";
import { ProcessingError, type SerializedProcessingError } from "@/lib/errors/ProcessingError";
import type { JsonShape, NormalizedTable, WorkbookInfo } from "./types";
import type { ParseCsvOptions } from "./parsers/csv";
// Type-only import: never pulls papaparse/xlsx into this module's chunk —
// the actual worker module is only loaded via the dynamic `new Worker(...)`
// call below, on first use.
import type { SpreadsheetWorkerApi } from "./worker";

/**
 * The one engine with a per-engine timeout override, because it's the only
 * one whose measured curve threatens the shared ceiling. Timed in a real
 * browser (PROJECT_LOG.md entry 32): a 50,000-row CSV → .xlsx took 1.9s,
 * but 250,000 rows took 14.4s — 5× the rows for 7× the time. Extrapolating
 * that curve, a sheet near Excel's own 1,048,576-row limit lands in the
 * minutes on this machine and several times that on a slow laptop, and no
 * SheetJS call reports progress to reset the clock the way a PDF build
 * does. So it gets a ceiling sized to its own worst case rather than
 * stretching the shared default (120s) to cover the one outlier.
 */
const SPREADSHEET_RPC_TIMEOUT_MS = 600_000;

const worker = createLazyEngineWorker<SpreadsheetWorkerApi>(
  () => new Worker(new URL("./worker.ts", import.meta.url)),
  { timeoutMs: SPREADSHEET_RPC_TIMEOUT_MS }
);

async function call<T>(fn: (api: SpreadsheetWorkerApi) => Promise<T>): Promise<T> {
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
  const message = cause instanceof Error ? cause.message : "Something went wrong while processing this file.";
  return new ProcessingError("UNSUPPORTED_FORMAT", message);
}

export function parseCsvFile(file: File, options?: ParseCsvOptions): Promise<NormalizedTable> {
  return call((api) => api.parseCsvFile(file, options));
}

export function inspectWorkbook(file: File): Promise<WorkbookInfo> {
  return call((api) => api.inspectWorkbook(file));
}

export function parseXlsxSheetFile(file: File, sheetName: string): Promise<NormalizedTable> {
  return call((api) => api.parseXlsxSheetFile(file, sheetName));
}

export function parseJsonFile(file: File): Promise<NormalizedTable> {
  return call((api) => api.parseJsonFile(file));
}

export function serializeToCsv(table: NormalizedTable): Promise<Blob> {
  return call((api) => api.serializeToCsv(table));
}

export function serializeToXlsx(
  table: NormalizedTable,
  sheetName?: string,
  bookType?: import("./serializers/xlsx").SpreadsheetBookType
): Promise<Blob> {
  return call((api) => api.serializeToXlsx(table, sheetName, bookType));
}

export function serializeToJson(table: NormalizedTable, shape?: JsonShape): Promise<Blob> {
  return call((api) => api.serializeToJson(table, shape));
}

export type { CellValue, JsonShape, NormalizedTable, SheetInfo, WorkbookInfo } from "./types";

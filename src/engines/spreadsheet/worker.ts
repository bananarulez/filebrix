import { exposeEngine } from "@/engines/shared/workerClient";
import { ProcessingError } from "@/lib/errors/ProcessingError";
import { parseCsv, type ParseCsvOptions } from "./parsers/csv";
import { parseXlsxWorkbook } from "./parsers/xlsx";
import { parseJson } from "./parsers/json";
import { serializeCsv } from "./serializers/csv";
import { serializeXlsx, type SpreadsheetBookType } from "./serializers/xlsx";
import { serializeJson } from "./serializers/json";
import type { JsonShape, NormalizedTable, WorkbookInfo } from "./types";

/**
 * `ProcessingError` instances don't survive Comlink's structured-clone
 * error transfer as themselves (only a plain Error with the same message
 * comes out the other side) — so any expected `ProcessingError` thrown by
 * a parser/serializer is re-thrown here as its plain serialized form
 * (`.toJSON()`), and reconstructed on the main-thread side in index.ts.
 */
async function runOrThrowSerialized<T>(fn: () => Promise<T> | T): Promise<T> {
  try {
    return await fn();
  } catch (cause) {
    if (cause instanceof ProcessingError) throw cause.toJSON();
    throw cause;
  }
}

const api = {
  parseCsvFile(file: File, options?: ParseCsvOptions): Promise<NormalizedTable> {
    return runOrThrowSerialized(async () => parseCsv(await file.text(), options));
  },

  inspectWorkbook(file: File): Promise<WorkbookInfo> {
    return runOrThrowSerialized(async () => {
      const bytes = await file.arrayBuffer();
      const workbook = parseXlsxWorkbook(bytes);
      return { sheets: workbook.sheets };
    });
  },

  parseXlsxSheetFile(file: File, sheetName: string): Promise<NormalizedTable> {
    return runOrThrowSerialized(async () => {
      const bytes = await file.arrayBuffer();
      const workbook = parseXlsxWorkbook(bytes);
      return workbook.getSheetTable(sheetName);
    });
  },

  parseJsonFile(file: File): Promise<NormalizedTable> {
    return runOrThrowSerialized(async () => parseJson(await file.text()));
  },

  serializeToCsv(table: NormalizedTable): Promise<Blob> {
    return runOrThrowSerialized(() => {
      const csvText = serializeCsv(table);
      return new Blob([csvText], { type: "text/csv;charset=utf-8" });
    });
  },

  serializeToXlsx(table: NormalizedTable, sheetName?: string, bookType?: SpreadsheetBookType): Promise<Blob> {
    return runOrThrowSerialized(() => {
      const bytes = serializeXlsx(table, sheetName, bookType);
      const mimeType =
        bookType === "ods"
          ? "application/vnd.oasis.opendocument.spreadsheet"
          : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      return new Blob([bytes as BlobPart], { type: mimeType });
    });
  },

  serializeToJson(table: NormalizedTable, shape?: JsonShape): Promise<Blob> {
    return runOrThrowSerialized(() => {
      const jsonText = serializeJson(table, shape);
      return new Blob([jsonText], { type: "application/json;charset=utf-8" });
    });
  },
};

export type SpreadsheetWorkerApi = typeof api;

exposeEngine(api);

import * as XLSX from "xlsx";
import type { NormalizedTable } from "../types";

const DEFAULT_SHEET_NAME = "Sheet1";

export type SpreadsheetBookType = "xlsx" | "ods";

/** `bookType` defaults to "xlsx" — ODS support is purely this one extra option, since SheetJS's writer already understands both formats through the same WorkBook object model. */
export function serializeXlsx(
  table: NormalizedTable,
  sheetName: string = DEFAULT_SHEET_NAME,
  bookType: SpreadsheetBookType = "xlsx"
): Uint8Array {
  const aoa: unknown[][] = [table.columns, ...table.rows];
  const worksheet = XLSX.utils.aoa_to_sheet(aoa);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sanitizeSheetName(sheetName));
  // SheetJS is inconsistent about what `type: "array"` actually returns: a
  // real Uint8Array for bookType "xlsx", but a plain ArrayBuffer for "ods"
  // (confirmed empirically, not documented) — normalizing here keeps this
  // function's declared Uint8Array return type honest for every caller.
  const written: unknown = XLSX.write(workbook, { type: "array", bookType });
  return written instanceof Uint8Array ? written : new Uint8Array(written as ArrayBuffer);
}

/** Excel sheet names: max 31 chars, and can't contain : \ / ? * [ ] */
function sanitizeSheetName(name: string): string {
  const cleaned = name.replace(/[:\\/?*[\]]/g, "_").slice(0, 31);
  return cleaned.length > 0 ? cleaned : DEFAULT_SHEET_NAME;
}

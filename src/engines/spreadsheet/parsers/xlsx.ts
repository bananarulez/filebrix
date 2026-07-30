import * as XLSX from "xlsx";
import { buildNormalizedTable } from "../normalize";
import type { NormalizedTable, SheetInfo } from "../types";
import { ProcessingError } from "@/lib/errors/ProcessingError";

export interface ParsedWorkbook {
  sheets: SheetInfo[];
  getSheetTable(name: string): NormalizedTable;
}

/**
 * Parses workbook bytes and returns sheet metadata plus a per-sheet table
 * getter — multi-sheet selection happens above the single-table
 * NormalizedTable abstraction, not forced into it.
 */
export function parseXlsxWorkbook(bytes: ArrayBuffer | Uint8Array): ParsedWorkbook {
  // A real .xlsx is always a ZIP archive. SheetJS is deliberately permissive
  // and will happily "guess" a legacy format (or just treat the bytes as a
  // single text cell) for non-ZIP input instead of throwing — checking the
  // ZIP magic bytes ourselves first is what actually makes garbage/corrupted
  // input fail with a clear error instead of producing a nonsense workbook.
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const isZip = view[0] === 0x50 && view[1] === 0x4b && view[2] === 0x03 && view[3] === 0x04;
  if (!isZip) {
    throw new ProcessingError(
      "MALFORMED_FILE",
      "This file doesn't look like a valid Excel workbook, or it may be corrupted."
    );
  }

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(bytes, { type: "array", cellDates: true });
  } catch {
    throw new ProcessingError(
      "MALFORMED_FILE",
      "This file doesn't look like a valid Excel workbook, or it may be corrupted."
    );
  }

  if (workbook.SheetNames.length === 0) {
    throw new ProcessingError("MALFORMED_FILE", "This Excel file doesn't contain any sheets.");
  }

  const sheets: SheetInfo[] = workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name];
    const ref = sheet["!ref"];
    let rowCount = 0;
    let columnCount = 0;
    if (ref) {
      const range = XLSX.utils.decode_range(ref);
      rowCount = Math.max(0, range.e.r - range.s.r + 1);
      columnCount = Math.max(0, range.e.c - range.s.c + 1);
    }
    return { name, rowCount, columnCount };
  });

  function getSheetTable(name: string): NormalizedTable {
    const sheet = workbook.Sheets[name];
    if (!sheet) {
      throw new ProcessingError("MALFORMED_FILE", `Sheet "${name}" was not found in this workbook.`);
    }

    const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: null,
      raw: true,
    });
    const table = buildNormalizedTable(rawRows, { hasHeader: true });

    if (sheet["!merges"] && sheet["!merges"].length > 0) {
      table.warnings.push(
        "This sheet contains merged cells; their values were flattened into the top-left cell of each merge."
      );
    }

    const hasFormulas = Object.keys(sheet).some(
      (key) => !key.startsWith("!") && Boolean((sheet[key] as XLSX.CellObject | undefined)?.f)
    );
    if (hasFormulas) {
      table.warnings.push(
        "This sheet contains formulas; their last calculated values were used, not the formulas themselves."
      );
    }

    return table;
  }

  return { sheets, getSheetTable };
}

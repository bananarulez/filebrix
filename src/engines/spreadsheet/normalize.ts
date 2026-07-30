import type { CellValue, NormalizedTable } from "./types";

export interface BuildTableOptions {
  /** Whether row 0 is a header row. Defaults to true. */
  hasHeader?: boolean;
}

/**
 * Shared by the CSV parser, the XLSX sheet parser, and JSON
 * array-of-arrays parsing — all three start from "raw rows as arrays" and
 * need identical header-derivation/ragged-row handling so the resulting
 * table is always rectangular.
 */
export function buildNormalizedTable(
  rawRows: unknown[][],
  options: BuildTableOptions = {}
): NormalizedTable {
  const hasHeader = options.hasHeader ?? true;
  const warnings: string[] = [];

  if (rawRows.length === 0) {
    return { columns: [], rows: [], warnings };
  }

  const headerSource = hasHeader ? rawRows[0] : [];
  const dataSource = hasHeader ? rawRows.slice(1) : rawRows;

  const columnCount = hasHeader
    ? headerSource.length
    : dataSource.reduce((max, row) => Math.max(max, row.length), 0);

  const columns = deriveColumns(headerSource, columnCount, hasHeader);

  let truncatedRowCount = 0;
  const rows: CellValue[][] = dataSource.map((row) => {
    if (row.length > columnCount) truncatedRowCount += 1;
    const normalizedRow: CellValue[] = new Array(columnCount);
    for (let i = 0; i < columnCount; i += 1) {
      normalizedRow[i] = toCellValue(row[i]);
    }
    return normalizedRow;
  });

  if (truncatedRowCount > 0) {
    warnings.push(
      `${truncatedRowCount} row${truncatedRowCount === 1 ? "" : "s"} had more values than the header row; the extra values were dropped.`
    );
  }

  return { columns, rows, warnings };
}

function deriveColumns(headerRow: unknown[], columnCount: number, hasHeader: boolean): string[] {
  const columns: string[] = [];
  const seen = new Map<string, number>();
  for (let i = 0; i < columnCount; i += 1) {
    let name = hasHeader ? cellToHeaderString(headerRow[i]) : "";
    if (!name) name = `Column ${i + 1}`;
    const priorCount = seen.get(name) ?? 0;
    seen.set(name, priorCount + 1);
    if (priorCount > 0) name = `${name} (${priorCount + 1})`;
    columns.push(name);
  }
  return columns;
}

function cellToHeaderString(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function toCellValue(value: unknown): CellValue {
  if (value === undefined || value === null || value === "") return null;
  if (value instanceof Date) return value;
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "string") {
    return value;
  }
  return String(value);
}

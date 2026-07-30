import type { CellValue, NormalizedTable } from "../types";

export type FilterOperator = "equals" | "contains" | "greaterThan" | "lessThan" | "empty" | "notEmpty";
export type SortDirection = "asc" | "desc";

export type EditOperation =
  | { type: "findReplace"; columnIndex: number | null; find: string; replace: string; matchCase?: boolean; useRegex?: boolean }
  | { type: "removeEmptyRows" }
  | { type: "removeEmptyColumns" }
  | { type: "deleteRows"; indices: number[] }
  | { type: "deleteColumns"; indices: number[] }
  | { type: "renameColumn"; index: number; name: string }
  | { type: "reorderColumns"; order: number[] }
  | { type: "sortRows"; columnIndex: number; direction: SortDirection }
  | { type: "filterRows"; columnIndex: number; operator: FilterOperator; value?: string }
  | { type: "removeDuplicateRows" }
  | { type: "trimWhitespace" };

function isEmptyCell(value: CellValue): boolean {
  return value === null || (typeof value === "string" && value.trim().length === 0);
}

/** Exported so callers outside this module (e.g. `analyze.ts`'s duplicate-row count)
 * can key rows the exact same way `removeDuplicateRows` below does — "duplicate" must
 * mean one consistent thing everywhere it's reported, not two independently-defined
 * notions that could silently disagree. */
export function cellToString(value: CellValue): string {
  if (value === null) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function withRows(table: NormalizedTable, rows: CellValue[][]): NormalizedTable {
  return { ...table, rows };
}

/**
 * Replaces occurrences of `find` in one column (or every column when
 * `columnIndex` is null). Matches against every cell's *displayed* text
 * (`cellToString`) — not just string cells — since a spreadsheet's numeric
 * columns (prices, quantities, ...) are exactly where users expect find &
 * replace to work, and silently skipping them is indistinguishable from a
 * broken feature. `null` cells are left alone (nothing to match). When a
 * cell that started as a `number` still parses cleanly as a number after
 * replacement, the result is written back as a number too, so replacing
 * "9" with "12331" in a price column doesn't turn that price into text.
 */
export function findReplace(
  table: NormalizedTable,
  params: { columnIndex: number | null; find: string; replace: string; matchCase?: boolean; useRegex?: boolean }
): NormalizedTable {
  const { columnIndex, find, replace, matchCase = false, useRegex = false } = params;
  if (find === "") return table;

  let pattern: RegExp;
  try {
    pattern = useRegex
      ? new RegExp(find, matchCase ? "g" : "gi")
      : new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), matchCase ? "g" : "gi");
  } catch {
    // Invalid regex from user input — no-op rather than crashing the editor.
    return table;
  }

  const rows = table.rows.map((row) =>
    row.map((cell, index) => {
      if (columnIndex !== null && index !== columnIndex) return cell;
      if (cell === null) return cell;
      const text = cellToString(cell);
      const replaced = text.replace(pattern, replace);
      if (replaced === text) return cell;
      if (typeof cell === "number" && replaced.trim() !== "") {
        const asNumber = Number(replaced);
        if (Number.isFinite(asNumber)) return asNumber;
      }
      return replaced;
    })
  );
  return withRows(table, rows);
}

export function removeEmptyRows(table: NormalizedTable): NormalizedTable {
  const rows = table.rows.filter((row) => !row.every(isEmptyCell));
  return withRows(table, rows);
}

export function removeEmptyColumns(table: NormalizedTable): NormalizedTable {
  const keep = table.columns.map((_, colIndex) => table.rows.some((row) => !isEmptyCell(row[colIndex])));
  const columns = table.columns.filter((_, i) => keep[i]);
  const rows = table.rows.map((row) => row.filter((_, i) => keep[i]));
  return { ...table, columns, rows };
}

export function deleteRows(table: NormalizedTable, params: { indices: number[] }): NormalizedTable {
  const toDelete = new Set(params.indices);
  const rows = table.rows.filter((_, index) => !toDelete.has(index));
  return withRows(table, rows);
}

export function deleteColumns(table: NormalizedTable, params: { indices: number[] }): NormalizedTable {
  const toDelete = new Set(params.indices);
  const columns = table.columns.filter((_, i) => !toDelete.has(i));
  const rows = table.rows.map((row) => row.filter((_, i) => !toDelete.has(i)));
  return { ...table, columns, rows };
}

export function renameColumn(table: NormalizedTable, params: { index: number; name: string }): NormalizedTable {
  const { index, name } = params;
  if (index < 0 || index >= table.columns.length) return table;
  const trimmed = name.trim();
  if (trimmed.length === 0) return table;
  const columns = table.columns.slice();
  columns[index] = trimmed;
  return { ...table, columns };
}

/** `order` is a permutation of column indices, e.g. `[2, 0, 1]` moves column 2 first. Indices missing from `order` are dropped (matches how a drag-reorder UI would report the final order, never a partial one — a caller passing a partial list is treated as also removing those columns). */
export function reorderColumns(table: NormalizedTable, params: { order: number[] }): NormalizedTable {
  const order = params.order.filter((i) => i >= 0 && i < table.columns.length);
  const columns = order.map((i) => table.columns[i]);
  const rows = table.rows.map((row) => order.map((i) => row[i]));
  return { ...table, columns, rows };
}

/** Exported so callers outside this module (Data Studio's View-mode client-side
 * column sort, which reorders what's displayed without going through the
 * persisted "Sort" bulk operation) can order cells the exact same way `sortRows`
 * below does. */
export function compareCells(a: CellValue, b: CellValue): number {
  if (a === null && b === null) return 0;
  if (a === null) return -1;
  if (b === null) return 1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === "boolean" && typeof b === "boolean") return Number(a) - Number(b);
  return cellToString(a).localeCompare(cellToString(b), undefined, { numeric: true, sensitivity: "base" });
}

export function sortRows(table: NormalizedTable, params: { columnIndex: number; direction: SortDirection }): NormalizedTable {
  const { columnIndex, direction } = params;
  if (columnIndex < 0 || columnIndex >= table.columns.length) return table;
  const rows = table.rows.slice().sort((a, b) => {
    const cmp = compareCells(a[columnIndex], b[columnIndex]);
    return direction === "asc" ? cmp : -cmp;
  });
  return withRows(table, rows);
}

function matchesFilter(cell: CellValue, operator: FilterOperator, value: string | undefined): boolean {
  switch (operator) {
    case "empty":
      return isEmptyCell(cell);
    case "notEmpty":
      return !isEmptyCell(cell);
    case "equals":
      return cellToString(cell).toLowerCase() === (value ?? "").toLowerCase();
    case "contains":
      return cellToString(cell).toLowerCase().includes((value ?? "").toLowerCase());
    case "greaterThan": {
      if (isEmptyCell(cell)) return false;
      const num = typeof cell === "number" ? cell : Number(cellToString(cell));
      const target = Number(value);
      return Number.isFinite(num) && Number.isFinite(target) && num > target;
    }
    case "lessThan": {
      if (isEmptyCell(cell)) return false;
      const num = typeof cell === "number" ? cell : Number(cellToString(cell));
      const target = Number(value);
      return Number.isFinite(num) && Number.isFinite(target) && num < target;
    }
    default:
      return true;
  }
}

export function filterRows(
  table: NormalizedTable,
  params: { columnIndex: number; operator: FilterOperator; value?: string }
): NormalizedTable {
  const { columnIndex, operator, value } = params;
  if (columnIndex < 0 || columnIndex >= table.columns.length) return table;
  const rows = table.rows.filter((row) => matchesFilter(row[columnIndex], operator, value));
  return withRows(table, rows);
}

export function removeDuplicateRows(table: NormalizedTable): NormalizedTable {
  const seen = new Set<string>();
  const rows = table.rows.filter((row) => {
    const key = JSON.stringify(row.map(cellToString));
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return withRows(table, rows);
}

export function trimWhitespace(table: NormalizedTable): NormalizedTable {
  const rows = table.rows.map((row) => row.map((cell) => (typeof cell === "string" ? cell.trim() : cell)));
  return withRows(table, rows);
}

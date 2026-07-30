export type CellValue = string | number | boolean | null | Date;

export interface NormalizedTable {
  columns: string[];
  rows: CellValue[][];
  /** Non-fatal issues found during parsing (ragged rows, unsupported Excel features, etc.). */
  warnings: string[];
}

export interface SheetInfo {
  name: string;
  rowCount: number;
  columnCount: number;
}

export interface WorkbookInfo {
  sheets: SheetInfo[];
}

export type JsonShape = "array-of-objects" | "array-of-arrays";

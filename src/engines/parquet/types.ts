import type { DatasetAnalysis } from "@/engines/spreadsheet/edit/analyze";

export interface ParquetColumn {
  name: string;
  /** DuckDB's own type name (e.g. BIGINT, VARCHAR, DOUBLE, TIMESTAMP, STRUCT(...)). */
  type: string;
}

export interface ParquetSummary {
  rowCount: number;
  columns: ParquetColumn[];
}

export type SortDirection = "ASC" | "DESC";

export interface GetPageParams {
  /** 1-indexed page number. */
  page: number;
  pageSize: number;
  sortColumn?: string;
  sortDirection?: SortDirection;
  /** Matched case-insensitively against every (capped) column, cast to text. */
  searchTerm?: string;
}

export interface PreviewPage {
  rows: Array<Record<string, unknown>>;
  page: number;
  pageSize: number;
  /** Row count for the current filter (equals summary.rowCount when there's no search term). */
  totalRows: number;
}

export interface ParquetSession {
  summary: ParquetSummary;
  getPage(params: GetPageParams): Promise<PreviewPage>;
  /**
   * Materializes the entire result set, uncapped by page size — Data Studio's Convert
   * mode uses this to export a Parquet file to another format, and deliberately does
   * NOT check any row-count cap before calling it (only Editor mode does, via
   * `exceedsEditorRowCap` in `tableBridge.ts`, before it in turn calls this) — that
   * split is what keeps View/Analyze/Convert fully scalable while Editor is capped.
   * Don't add a cap check inside this method itself.
   */
  getAllRows(): Promise<Array<Record<string, unknown>>>;
  /** Dataset-wide stats via SQL aggregates — scales the same way `getPage` does,
   * never materializes the full dataset just to analyze it. */
  analyze(): Promise<DatasetAnalysis>;
  close(): Promise<void>;
}

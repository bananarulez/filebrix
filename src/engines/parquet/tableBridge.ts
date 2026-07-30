import type { CellValue, NormalizedTable } from "@/engines/spreadsheet/types";
import type { ParquetSession } from "./types";

/**
 * Editor mode needs the entire dataset as one in-memory `NormalizedTable` (both
 * jspreadsheet-ce and the bulk-operation recipe engine require this — confirmed, no
 * streaming/paginated mode exists for either), so it's capped. 50,000 is not a guess:
 * `recipe.ts`'s own doc comment already validates the recipe engine's full-replay-on-
 * every-op design against a 50k-row table, and it's the same order of magnitude
 * jspreadsheet-ce has been exercised at elsewhere in this app. View/Analyze/Convert
 * are NOT capped — they stay backed by SQL (`ParquetSession.getPage`/`analyze`/
 * `getAllRows`), which is the entire reason this engine uses DuckDB in the first
 * place. Only Editor mode ever needs to check this.
 */
export const MAX_EDITOR_ROWS = 50_000;

export function exceedsEditorRowCap(session: ParquetSession): boolean {
  return session.summary.rowCount > MAX_EDITOR_ROWS;
}

/** bigint (DuckDB BIGINT/HUGEINT results) -> number; native JS `Date` objects
 * (DuckDB DATE/TIMESTAMP results, already converted by duckdb-wasm's own Arrow-to-JS
 * layer) pass through unchanged since `CellValue` already supports `Date`; nested
 * STRUCT/LIST/MAP values get JSON.stringify'd into the cell — this is not a new rule,
 * it's the exact "stringify + warn" contract `parsers/json.ts` already established
 * for a nested value inside an otherwise-tabular row. */
function parquetCellToNormalized(value: unknown, warn: () => void): CellValue {
  if (value === null || value === undefined) return null;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "string") return value;
  if (value instanceof Date) return value;
  warn();
  return JSON.stringify(value);
}

/** Materializes a Parquet session's full result set into the same `NormalizedTable`
 * shape every other format uses, so Editor mode can hand off to the exact same
 * grid/operations/recipe engine unchanged. Callers needing the size cap must check
 * `exceedsEditorRowCap(session)` themselves first — this function has no cap of its
 * own, since Convert mode intentionally calls the underlying `session.getAllRows()`
 * without one (see `ParquetSession.getAllRows`'s doc comment). */
export async function parquetSessionToTable(session: ParquetSession): Promise<NormalizedTable> {
  const columns = session.summary.columns.map((column) => column.name);
  const rawRows = await session.getAllRows();

  let nestedValueCount = 0;
  const warn = () => {
    nestedValueCount += 1;
  };

  const rows: CellValue[][] = rawRows.map((row) => columns.map((name) => parquetCellToNormalized(row[name], warn)));

  const warnings: string[] = [];
  if (nestedValueCount > 0) {
    warnings.push(
      `${nestedValueCount} nested (struct/list/map) value${nestedValueCount === 1 ? " was" : "s were"} converted to a JSON text string.`
    );
  }

  return { columns, rows, warnings };
}

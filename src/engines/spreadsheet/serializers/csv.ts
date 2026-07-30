import Papa from "papaparse";
import type { CellValue, NormalizedTable } from "../types";

/**
 * `escapeFormulae: true` guards against CSV injection — a cell value like
 * `=cmd|'/c calc'!A1` would otherwise be interpreted as a formula by Excel
 * or LibreOffice when the downloaded file is opened later. Since this
 * serializer can be fed arbitrary data (e.g. from a JSON-to-CSV
 * conversion), that's not a theoretical concern.
 */
export function serializeCsv(table: NormalizedTable): string {
  return Papa.unparse(
    {
      fields: table.columns,
      data: table.rows.map((row) => row.map(formatCellForCsv)),
    },
    { escapeFormulae: true }
  );
}

function formatCellForCsv(value: CellValue): string | number | boolean | null {
  if (value instanceof Date) return value.toISOString();
  return value;
}

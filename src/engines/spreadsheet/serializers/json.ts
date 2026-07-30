import type { CellValue, JsonShape, NormalizedTable } from "../types";

/** The plain JS value a table serializes to, before either `JSON.stringify` (serializeJson) or `js-yaml`'s `dump` (see convert/yamlTable.ts) turns it into text — shared so JSON and YAML export can never drift on shape. */
export function tableToJsonValue(table: NormalizedTable, shape: JsonShape = "array-of-objects"): unknown {
  if (shape === "array-of-arrays") {
    return [table.columns, ...table.rows.map((row) => row.map(toJsonValue))];
  }

  return table.rows.map((row) => {
    const obj: Record<string, unknown> = {};
    table.columns.forEach((column, index) => {
      obj[column] = toJsonValue(row[index]);
    });
    return obj;
  });
}

export function serializeJson(table: NormalizedTable, shape: JsonShape = "array-of-objects"): string {
  return JSON.stringify(tableToJsonValue(table, shape), null, 2);
}

function toJsonValue(value: CellValue): unknown {
  if (value instanceof Date) return value.toISOString();
  return value;
}

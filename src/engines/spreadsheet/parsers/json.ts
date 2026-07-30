import { buildNormalizedTable } from "../normalize";
import type { CellValue, NormalizedTable } from "../types";
import { ProcessingError } from "@/lib/errors/ProcessingError";

/**
 * Supports: array of objects, array of arrays, a single object (treated as
 * a one-row table), and an array of plain values (single "value" column).
 * Anything else — a bare scalar, or an array mixing shapes — is rejected
 * with a specific explanation rather than silently producing a bad table.
 * A nested object/array *value inside an otherwise-tabular row* is not
 * rejected — it's stringified into that cell with a warning (same
 * precedent as how Parquet Viewer displays nested STRUCT/LIST values).
 */
export function parseJson(text: string): NormalizedTable {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ProcessingError("MALFORMED_FILE", "This file isn't valid JSON.");
  }

  return normalizeJsonValue(data);
}

/** Exported for reuse by any format that parses to the same JSON-shaped value model before hitting this normalizer — e.g. YAML (see convert/yamlTable.ts), which is really just a different text syntax for the same value shape JSON already normalizes. */
export function normalizeJsonValue(data: unknown): NormalizedTable {
  if (Array.isArray(data)) return normalizeJsonArray(data);
  if (isPlainObject(data)) return normalizeArrayOfObjects([data]);

  throw new ProcessingError(
    "UNSUPPORTED_FORMAT",
    `This JSON is a single ${describeJsonType(data)}, which can't be represented as a table. ` +
      "Structured data tools work best with an object, an array of objects, or an array of arrays."
  );
}

function normalizeJsonArray(data: unknown[]): NormalizedTable {
  if (data.length === 0) {
    return { columns: [], rows: [], warnings: [] };
  }

  if (data.every(isPlainObject)) {
    return normalizeArrayOfObjects(data as Record<string, unknown>[]);
  }

  if (data.every((item) => Array.isArray(item))) {
    return buildNormalizedTable(data as unknown[][], { hasHeader: false });
  }

  if (data.every(isPrimitive)) {
    return {
      columns: ["value"],
      rows: data.map((value) => [toCellValue(value)]),
      warnings: [],
    };
  }

  throw new ProcessingError(
    "UNSUPPORTED_FORMAT",
    "This JSON array mixes objects, arrays and/or plain values. It needs to be uniformly an " +
      "array of objects, an array of arrays, or an array of plain values to become a table."
  );
}

function normalizeArrayOfObjects(items: Record<string, unknown>[]): NormalizedTable {
  const columns: string[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    for (const key of Object.keys(item)) {
      if (!seen.has(key)) {
        seen.add(key);
        columns.push(key);
      }
    }
  }

  let nestedValueCount = 0;
  const rows: CellValue[][] = items.map((item) =>
    columns.map((key) => {
      const value = item[key];
      if (value !== null && typeof value === "object" && !(value instanceof Date)) {
        nestedValueCount += 1;
      }
      return toCellValue(value);
    })
  );

  const warnings: string[] = [];
  if (nestedValueCount > 0) {
    warnings.push(
      `${nestedValueCount} nested object/array value${nestedValueCount === 1 ? " was" : "s were"} converted to a JSON text string.`
    );
  }

  return { columns, rows, warnings };
}

function toCellValue(value: unknown): CellValue {
  if (value === undefined || value === null) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (value instanceof Date) return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) && !(value instanceof Date);
}

function isPrimitive(value: unknown): boolean {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

function describeJsonType(value: unknown): string {
  if (value === null) return "null value";
  if (typeof value === "number") return "number";
  if (typeof value === "string") return "string";
  if (typeof value === "boolean") return "boolean";
  return typeof value;
}

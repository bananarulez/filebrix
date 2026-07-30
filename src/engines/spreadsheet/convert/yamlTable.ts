import { dump } from "js-yaml";
import { ProcessingError } from "@/lib/errors/ProcessingError";
import { normalizeJsonValue } from "../parsers/json";
import { tableToJsonValue } from "../serializers/json";
import { parseYamlOrThrow } from "../format/yaml";
import type { JsonShape, NormalizedTable } from "../types";

/**
 * YAML is just a different text syntax for the same value model JSON already
 * normalizes into a table — parsing reuses `normalizeJsonValue` (the same function
 * `parseJson` calls after `JSON.parse`) rather than re-implementing array-of-objects/
 * array-of-arrays/single-object detection a second time, and `parseYamlOrThrow`
 * (format/yaml.ts) for the actual YAML parse rather than a second copy of it.
 */
export function parseYamlTable(text: string): NormalizedTable {
  return normalizeJsonValue(parseYamlOrThrow(text));
}

export function serializeTableToYamlText(table: NormalizedTable, shape: JsonShape = "array-of-objects"): string {
  const value = tableToJsonValue(table, shape);
  try {
    return dump(value, { lineWidth: 100 });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Could not convert this table to YAML.";
    throw new ProcessingError("UNSUPPORTED_FORMAT", message);
  }
}

import { ProcessingError } from "@/lib/errors/ProcessingError";

/** Parses raw text as JSON and confirms it's at least a plausible GeoJSON container — deeper structural checks belong to `validateGeoJson`, not here. */
export function parseGeoJsonText(text: string): unknown {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new ProcessingError(
      "MALFORMED_FILE",
      "This file isn't valid JSON, so it can't be read as GeoJSON."
    );
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ProcessingError(
      "MALFORMED_FILE",
      "This file's contents aren't a GeoJSON object."
    );
  }
  return value;
}

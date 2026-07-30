import simplify from "@turf/simplify";
import { coordEach } from "@turf/meta";
import type { GeoJSON } from "geojson";
import { ProcessingError } from "@/lib/errors/ProcessingError";
import { asRecord } from "./shape";
import type { SimplifyOutcome } from "../types";

function countVertices(geojson: GeoJSON): number {
  let count = 0;
  coordEach(geojson, () => {
    count += 1;
  });
  return count;
}

/**
 * Wraps `@turf/simplify` (Douglas-Peucker via simplify-js) with vertex
 * counts so the UI can show a concrete before/after reduction, and with
 * error translation — turf throws plain Errors on structurally invalid
 * geometry, which every tool on this site surfaces as a ProcessingError.
 */
export function simplifyGeoJson(root: unknown, tolerance: number, highQuality: boolean): SimplifyOutcome {
  const record = asRecord(root);
  if (!record) {
    throw new ProcessingError("MALFORMED_FILE", "This file's contents aren't a GeoJSON object.");
  }
  const geojson = record as unknown as GeoJSON;

  let beforeVertexCount: number;
  try {
    beforeVertexCount = countVertices(geojson);
  } catch {
    throw new ProcessingError(
      "MALFORMED_FILE",
      "This GeoJSON has a structural problem that's preventing simplification. Try the GeoJSON Validator first."
    );
  }

  let simplified: GeoJSON;
  try {
    simplified = simplify(geojson, { tolerance, highQuality, mutate: false });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    throw new ProcessingError("MALFORMED_FILE", `Could not simplify this GeoJSON: ${message}`);
  }

  return {
    geojson: simplified,
    beforeVertexCount,
    afterVertexCount: countVertices(simplified),
  };
}

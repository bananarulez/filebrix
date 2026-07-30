import bbox from "@turf/bbox";
import type { GeoJSON } from "geojson";
import { ProcessingError } from "@/lib/errors/ProcessingError";
import { asRecord, extractFeatureList } from "./shape";
import type { BBox2D, GeoJsonSummary } from "../types";

const PROPERTY_PREVIEW_LIMIT = 5;

/** Best-effort dataset stats for the viewer — tolerant of individually malformed features so a mostly-good file still previews. */
export function summarizeGeoJson(root: unknown): GeoJsonSummary {
  const record = asRecord(root);
  if (!record) {
    throw new ProcessingError("MALFORMED_FILE", "This file's contents aren't a GeoJSON object.");
  }
  const extracted = extractFeatureList(record);
  if (!extracted) {
    const type = typeof record.type === "string" ? record.type : "(missing)";
    throw new ProcessingError("MALFORMED_FILE", `Unrecognized GeoJSON "type": ${type}.`);
  }

  const warnings: string[] = [];
  const geometryTypeCounts: Record<string, number> = {};
  const propertyKeySet = new Set<string>();
  const propertyPreview: Array<Record<string, unknown>> = [];

  for (const feature of extracted.features) {
    const featureRecord = asRecord(feature);
    const geometry = featureRecord ? asRecord(featureRecord.geometry) : null;
    const geometryType = geometry && typeof geometry.type === "string" ? geometry.type : "null";
    geometryTypeCounts[geometryType] = (geometryTypeCounts[geometryType] ?? 0) + 1;

    const properties = featureRecord ? asRecord(featureRecord.properties) : null;
    if (properties) {
      for (const key of Object.keys(properties)) propertyKeySet.add(key);
      if (propertyPreview.length < PROPERTY_PREVIEW_LIMIT) propertyPreview.push(properties);
    }
  }

  let boundingBox: BBox2D | null = null;
  try {
    const computed = bbox(record as unknown as GeoJSON);
    if (computed.every((value) => Number.isFinite(value))) {
      boundingBox = [computed[0], computed[1], computed[2], computed[3]];
    } else {
      warnings.push("Could not compute a bounding box — some coordinates aren't finite numbers.");
    }
  } catch {
    warnings.push("Could not compute a bounding box for this dataset.");
  }

  return {
    featureCount: extracted.features.length,
    geometryTypeCounts,
    bbox: boundingBox,
    propertyKeys: Array.from(propertyKeySet),
    propertyPreview,
    warnings,
  };
}

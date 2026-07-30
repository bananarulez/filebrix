import bbox from "@turf/bbox";
import type { GeoJSON } from "geojson";
import { ProcessingError } from "@/lib/errors/ProcessingError";
import { serializeCsv } from "@/engines/spreadsheet/serializers/csv";
import { asRecord, extractFeatureList, isPosition, type GeoJsonRecord } from "./shape";
import type { CellValue, GeoJsonToCsvOutcome, NormalizedTable } from "../types";

/**
 * One representative [lon, lat] per feature: the point itself for Point,
 * the first vertex for MultiPoint/LineString, and the bounding-box center
 * for anything with an area or multiple parts (Polygon, MultiPolygon,
 * MultiLineString, GeometryCollection) — documented in the tool's FAQ as an
 * approximation, not a true centroid.
 */
function representativePoint(geometry: GeoJsonRecord | null): [number, number] | null {
  if (!geometry) return null;
  const { type, coordinates } = geometry;
  try {
    if (type === "Point" && isPosition(coordinates)) {
      return [coordinates[0], coordinates[1]];
    }
    if ((type === "MultiPoint" || type === "LineString") && Array.isArray(coordinates)) {
      const first = coordinates[0];
      return isPosition(first) ? [first[0], first[1]] : null;
    }
    if (
      type === "MultiLineString" ||
      type === "Polygon" ||
      type === "MultiPolygon" ||
      type === "GeometryCollection"
    ) {
      const box = bbox(geometry as unknown as GeoJSON);
      return box.every((value) => Number.isFinite(value)) ? [(box[0] + box[2]) / 2, (box[1] + box[3]) / 2] : null;
    }
  } catch {
    return null;
  }
  return null;
}

function toCellValue(value: unknown): CellValue {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  return JSON.stringify(value);
}

export function geoJsonToCsv(root: unknown): GeoJsonToCsvOutcome {
  const record = asRecord(root);
  if (!record) {
    throw new ProcessingError("MALFORMED_FILE", "This file's contents aren't a GeoJSON object.");
  }
  const extracted = extractFeatureList(record);
  if (!extracted) {
    const type = typeof record.type === "string" ? record.type : "(missing)";
    throw new ProcessingError("MALFORMED_FILE", `Unrecognized GeoJSON "type": ${type}.`);
  }

  const propertyKeys: string[] = [];
  const propertyKeySet = new Set<string>();
  let skippedGeometryCount = 0;

  interface CollectedRow {
    geometryType: string;
    point: [number, number] | null;
    properties: GeoJsonRecord;
  }
  const collected: CollectedRow[] = [];

  for (const feature of extracted.features) {
    const featureRecord = asRecord(feature);
    const geometry = featureRecord ? asRecord(featureRecord.geometry) : null;
    const geometryType = geometry && typeof geometry.type === "string" ? geometry.type : "null";
    const point = representativePoint(geometry);
    if (!point) skippedGeometryCount += 1;

    const properties = (featureRecord ? asRecord(featureRecord.properties) : null) ?? {};
    for (const key of Object.keys(properties)) {
      if (!propertyKeySet.has(key)) {
        propertyKeySet.add(key);
        propertyKeys.push(key);
      }
    }

    collected.push({ geometryType, point, properties });
  }

  const columns = ["geometry_type", "longitude", "latitude", ...propertyKeys];
  const rows: CellValue[][] = collected.map((row) => [
    row.geometryType,
    row.point?.[0] ?? null,
    row.point?.[1] ?? null,
    ...propertyKeys.map((key) => toCellValue(row.properties[key])),
  ]);

  const warnings: string[] = [];
  if (skippedGeometryCount > 0) {
    warnings.push(
      `${skippedGeometryCount} feature(s) had no usable geometry — their longitude/latitude were left blank.`
    );
  }

  const table: NormalizedTable = { columns, rows, warnings };
  const csvText = serializeCsv(table);
  return { blob: new Blob([csvText], { type: "text/csv;charset=utf-8" }), warnings };
}

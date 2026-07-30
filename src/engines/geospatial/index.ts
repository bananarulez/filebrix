import { createLazyEngineWorker } from "@/engines/shared/workerClient";
import { ProcessingError, type SerializedProcessingError } from "@/lib/errors/ProcessingError";
import type { NormalizedTable } from "@/engines/spreadsheet/types";
import { detectLatLonColumns } from "./ops/csvImport";
// Type-only import: never pulls turf/papaparse into this module's chunk —
// the worker module itself only loads on first `new Worker(...)` below.
import type { GeospatialWorkerApi } from "./worker";
import type { BufferUnit } from "./ops/geometry";
import type { CrsRef } from "./ops/crs";
import type {
  CrsDetection,
  FeatureStatistics,
  GeometryOpOutcome,
  ReprojectOutcome,
  ValidationIssue,
  CsvToGeoJsonOutcome,
  GeoJsonSummary,
  GeoJsonToCsvOutcome,
  RepairOutcome,
  SimplifyOutcome,
  ValidationResult,
} from "./types";

const worker = createLazyEngineWorker<GeospatialWorkerApi>(
  () => new Worker(new URL("./worker.ts", import.meta.url))
);

async function call<T>(fn: (api: GeospatialWorkerApi) => Promise<T>): Promise<T> {
  try {
    return await worker.call(fn);
  } catch (cause) {
    throw reconstructError(cause);
  }
}

function reconstructError(cause: unknown): ProcessingError {
  if (cause instanceof ProcessingError) return cause;
  if (ProcessingError.isSerializedProcessingError(cause)) {
    return ProcessingError.fromSerialized(cause as SerializedProcessingError);
  }
  const message = cause instanceof Error ? cause.message : "Something went wrong while processing this file.";
  return new ProcessingError("UNSUPPORTED_FORMAT", message);
}

export function parseGeoJsonFile(file: File): Promise<unknown> {
  return call((api) => api.parseGeoJsonFile(file));
}

export function summarizeGeoJson(geojson: unknown): Promise<GeoJsonSummary> {
  return call((api) => api.summarizeGeoJson(geojson));
}

export function validateGeoJson(geojson: unknown): Promise<ValidationResult> {
  return call((api) => api.validateGeoJson(geojson));
}

export function repairGeoJson(geojson: unknown): Promise<RepairOutcome> {
  return call((api) => api.repairGeoJson(geojson));
}

export function simplifyGeoJson(
  geojson: unknown,
  tolerance: number,
  highQuality: boolean
): Promise<SimplifyOutcome> {
  return call((api) => api.simplifyGeoJson(geojson, tolerance, highQuality));
}

export function geoJsonToCsv(geojson: unknown): Promise<GeoJsonToCsvOutcome> {
  return call((api) => api.geoJsonToCsv(geojson));
}

export function parseCsvFile(file: File): Promise<NormalizedTable> {
  return call((api) => api.parseCsvFile(file));
}

export function csvTableToGeoJson(
  table: NormalizedTable,
  latColumn: string,
  lonColumn: string
): Promise<CsvToGeoJsonOutcome> {
  return call((api) => api.csvTableToGeoJson(table, latColumn, lonColumn));
}

export function detectCrs(geojson: unknown): Promise<CrsDetection> {
  return call((api) => api.detectCrs(geojson));
}

export function reprojectGeoJson(
  geojson: unknown,
  from: CrsRef,
  to: CrsRef,
  decimals?: number | null
): Promise<ReprojectOutcome> {
  return call((api) => api.reprojectGeoJson(geojson, from, to, decimals));
}

export function bufferGeoJson(geojson: unknown, distance: number, unit: BufferUnit): Promise<GeometryOpOutcome> {
  return call((api) => api.bufferGeoJson(geojson, distance, unit));
}

export function dissolveGeoJson(geojson: unknown, propertyName?: string): Promise<GeometryOpOutcome> {
  return call((api) => api.dissolveGeoJson(geojson, propertyName));
}

export function mergeGeoJson(geojson: unknown): Promise<GeometryOpOutcome> {
  return call((api) => api.mergeGeoJson(geojson));
}

export function splitMultiGeometry(geojson: unknown): Promise<GeometryOpOutcome> {
  return call((api) => api.splitMultiGeometry(geojson));
}

export function listPropertyKeys(geojson: unknown): Promise<string[]> {
  return call((api) => api.listPropertyKeys(geojson));
}

export function centroidGeoJson(geojson: unknown): Promise<GeometryOpOutcome> {
  return call((api) => api.centroidGeoJson(geojson));
}

export function boundingBoxGeoJson(geojson: unknown): Promise<GeometryOpOutcome> {
  return call((api) => api.boundingBoxGeoJson(geojson));
}

export function convexHullGeoJson(geojson: unknown): Promise<GeometryOpOutcome> {
  return call((api) => api.convexHullGeoJson(geojson));
}

export function featureStatistics(geojson: unknown, crsCode?: string): Promise<FeatureStatistics> {
  return call((api) => api.featureStatistics(geojson, crsCode));
}

export function checkTopology(geojson: unknown): Promise<ValidationIssue[]> {
  return call((api) => api.checkTopology(geojson));
}

// Pure string-matching over column names — no benefit from a worker hop.
export { detectLatLonColumns };

/**
 * The CRS registry and its search are plain in-memory data lookups over a
 * static array — no parsing, no heavy dependency, nothing to offload — so
 * they're re-exported directly rather than routed through the worker, the
 * same call the codebase already makes for `detectLatLonColumns` and
 * `extractFeatureList`. `proj4` itself only ever loads inside the worker.
 */
export {
  CRS_DEFINITIONS,
  COMMON_CRS,
  findCrs,
  searchCrs,
  parseCustomDefinition,
  // Full-catalogue search: lazy-loads the generated EPSG index on first use.
  searchAllCrs,
  findCrsAnywhere,
  loadFullCrsIndex,
  type CrsDefinition,
} from "./ops/crsRegistry";

export type { CrsRef } from "./ops/crs";

export type { BufferUnit } from "./ops/geometry";

export type {
  AttributeStatistic,
  BBox2D,
  CrsDetection,
  FeatureStatistics,
  GeometryOpOutcome,
  ReprojectOutcome,
  CsvColumnGuess,
  CsvToGeoJsonOutcome,
  ElevationProfilePoint,
  GeoJsonSummary,
  GeoJsonToCsvOutcome,
  GpxTrackStats,
  RepairOutcome,
  SimplifyOutcome,
  ValidationIssue,
  ValidationResult,
} from "./types";

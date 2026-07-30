import { exposeEngine } from "@/engines/shared/workerClient";
import { ProcessingError } from "@/lib/errors/ProcessingError";
import { parseCsv } from "@/engines/spreadsheet/parsers/csv";
import type { NormalizedTable } from "@/engines/spreadsheet/types";
import { parseGeoJsonText } from "./ops/parse";
import { summarizeGeoJson as summarize } from "./ops/summarize";
import { validateGeoJson as validate, repairGeoJson as repair } from "./ops/validate";
import { simplifyGeoJson as simplify } from "./ops/simplify";
import { geoJsonToCsv as toCsv } from "./ops/csvExport";
import { csvTableToGeoJson as fromCsvTable } from "./ops/csvImport";
import { reprojectGeoJson as reproject, detectCrs as detect, type CrsRef } from "./ops/crs";
import {
  bufferGeoJson as bufferOp,
  dissolveGeoJson as dissolveOp,
  mergeGeoJson as mergeOp,
  splitMultiGeometry as splitOp,
  listPropertyKeys as listKeys,
  type BufferUnit,
} from "./ops/geometry";
import {
  centroidGeoJson as centroidOp,
  boundingBoxGeoJson as bboxOp,
  convexHullGeoJson as hullOp,
  featureStatistics as statsOp,
} from "./ops/analysis";
import { checkTopology as topologyOp } from "./ops/topology";
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

/**
 * GeoJSON-only operations: none of these touch the DOM, so they run in a
 * real Comlink worker (like the Spreadsheet engine's CSV/XLSX/JSON path).
 * KML/GPX parsing and serialization need DOMParser/XMLSerializer, which
 * don't exist in a Worker — see `engines/geospatial/xml/` for that half.
 */
async function runOrThrowSerialized<T>(fn: () => Promise<T> | T): Promise<T> {
  try {
    return await fn();
  } catch (cause) {
    if (cause instanceof ProcessingError) throw cause.toJSON();
    throw cause;
  }
}

const api = {
  parseGeoJsonFile(file: File): Promise<unknown> {
    return runOrThrowSerialized(async () => parseGeoJsonText(await file.text()));
  },

  summarizeGeoJson(geojson: unknown): Promise<GeoJsonSummary> {
    return runOrThrowSerialized(() => summarize(geojson));
  },

  validateGeoJson(geojson: unknown): Promise<ValidationResult> {
    return runOrThrowSerialized(() => validate(geojson));
  },

  repairGeoJson(geojson: unknown): Promise<RepairOutcome> {
    return runOrThrowSerialized(() => repair(geojson));
  },

  simplifyGeoJson(geojson: unknown, tolerance: number, highQuality: boolean): Promise<SimplifyOutcome> {
    return runOrThrowSerialized(() => simplify(geojson, tolerance, highQuality));
  },

  geoJsonToCsv(geojson: unknown): Promise<GeoJsonToCsvOutcome> {
    return runOrThrowSerialized(() => toCsv(geojson));
  },

  parseCsvFile(file: File): Promise<NormalizedTable> {
    return runOrThrowSerialized(async () => parseCsv(await file.text()));
  },

  csvTableToGeoJson(table: NormalizedTable, latColumn: string, lonColumn: string): Promise<CsvToGeoJsonOutcome> {
    return runOrThrowSerialized(() => fromCsvTable(table, latColumn, lonColumn));
  },

  // --- CRS -----------------------------------------------------------------
  detectCrs(geojson: unknown): Promise<CrsDetection> {
    return runOrThrowSerialized(() => detect(geojson));
  },

  reprojectGeoJson(geojson: unknown, from: CrsRef, to: CrsRef, decimals?: number | null): Promise<ReprojectOutcome> {
    return runOrThrowSerialized(() => reproject(geojson, from, to, decimals));
  },

  // --- Geometry operations -------------------------------------------------
  bufferGeoJson(geojson: unknown, distance: number, unit: BufferUnit): Promise<GeometryOpOutcome> {
    return runOrThrowSerialized(() => bufferOp(geojson, distance, unit));
  },

  dissolveGeoJson(geojson: unknown, propertyName?: string): Promise<GeometryOpOutcome> {
    return runOrThrowSerialized(() => dissolveOp(geojson, propertyName));
  },

  mergeGeoJson(geojson: unknown): Promise<GeometryOpOutcome> {
    return runOrThrowSerialized(() => mergeOp(geojson));
  },

  splitMultiGeometry(geojson: unknown): Promise<GeometryOpOutcome> {
    return runOrThrowSerialized(() => splitOp(geojson));
  },

  listPropertyKeys(geojson: unknown): Promise<string[]> {
    return runOrThrowSerialized(() => listKeys(geojson));
  },

  // --- Analysis ------------------------------------------------------------
  centroidGeoJson(geojson: unknown): Promise<GeometryOpOutcome> {
    return runOrThrowSerialized(() => centroidOp(geojson));
  },

  boundingBoxGeoJson(geojson: unknown): Promise<GeometryOpOutcome> {
    return runOrThrowSerialized(() => bboxOp(geojson));
  },

  convexHullGeoJson(geojson: unknown): Promise<GeometryOpOutcome> {
    return runOrThrowSerialized(() => hullOp(geojson));
  },

  featureStatistics(geojson: unknown, crsCode?: string): Promise<FeatureStatistics> {
    return runOrThrowSerialized(() => statsOp(geojson, crsCode));
  },

  checkTopology(geojson: unknown): Promise<ValidationIssue[]> {
    return runOrThrowSerialized(() => topologyOp(geojson));
  },
};

export type GeospatialWorkerApi = typeof api;

exposeEngine(api);

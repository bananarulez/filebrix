import type { CellValue, NormalizedTable } from "@/engines/spreadsheet/types";

/** [west, south, east, north] — matches GeoJSON's BBox convention (`@turf/bbox`'s return shape). */
export type BBox2D = [number, number, number, number];

export interface GeoJsonSummary {
  featureCount: number;
  /** Geometry type name -> count, e.g. `{ Point: 3, Polygon: 1, null: 2 }` ("null" for features with no geometry). */
  geometryTypeCounts: Record<string, number>;
  bbox: BBox2D | null;
  propertyKeys: string[];
  /** Properties of the first few features, for a quick preview. */
  propertyPreview: Array<Record<string, unknown>>;
  warnings: string[];
}

export type ValidationSeverity = "error" | "warning";

export interface ValidationIssue {
  severity: ValidationSeverity;
  message: string;
  featureIndex?: number;
  autoFixable: boolean;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  canRepair: boolean;
}

export interface RepairOutcome {
  geojson: unknown;
  /** Human-readable descriptions of what changed, e.g. "Closed 3 unclosed polygon ring(s)." */
  changes: string[];
}

export interface SimplifyOutcome {
  geojson: unknown;
  beforeVertexCount: number;
  afterVertexCount: number;
}

export interface GpxTrackStats {
  distanceMeters: number;
  elevationGainMeters: number | null;
  elevationLossMeters: number | null;
  minElevationMeters: number | null;
  maxElevationMeters: number | null;
  pointCount: number;
  hasElevation: boolean;
}

/** One point along a track, used to draw the elevation profile. `distanceMeters` is cumulative from the start. */
export interface ElevationProfilePoint {
  distanceMeters: number;
  elevationMeters: number;
}

/** What `detectCrs` could work out from a document's own metadata. */
export interface CrsDetection {
  detected: boolean;
  /** Canonical code, e.g. "EPSG:5514" — only set when `detected`. */
  code?: string;
  name?: string;
  /** Which member the declaration came from, for explaining the guess in the UI. */
  source?: "crs-member" | "name-member";
  /** The raw string found, even when it couldn't be resolved to a known CRS. */
  raw?: string;
}

export interface ReprojectOutcome {
  geojson: unknown;
  from: string;
  to: string;
  featureCount: number;
  warnings: string[];
}

/**
 * Shared result shape for every derived-geometry operation (buffer, dissolve,
 * merge, split, centroid, bounding box, convex hull) so one UI component can
 * render all of them — the feature counts are what let it show honestly when
 * an operation added or removed features.
 */
export interface GeometryOpOutcome {
  geojson: unknown;
  inputFeatureCount: number;
  outputFeatureCount: number;
  warnings: string[];
}

export interface AttributeStatistic {
  key: string;
  presentCount: number;
  missingCount: number;
  distinctCount: number;
  numeric: boolean;
  min?: number;
  max?: number;
  mean?: number;
}

export interface FeatureStatistics {
  featureCount: number;
  geometryTypeCounts: Record<string, number>;
  nullGeometryCount: number;
  vertexCount: number;
  totalLengthMeters: number;
  totalAreaSquareMeters: number;
  bbox: BBox2D | null;
  /** The CRS these measurements assume — turf treats input as WGS 84 lon/lat. */
  analyzedCrs: string;
  attributes: AttributeStatistic[];
}

export interface CsvColumnGuess {
  latColumn: string | null;
  lonColumn: string | null;
}

export interface CsvToGeoJsonOutcome {
  geojson: unknown;
  warnings: string[];
}

export interface GeoJsonToCsvOutcome {
  blob: Blob;
  warnings: string[];
}

export type { CellValue, NormalizedTable };

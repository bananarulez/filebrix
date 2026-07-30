export type GeoJsonRecord = Record<string, unknown>;

/** Narrows to a plain (non-array) object, the shape every GeoJSON value must have. */
export function asRecord(value: unknown): GeoJsonRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as GeoJsonRecord)
    : null;
}

export const SIMPLE_GEOMETRY_TYPES = new Set([
  "Point",
  "MultiPoint",
  "LineString",
  "MultiLineString",
  "Polygon",
  "MultiPolygon",
]);

export const GEOMETRY_TYPES = new Set([...SIMPLE_GEOMETRY_TYPES, "GeometryCollection"]);

export interface ExtractedFeatures {
  /** Raw, unvalidated `features[]` entries (FeatureCollection) or a single synthesized entry otherwise. */
  features: unknown[];
  isFeatureCollection: boolean;
  /** True when the root was a bare Geometry/GeometryCollection rather than a Feature/FeatureCollection. */
  isBareGeometry: boolean;
}

/**
 * Normalizes the three shapes a top-level GeoJSON document can take
 * (FeatureCollection, single Feature, or a bare Geometry) into one feature
 * list, so summarize/validate/simplify don't each re-implement this
 * dispatch. Returns null when `root.type` isn't a recognized GeoJSON type.
 */
export function extractFeatureList(root: GeoJsonRecord): ExtractedFeatures | null {
  const type = root.type;
  if (type === "FeatureCollection") {
    return {
      features: Array.isArray(root.features) ? root.features : [],
      isFeatureCollection: true,
      isBareGeometry: false,
    };
  }
  if (type === "Feature") {
    return { features: [root], isFeatureCollection: false, isBareGeometry: false };
  }
  if (typeof type === "string" && GEOMETRY_TYPES.has(type)) {
    return {
      features: [{ type: "Feature", geometry: root, properties: {} }],
      isFeatureCollection: false,
      isBareGeometry: true,
    };
  }
  return null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** A GeoJSON `Position` — `[lon, lat]` or `[lon, lat, elevation]`. */
export function isPosition(value: unknown): value is number[] {
  return Array.isArray(value) && value.length >= 2 && value.length <= 3 && value.every(isFiniteNumber);
}

import area from "@turf/area";
import bbox from "@turf/bbox";
import bboxPolygon from "@turf/bbox-polygon";
import centroid from "@turf/centroid";
import convex from "@turf/convex";
import length from "@turf/length";
import { featureCollection } from "@turf/helpers";
import type { Feature, FeatureCollection } from "geojson";
import { ProcessingError } from "@/lib/errors/ProcessingError";
import { asRecord, extractFeatureList, type GeoJsonRecord } from "./shape";
import type { BBox2D, FeatureStatistics, GeometryOpOutcome, AttributeStatistic } from "../types";

/**
 * Derived-geometry and statistics operations. Like `geometry.ts`, everything
 * here is pure JS over plain objects, so it runs in the shared worker.
 *
 * Centroid/BoundingBox/ConvexHull all return a *new* GeoJSON document rather
 * than mutating the input, and all three share `GeometryOpOutcome` with the
 * geometry operations so the UI can render any of them through one code path.
 */

function toFeatureCollection(root: unknown): FeatureCollection {
  const record = asRecord(root);
  if (!record) throw new ProcessingError("MALFORMED_FILE", "This file's contents aren't a GeoJSON object.");

  const extracted = extractFeatureList(record);
  if (!extracted) throw new ProcessingError("MALFORMED_FILE", "Unrecognized GeoJSON type.");

  const features = extracted.features
    .map((entry) => asRecord(entry))
    .filter((entry): entry is GeoJsonRecord => entry !== null)
    .map((entry) => entry as unknown as Feature);

  if (features.length === 0) {
    throw new ProcessingError("MALFORMED_FILE", "This file contains no features to analyze.");
  }
  return featureCollection(features);
}

function withGeometry(collection: FeatureCollection): Feature[] {
  const kept = collection.features.filter((feature) => feature?.geometry != null);
  if (kept.length === 0) {
    throw new ProcessingError("UNSUPPORTED_FORMAT", "Every feature has a null geometry — there's nothing to compute.");
  }
  return kept;
}

/**
 * One centroid point per input feature, each keeping its source feature's
 * properties so the result stays joinable back to the original data.
 */
export function centroidGeoJson(root: unknown): GeometryOpOutcome {
  const collection = toFeatureCollection(root);
  const features = withGeometry(collection);

  const centroids = features.map((feature) => {
    const point = centroid(feature);
    // turf's centroid drops properties; re-attaching them is what makes the
    // output joinable rather than an anonymous cloud of points.
    point.properties = { ...(feature.properties ?? {}) };
    return point;
  });

  const skipped = collection.features.length - features.length;
  const warnings = skipped > 0 ? [`Skipped ${skipped} feature${skipped === 1 ? "" : "s"} with no geometry.`] : [];
  warnings.push(
    "Centroids are the mean of a shape's vertices — for a concave shape the point can fall outside the shape itself."
  );

  return {
    geojson: featureCollection(centroids),
    inputFeatureCount: collection.features.length,
    outputFeatureCount: centroids.length,
    warnings,
  };
}

/** The dataset's overall bounding box, as a single rectangular polygon. */
export function boundingBoxGeoJson(root: unknown): GeometryOpOutcome {
  const collection = toFeatureCollection(root);
  withGeometry(collection);

  const box = bbox(collection) as [number, number, number, number];
  if (!box.every(Number.isFinite)) {
    throw new ProcessingError("UNSUPPORTED_FORMAT", "Could not compute a bounding box for this data.");
  }

  const rectangle = bboxPolygon(box);
  rectangle.properties = {
    west: box[0],
    south: box[1],
    east: box[2],
    north: box[3],
  };

  return {
    geojson: featureCollection([rectangle]),
    inputFeatureCount: collection.features.length,
    outputFeatureCount: 1,
    warnings: [
      "This is the axis-aligned extent of the whole dataset — a single rectangle, not one box per feature.",
    ],
  };
}

/** The smallest convex polygon enclosing every vertex in the dataset. */
export function convexHullGeoJson(root: unknown): GeometryOpOutcome {
  const collection = toFeatureCollection(root);
  withGeometry(collection);

  const hull = convex(collection);
  if (!hull) {
    throw new ProcessingError(
      "UNSUPPORTED_FORMAT",
      "Could not build a convex hull — that needs at least 3 distinct, non-collinear points."
    );
  }

  return {
    geojson: featureCollection([hull]),
    inputFeatureCount: collection.features.length,
    outputFeatureCount: 1,
    warnings: ["Attributes aren't carried over — a hull spans the whole dataset rather than any one feature."],
  };
}

const NUMERIC_SAMPLE_LIMIT = 50_000;

/** Per-attribute summary: how populated it is, and min/max/mean when numeric. */
function summarizeAttributes(features: Feature[]): AttributeStatistic[] {
  const keys = new Set<string>();
  for (const feature of features) {
    for (const key of Object.keys(feature.properties ?? {})) keys.add(key);
  }

  const stats: AttributeStatistic[] = [];
  for (const key of [...keys].sort()) {
    let present = 0;
    const distinct = new Set<string>();
    const numbers: number[] = [];

    for (const feature of features) {
      const value = feature.properties?.[key];
      if (value === undefined || value === null || value === "") continue;
      present += 1;
      if (distinct.size < 1000) distinct.add(String(value));
      if (numbers.length < NUMERIC_SAMPLE_LIMIT) {
        const asNumber = typeof value === "number" ? value : Number(value);
        if (Number.isFinite(asNumber)) numbers.push(asNumber);
      }
    }

    // "Numeric" only if essentially every populated value parsed as a number —
    // a stray "N/A" in a numeric column shouldn't suppress the stats, but a
    // mostly-textual column shouldn't gain meaningless min/max either.
    const isNumeric = present > 0 && numbers.length / present >= 0.9;
    stats.push({
      key,
      presentCount: present,
      missingCount: features.length - present,
      distinctCount: distinct.size,
      numeric: isNumeric,
      min: isNumeric ? Math.min(...numbers) : undefined,
      max: isNumeric ? Math.max(...numbers) : undefined,
      mean: isNumeric ? numbers.reduce((sum, value) => sum + value, 0) / numbers.length : undefined,
    });
  }
  return stats;
}

/**
 * Whole-dataset statistics: counts, geometry-type breakdown, total length and
 * area, extent, and per-attribute summaries.
 *
 * Length and area are computed on the *geodesic* assumption turf uses (input
 * treated as WGS 84 lon/lat), so `crs` is reported alongside them — the
 * numbers are only meaningful for a 4326 document, which is what
 * `analyzedCrs` communicates to the UI.
 */
export function featureStatistics(root: unknown, crsCode = "EPSG:4326"): FeatureStatistics {
  const collection = toFeatureCollection(root);
  const features = collection.features;

  const geometryTypeCounts: Record<string, number> = {};
  let totalLengthMeters = 0;
  let totalAreaSquareMeters = 0;
  let vertexCount = 0;
  let nullGeometryCount = 0;

  for (const feature of features) {
    const geometry = feature?.geometry;
    if (!geometry) {
      nullGeometryCount += 1;
      geometryTypeCounts.null = (geometryTypeCounts.null ?? 0) + 1;
      continue;
    }
    geometryTypeCounts[geometry.type] = (geometryTypeCounts[geometry.type] ?? 0) + 1;
    vertexCount += countPositions(("coordinates" in geometry ? geometry.coordinates : undefined) as unknown);

    try {
      totalLengthMeters += length(feature, { units: "meters" });
    } catch {
      // A geometry turf can't measure (a bare Point, a GeometryCollection)
      // contributes nothing rather than aborting the whole summary.
    }
    try {
      totalAreaSquareMeters += area(feature);
    } catch {
      /* same rationale as above */
    }
  }

  const box = (() => {
    try {
      const computed = bbox(collection) as [number, number, number, number];
      return computed.every(Number.isFinite) ? (computed as BBox2D) : null;
    } catch {
      return null;
    }
  })();

  return {
    featureCount: features.length,
    geometryTypeCounts,
    nullGeometryCount,
    vertexCount,
    totalLengthMeters,
    totalAreaSquareMeters,
    bbox: box,
    analyzedCrs: crsCode,
    attributes: summarizeAttributes(features),
  };
}

/** Counts `[x, y]` positions at any nesting depth, mirroring `simplify.ts`'s own vertex counting. */
function countPositions(coordinates: unknown): number {
  if (!Array.isArray(coordinates)) return 0;
  if (typeof coordinates[0] === "number") return 1;
  let total = 0;
  for (const child of coordinates) total += countPositions(child);
  return total;
}

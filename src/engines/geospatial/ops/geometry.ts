import buffer from "@turf/buffer";
import dissolve from "@turf/dissolve";
import flatten from "@turf/flatten";
import { union } from "@turf/union";
import { featureCollection } from "@turf/helpers";
import type { Feature, FeatureCollection, GeoJsonProperties, Geometry, Polygon, MultiPolygon } from "geojson";
import { ProcessingError } from "@/lib/errors/ProcessingError";
import { asRecord, extractFeatureList, type GeoJsonRecord } from "./shape";
import type { GeometryOpOutcome } from "../types";

/**
 * Geometry operations built on turf. All pure JS over plain objects — no DOM,
 * no network — so they run in the same Comlink worker as validate/simplify.
 *
 * Every operation here normalizes its input through `toFeatureCollection`
 * (which reuses `extractFeatureList`, the same dispatch summarize/validate
 * already use) so a bare Geometry, a single Feature and a FeatureCollection
 * all behave identically, rather than each op re-implementing that branch.
 */

export type BufferUnit = "meters" | "kilometers" | "feet" | "miles";

const BUFFER_UNITS: Record<BufferUnit, string> = {
  meters: "meters",
  kilometers: "kilometers",
  feet: "feet",
  miles: "miles",
};

/** Normalizes any GeoJSON root into a FeatureCollection turf can consume. */
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
    throw new ProcessingError("MALFORMED_FILE", "This file contains no features to process.");
  }
  return featureCollection(features);
}

function countFeatures(collection: FeatureCollection): number {
  return collection.features.length;
}

/**
 * Buffers every feature by a fixed distance.
 *
 * A negative distance shrinks polygons instead of growing them; turf returns
 * `undefined` for any feature that collapses entirely at that distance, which
 * is a legitimate outcome rather than an error — those features are dropped
 * and reported in `warnings` so the count change is never silent.
 */
export function bufferGeoJson(root: unknown, distance: number, unit: BufferUnit): GeometryOpOutcome {
  if (!Number.isFinite(distance)) {
    throw new ProcessingError("UNSUPPORTED_FORMAT", "Buffer distance must be a number.");
  }
  if (distance === 0) {
    throw new ProcessingError("UNSUPPORTED_FORMAT", "Buffer distance can't be zero — nothing would change.");
  }

  const collection = toFeatureCollection(root);
  const warnings: string[] = [];

  let buffered: FeatureCollection | undefined;
  try {
    buffered = buffer(collection, distance, { units: BUFFER_UNITS[unit] as "meters" }) as
      | FeatureCollection
      | undefined;
  } catch (cause) {
    throw new ProcessingError(
      "UNSUPPORTED_FORMAT",
      `Could not buffer this data: ${cause instanceof Error ? cause.message : "unknown error"}`
    );
  }

  const kept = (buffered?.features ?? []).filter((feature) => feature?.geometry != null);
  const dropped = countFeatures(collection) - kept.length;
  if (dropped > 0) {
    warnings.push(
      `${dropped} feature${dropped === 1 ? "" : "s"} disappeared at this distance — a negative buffer removes shapes narrower than twice the distance.`
    );
  }
  if (kept.length === 0) {
    throw new ProcessingError(
      "UNSUPPORTED_FORMAT",
      "Every feature collapsed at this buffer distance. Try a smaller negative distance."
    );
  }

  return {
    geojson: featureCollection(kept),
    inputFeatureCount: countFeatures(collection),
    outputFeatureCount: kept.length,
    warnings,
  };
}

/** Polygon-typed features only — what dissolve/union can actually operate on. */
function polygonFeaturesOf(collection: FeatureCollection): {
  polygons: Feature<Polygon | MultiPolygon>[];
  skipped: number;
} {
  const polygons: Feature<Polygon | MultiPolygon>[] = [];
  let skipped = 0;
  for (const feature of collection.features) {
    const type = feature?.geometry?.type;
    if (type === "Polygon" || type === "MultiPolygon") {
      polygons.push(feature as Feature<Polygon | MultiPolygon>);
    } else {
      skipped += 1;
    }
  }
  return { polygons, skipped };
}

/**
 * Dissolves touching/overlapping polygons into merged shapes, optionally
 * grouping by an attribute so only polygons sharing that value combine.
 *
 * turf's `dissolve` accepts **only** `Polygon` features — a MultiPolygon
 * throws. Since a MultiPolygon is just a container for polygons that are
 * about to be merged anyway, they're flattened first (`@turf/flatten`) rather
 * than rejected, which is what makes this work on real-world data where
 * MultiPolygons are common.
 */
export function dissolveGeoJson(root: unknown, propertyName?: string): GeometryOpOutcome {
  const collection = toFeatureCollection(root);
  const { polygons, skipped } = polygonFeaturesOf(collection);

  if (polygons.length === 0) {
    throw new ProcessingError(
      "UNSUPPORTED_FORMAT",
      "Dissolve needs polygon features — this file has none. (Points and lines can't be dissolved.)"
    );
  }

  const warnings: string[] = [];
  if (skipped > 0) {
    warnings.push(
      `Skipped ${skipped} non-polygon feature${skipped === 1 ? "" : "s"} — dissolve only applies to polygons.`
    );
  }

  // Flatten MultiPolygons into their constituent Polygons (see doc comment).
  const flat: Feature<Polygon>[] = [];
  for (const feature of polygons) {
    if (feature.geometry.type === "Polygon") {
      flat.push(feature as Feature<Polygon>);
      continue;
    }
    for (const part of flatten(feature).features) flat.push(part as Feature<Polygon>);
  }

  if (propertyName) {
    const missing = flat.filter((feature) => feature.properties?.[propertyName] === undefined).length;
    if (missing === flat.length) {
      throw new ProcessingError(
        "UNSUPPORTED_FORMAT",
        `No polygon has a "${propertyName}" property, so there's nothing to group by.`
      );
    }
    if (missing > 0) {
      warnings.push(
        `${missing} polygon${missing === 1 ? "" : "s"} had no "${propertyName}" value — those are dissolved together as one group.`
      );
    }
  }

  let dissolved: FeatureCollection;
  try {
    dissolved = dissolve(featureCollection(flat), propertyName ? { propertyName } : undefined) as FeatureCollection;
  } catch (cause) {
    throw new ProcessingError(
      "UNSUPPORTED_FORMAT",
      `Could not dissolve these polygons: ${cause instanceof Error ? cause.message : "unknown error"}. Invalid or self-intersecting polygons are the usual cause — try the Validate action first.`
    );
  }

  if (propertyName) {
    warnings.push(`Only the "${propertyName}" property is carried through; other attributes are dropped by a dissolve.`);
  } else if (dissolved.features.length < flat.length) {
    warnings.push("Attributes of merged polygons are dropped — a dissolved shape has no single source feature.");
  }

  return {
    geojson: dissolved,
    inputFeatureCount: countFeatures(collection),
    outputFeatureCount: dissolved.features.length,
    warnings,
  };
}

/**
 * Merges every feature into a single one.
 *
 * For polygons this is a real geometric union (overlaps become one outline);
 * for mixed or non-polygon input a true union is undefined, so the features
 * are instead combined into one `GeometryCollection` feature — stated in
 * `warnings` rather than silently doing something different from what
 * "merge" implies.
 */
export function mergeGeoJson(root: unknown): GeometryOpOutcome {
  const collection = toFeatureCollection(root);
  const warnings: string[] = [];

  if (collection.features.length === 1) {
    warnings.push("This file already contains a single feature — nothing to merge.");
    return {
      geojson: collection,
      inputFeatureCount: 1,
      outputFeatureCount: 1,
      warnings,
    };
  }

  const { polygons, skipped } = polygonFeaturesOf(collection);

  if (skipped === 0 && polygons.length > 1) {
    let merged: Feature<Polygon | MultiPolygon> | null = null;
    try {
      merged = union(featureCollection(polygons)) as Feature<Polygon | MultiPolygon> | null;
    } catch (cause) {
      throw new ProcessingError(
        "UNSUPPORTED_FORMAT",
        `Could not merge these polygons: ${cause instanceof Error ? cause.message : "unknown error"}`
      );
    }
    if (merged) {
      warnings.push("Attributes were dropped — a merged polygon has no single source feature.");
      return {
        geojson: featureCollection([merged]),
        inputFeatureCount: collection.features.length,
        outputFeatureCount: 1,
        warnings,
      };
    }
  }

  const geometries = collection.features
    .map((feature) => feature.geometry)
    .filter((geometry): geometry is Geometry => geometry != null);

  if (geometries.length === 0) {
    throw new ProcessingError("UNSUPPORTED_FORMAT", "Every feature has a null geometry — nothing to merge.");
  }

  warnings.push(
    skipped > 0
      ? "Mixed geometry types can't be geometrically unioned, so they were combined into one GeometryCollection feature instead."
      : "These geometries were combined into one GeometryCollection feature."
  );
  warnings.push("Attributes were dropped — a merged feature has no single source feature.");

  const combined: Feature<Geometry, GeoJsonProperties> = {
    type: "Feature",
    properties: {},
    geometry: { type: "GeometryCollection", geometries } as Geometry,
  };

  return {
    geojson: featureCollection([combined]),
    inputFeatureCount: collection.features.length,
    outputFeatureCount: 1,
    warnings,
  };
}

/**
 * Explodes multi-part geometries into one feature per part —
 * MultiPolygon → Polygon, MultiLineString → LineString, MultiPoint → Point.
 *
 * `@turf/flatten` copies each source feature's `properties` onto every part
 * it produces, so attributes are duplicated across the split rather than
 * lost — the behaviour a GIS user expects from "explode".
 */
export function splitMultiGeometry(root: unknown): GeometryOpOutcome {
  const collection = toFeatureCollection(root);

  const multiCount = collection.features.filter((feature) =>
    typeof feature?.geometry?.type === "string" && feature.geometry.type.startsWith("Multi")
  ).length;
  const collectionCount = collection.features.filter(
    (feature) => feature?.geometry?.type === "GeometryCollection"
  ).length;

  let flattened: FeatureCollection;
  try {
    flattened = flatten(collection) as FeatureCollection;
  } catch (cause) {
    throw new ProcessingError(
      "UNSUPPORTED_FORMAT",
      `Could not split these geometries: ${cause instanceof Error ? cause.message : "unknown error"}`
    );
  }

  const warnings: string[] = [];
  if (multiCount === 0 && collectionCount === 0) {
    warnings.push("No multi-part geometries were found — every feature was already a single part.");
  } else {
    warnings.push(
      `Split ${multiCount} multi-part geometr${multiCount === 1 ? "y" : "ies"} — each part keeps a copy of its source feature's properties.`
    );
  }
  if (collectionCount > 0) {
    warnings.push(
      `${collectionCount} GeometryCollection feature${collectionCount === 1 ? " was" : "s were"} also split into their constituent geometries.`
    );
  }

  return {
    geojson: flattened,
    inputFeatureCount: countFeatures(collection),
    outputFeatureCount: flattened.features.length,
    warnings,
  };
}

/** Property keys that appear on at least one feature — drives Dissolve's "by attribute" picker. */
export function listPropertyKeys(root: unknown): string[] {
  const collection = toFeatureCollection(root);
  const keys = new Set<string>();
  for (const feature of collection.features) {
    for (const key of Object.keys(feature.properties ?? {})) keys.add(key);
  }
  return [...keys].sort();
}

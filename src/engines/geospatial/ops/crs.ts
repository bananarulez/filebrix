import proj4 from "proj4";
import { ProcessingError } from "@/lib/errors/ProcessingError";
import { asRecord, isPosition, SIMPLE_GEOMETRY_TYPES, type GeoJsonRecord } from "./shape";
import { findCrs, parseCustomDefinition, type CrsDefinition } from "./crsRegistry";
import type { CrsDetection, ReprojectOutcome } from "../types";

/**
 * CRS transformation, built on proj4 — pure number crunching over the
 * coordinate arrays, no network access of any kind (proj4 ships every
 * definition it needs as a string; see `crsRegistry.ts` for why the set of
 * definitions is curated rather than a full EPSG database).
 *
 * The transform walks the document itself rather than going through turf,
 * because turf's helpers normalize away exactly what has to survive here:
 * every feature's `properties`, its `id`, any foreign members, and the
 * precise geometry type (including `GeometryCollection`, which most turf
 * operations refuse outright). Only the innermost `[x, y]` pairs change.
 */

/**
 * How a caller names a CRS. A bare string is a code (`"EPSG:4326"`) or a raw
 * proj4/WKT definition; the object form carries both, which is what the UI
 * sends once it has resolved a code against the lazily-loaded full EPSG
 * catalogue. That form is why the worker never needs the catalogue itself —
 * it receives the definition already resolved, and only has to project.
 */
export type CrsRef = string | { code: string; proj4: string };

/** Resolves an identifier or a raw proj4/WKT string into something proj4 can use. */
export function resolveCrs(reference: CrsRef): CrsDefinition {
  if (typeof reference === "object") {
    return {
      code: reference.code,
      name: reference.code,
      aliases: [],
      proj4: reference.proj4,
      unit: /\+proj=longlat|\+units=deg/i.test(reference.proj4) ? "degree" : "metre",
    };
  }

  const identifier = reference;
  const known = findCrs(identifier);
  if (known) return known;

  const custom = parseCustomDefinition(identifier);
  if (!custom) {
    throw new ProcessingError("UNSUPPORTED_FORMAT", "No coordinate reference system was specified.");
  }
  // Let proj4 be the judge of whether the pasted string is usable — a
  // definition it can't parse throws here, with its own message, rather than
  // failing later mid-transform with a confusing per-coordinate error.
  try {
    proj4(custom.proj4);
  } catch {
    throw new ProcessingError(
      "UNSUPPORTED_FORMAT",
      `"${identifier}" isn't a CRS this app knows, and isn't a valid proj4 or WKT definition either.`
    );
  }
  return custom;
}

/**
 * Reads a CRS declaration out of a GeoJSON document.
 *
 * GeoJSON's `crs` member was removed in RFC 7946 (2016), which fixed the
 * format at WGS 84 lon/lat — but files written against the older 2008 spec
 * still carry it, and those are exactly the files that need reprojecting, so
 * it's read when present. A file with no `crs` member is reported as
 * undetected rather than silently assumed to be WGS 84: assuming would
 * quietly produce wrong output for the projected-coordinate files this tool
 * exists to handle, whereas asking is a one-click cost.
 */
export function detectCrs(root: unknown): CrsDetection {
  const record = asRecord(root);
  if (!record) return { detected: false };

  const crsMember = asRecord(record.crs);
  if (crsMember) {
    const properties = asRecord(crsMember.properties);
    const raw = properties?.name ?? properties?.href ?? crsMember.name;
    if (typeof raw === "string") {
      const match = findCrs(raw);
      if (match) return { detected: true, code: match.code, name: match.name, source: "crs-member", raw };
      return { detected: false, raw };
    }
  }

  // Some exporters (notably older ogr2ogr output) put the EPSG code in a
  // top-level "name" alongside the features instead of a real crs member.
  if (typeof record.name === "string") {
    const match = findCrs(record.name);
    if (match) return { detected: true, code: match.code, name: match.name, source: "name-member", raw: record.name };
  }

  return { detected: false };
}

type Transformer = (position: number[]) => number[];

function makeTransformer(from: CrsDefinition, to: CrsDefinition): Transformer {
  let converter: proj4.Converter;
  try {
    converter = proj4(from.proj4, to.proj4);
  } catch {
    throw new ProcessingError(
      "UNSUPPORTED_FORMAT",
      `Could not build a transformation from ${from.code} to ${to.code}.`
    );
  }

  return (position) => {
    const [x, y] = position;
    const [outX, outY] = converter.forward([x, y]) as [number, number];
    if (!Number.isFinite(outX) || !Number.isFinite(outY)) {
      throw new ProcessingError(
        "UNSUPPORTED_FORMAT",
        `A coordinate (${x}, ${y}) falls outside the valid area of ${from.code} → ${to.code} and can't be transformed.`
      );
    }
    // A third ordinate (elevation) is carried through untouched — these are
    // horizontal transformations only; see the tool's own copy for the caveat.
    return position.length > 2 ? [outX, outY, position[2]] : [outX, outY];
  };
}

/** Rounds to a fixed number of decimals without going through string formatting twice. */
function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * Recursively maps every position in a coordinate tree, preserving its exact
 * nesting depth — which is what keeps Point/LineString/Polygon/Multi* and
 * their ring structure intact without a per-type branch.
 */
function mapCoordinates(coordinates: unknown, transform: Transformer, decimals: number | null): unknown {
  if (isPosition(coordinates)) {
    const moved = transform(coordinates);
    return decimals === null ? moved : moved.map((value) => round(value, decimals));
  }
  if (Array.isArray(coordinates)) {
    return coordinates.map((child) => mapCoordinates(child, transform, decimals));
  }
  return coordinates;
}

function transformGeometry(geometry: GeoJsonRecord, transform: Transformer, decimals: number | null): void {
  if (geometry.type === "GeometryCollection") {
    if (!Array.isArray(geometry.geometries)) return;
    for (const child of geometry.geometries) {
      const childRecord = asRecord(child);
      if (childRecord) transformGeometry(childRecord, transform, decimals);
    }
    return;
  }
  if (typeof geometry.type === "string" && SIMPLE_GEOMETRY_TYPES.has(geometry.type)) {
    geometry.coordinates = mapCoordinates(geometry.coordinates, transform, decimals);
  }
}

/**
 * Reprojects a whole GeoJSON document from one CRS to another.
 *
 * Everything except coordinate values survives verbatim: the operation runs
 * on a `structuredClone` of the input and mutates only `coordinates` arrays
 * in place, so `properties`, feature `id`s, geometry types, ring winding and
 * any foreign members are carried through by construction rather than by
 * being copied field by field.
 *
 * @param decimals Coordinate precision for the output. Defaults to a
 *   unit-appropriate value (9 for degrees ≈ sub-millimetre, 4 for metres ≈
 *   0.1 mm) rather than leaving full float noise in the file; pass `null` to
 *   keep every digit.
 */
export function reprojectGeoJson(
  root: unknown,
  fromIdentifier: CrsRef,
  toIdentifier: CrsRef,
  decimals?: number | null
): ReprojectOutcome {
  const record = asRecord(root);
  if (!record) {
    throw new ProcessingError("MALFORMED_FILE", "This file's contents aren't a GeoJSON object.");
  }

  const from = resolveCrs(fromIdentifier);
  const to = resolveCrs(toIdentifier);

  const clone = structuredClone(record) as GeoJsonRecord;
  const warnings: string[] = [];

  if (from.code === to.code && from.code !== "Custom") {
    warnings.push(`Source and target are both ${from.code} — coordinates were left unchanged.`);
    return { geojson: clone, from: from.code, to: to.code, featureCount: countFeatures(clone), warnings };
  }

  const precision = decimals === undefined ? (to.unit === "degree" ? 9 : 4) : decimals;
  const transform = makeTransformer(from, to);

  let featureCount = 0;
  if (clone.type === "FeatureCollection" && Array.isArray(clone.features)) {
    for (const feature of clone.features) {
      const featureRecord = asRecord(feature);
      if (!featureRecord) continue;
      featureCount += 1;
      const geometry = asRecord(featureRecord.geometry);
      if (geometry) transformGeometry(geometry, transform, precision);
    }
  } else if (clone.type === "Feature") {
    featureCount = 1;
    const geometry = asRecord(clone.geometry);
    if (geometry) transformGeometry(geometry, transform, precision);
  } else {
    featureCount = 1;
    transformGeometry(clone, transform, precision);
  }

  /**
   * A reprojected document is no longer WGS 84 lon/lat, so RFC 7946's
   * "GeoJSON is always 4326" guarantee stops holding. The 2008-style `crs`
   * member is the only way GeoJSON can say so at all, so it's written back
   * for any non-4326 target (and stripped when the target *is* 4326, where
   * its absence is now correct rather than merely conventional).
   */
  if (to.code === "EPSG:4326") {
    delete clone.crs;
  } else {
    clone.crs = { type: "name", properties: { name: `urn:ogc:def:crs:${to.code.replace(":", "::")}` } };
    warnings.push(
      `Output is in ${to.code}, not WGS 84 — most GeoJSON readers assume WGS 84 lon/lat, so this file records its CRS in a legacy "crs" member that newer readers ignore.`
    );
  }

  return { geojson: clone, from: from.code, to: to.code, featureCount, warnings };
}

function countFeatures(root: GeoJsonRecord): number {
  if (root.type === "FeatureCollection" && Array.isArray(root.features)) return root.features.length;
  return 1;
}

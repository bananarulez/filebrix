import kinks from "@turf/kinks";
import type { Feature, LineString, MultiLineString, MultiPolygon, Polygon } from "geojson";
import { asRecord, extractFeatureList } from "./shape";
import type { ValidationIssue } from "../types";

/**
 * Geometric (topological) validation, as opposed to the *structural*
 * validation in `validate.ts`.
 *
 * The split is deliberate and matters: `validate.ts` answers "is this
 * well-formed GeoJSON?" by walking the document shape, and its findings map
 * onto safe automatic repairs. The checks here answer "is this geometry
 * sane?" — self-intersections, repeated vertices, degenerate rings, wrong
 * ring winding — which are real GIS problems that mostly *cannot* be fixed
 * unambiguously, so they're reported separately and only the genuinely safe
 * subset is marked `autoFixable` (i.e. handled by the existing
 * `repairGeoJson`, never by new speculative geometry surgery).
 */

const MAX_ISSUES = 200;

type RingCarrier = Polygon | MultiPolygon;

function ringsOf(geometry: RingCarrier): number[][][] {
  return geometry.type === "Polygon"
    ? (geometry.coordinates as number[][][])
    : (geometry.coordinates as number[][][][]).flat();
}

/** Signed area of a closed ring (shoelace). Positive = counter-clockwise. */
function signedArea(ring: number[][]): number {
  let total = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    total += x1 * y2 - x2 * y1;
  }
  return total / 2;
}

function positionsEqual(a: number[], b: number[]): boolean {
  return a[0] === b[0] && a[1] === b[1];
}

/**
 * Runs the geometric checks over a whole document.
 *
 * Returns issues in the same `ValidationIssue` shape `validate.ts` produces,
 * so the UI renders both lists through one component rather than two.
 */
export function checkTopology(root: unknown): ValidationIssue[] {
  const record = asRecord(root);
  if (!record) return [];
  const extracted = extractFeatureList(record);
  if (!extracted) return [];

  const issues: ValidationIssue[] = [];
  let truncated = false;

  const add = (issue: ValidationIssue) => {
    if (issues.length >= MAX_ISSUES) {
      truncated = true;
      return;
    }
    issues.push(issue);
  };

  extracted.features.forEach((entry, index) => {
    const feature = asRecord(entry);
    if (!feature) return;
    const featureIndex = extracted.isFeatureCollection ? index : undefined;
    const geometry = asRecord(feature.geometry);
    if (!geometry || typeof geometry.type !== "string") return;

    checkGeometry(geometry as unknown as Feature["geometry"], featureIndex, add);
  });

  if (truncated) {
    issues.push({
      severity: "warning",
      message: `Stopped after ${MAX_ISSUES} geometry issues — this dataset has more than shown here.`,
      autoFixable: false,
    });
  }
  return issues;
}

function checkGeometry(
  geometry: Feature["geometry"],
  featureIndex: number | undefined,
  add: (issue: ValidationIssue) => void
): void {
  if (!geometry) return;

  if (geometry.type === "GeometryCollection") {
    for (const child of geometry.geometries) checkGeometry(child, featureIndex, add);
    return;
  }

  const label = featureIndex === undefined ? "The geometry" : `Feature ${featureIndex}`;

  if (geometry.type === "LineString" || geometry.type === "MultiLineString") {
    checkDuplicateVertices(geometry, label, featureIndex, add);
    checkSelfIntersection(geometry, label, featureIndex, add);
    return;
  }

  if (geometry.type === "Polygon" || geometry.type === "MultiPolygon") {
    checkDuplicateVertices(geometry, label, featureIndex, add);
    checkSelfIntersection(geometry, label, featureIndex, add);
    checkRings(geometry, label, featureIndex, add);
  }
}

/**
 * `@turf/kinks` finds points where a line or ring crosses itself — the single
 * most common cause of a polygon being rejected by downstream GIS tools (and
 * of turf's own dissolve/union throwing).
 */
function checkSelfIntersection(
  geometry: LineString | MultiLineString | Polygon | MultiPolygon,
  label: string,
  featureIndex: number | undefined,
  add: (issue: ValidationIssue) => void
): void {
  let crossings = 0;
  try {
    crossings = kinks({ type: "Feature", properties: {}, geometry } as Feature<typeof geometry>).features.length;
  } catch {
    return; // Degenerate input — the structural/ring checks already cover it.
  }
  if (crossings === 0) return;

  add({
    severity: "error",
    message: `${label} intersects itself at ${crossings} point${crossings === 1 ? "" : "s"}. Self-intersecting geometry is invalid and will break area, buffer and dissolve operations.`,
    featureIndex,
    // Resolving a self-intersection means choosing which of several valid
    // shapes the author meant — never safe to guess, so never auto-fixed.
    autoFixable: false,
  });
}

function checkDuplicateVertices(
  geometry: LineString | MultiLineString | Polygon | MultiPolygon,
  label: string,
  featureIndex: number | undefined,
  add: (issue: ValidationIssue) => void
): void {
  const lines: number[][][] =
    geometry.type === "LineString"
      ? [geometry.coordinates as number[][]]
      : geometry.type === "MultiLineString"
        ? (geometry.coordinates as number[][][])
        : ringsOf(geometry);

  let duplicates = 0;
  for (const line of lines) {
    for (let i = 0; i < line.length - 1; i++) {
      if (positionsEqual(line[i], line[i + 1])) duplicates += 1;
    }
  }
  if (duplicates === 0) return;

  add({
    severity: "warning",
    message: `${label} has ${duplicates} consecutive duplicate vertex${duplicates === 1 ? "" : "es"} — harmless to render, but they inflate file size and can confuse topology checks.`,
    featureIndex,
    autoFixable: false,
  });
}

/**
 * Ring-level polygon topology: degenerate rings (too few distinct points to
 * enclose an area) and zero-area rings.
 *
 * **Ring winding order is deliberately not checked.** RFC 7946 specifies
 * counter-clockwise exteriors and clockwise holes, and an earlier version of
 * this file reported violations as warnings — but that made ordinary,
 * working files look defective: this project's own `sample.geojson` fixture,
 * hand-written and valid by every practical measure, has a clockwise
 * exterior ring, and so does a large share of real-world data. Nothing in
 * this app's pipeline cares (MapLibre ignores winding; so do turf's
 * measurement and overlay operations), so a warning nobody can act on and
 * nothing is broken by is pure noise — and noise here is expensive, because
 * it devalues the self-intersection and degenerate-ring findings that *do*
 * matter. Keeping "a clean file reports no problems" true is worth more than
 * flagging a spec detail with no practical consequence.
 */
function checkRings(
  geometry: RingCarrier,
  label: string,
  featureIndex: number | undefined,
  add: (issue: ValidationIssue) => void
): void {
  const isMulti = geometry.type === "MultiPolygon";
  const polygons: number[][][][] = isMulti
    ? (geometry.coordinates as number[][][][])
    : [geometry.coordinates as number[][][]];

  for (const polygon of polygons) {
    polygon.forEach((ring) => {
      const distinct = new Set(ring.map((position) => `${position[0]},${position[1]}`));
      if (distinct.size < 3) {
        add({
          severity: "error",
          message: `${label} has a degenerate ring with only ${distinct.size} distinct point${distinct.size === 1 ? "" : "s"} — a ring needs at least 3 to enclose an area.`,
          featureIndex,
          autoFixable: false,
        });
        return;
      }

      if (signedArea(ring) === 0) {
        add({
          severity: "error",
          message: `${label} has a ring enclosing zero area (all points are collinear).`,
          featureIndex,
          autoFixable: false,
        });
      }
    });
  }
}

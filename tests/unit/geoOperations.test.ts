import { describe, expect, it } from "vitest";
import {
  bufferGeoJson,
  dissolveGeoJson,
  listPropertyKeys,
  mergeGeoJson,
  splitMultiGeometry,
} from "@/engines/geospatial/ops/geometry";
import {
  boundingBoxGeoJson,
  centroidGeoJson,
  convexHullGeoJson,
  featureStatistics,
} from "@/engines/geospatial/ops/analysis";
import { checkTopology } from "@/engines/geospatial/ops/topology";
import { ProcessingError } from "@/lib/errors/ProcessingError";

type Fc = { type: string; features: Array<{ properties: Record<string, unknown>; geometry: { type: string; coordinates: unknown } }> };

function fc(...features: unknown[]) {
  return { type: "FeatureCollection", features };
}
function poly(ring: number[][], properties: Record<string, unknown> = {}) {
  return { type: "Feature", properties, geometry: { type: "Polygon", coordinates: [ring] } };
}
function point(coordinates: number[], properties: Record<string, unknown> = {}) {
  return { type: "Feature", properties, geometry: { type: "Point", coordinates } };
}

/** Two unit squares sharing an edge at x=1 — they dissolve into one 2x1 rectangle. */
const SQUARE_A = [[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]];
const SQUARE_B = [[1, 0], [2, 0], [2, 1], [1, 1], [1, 0]];
/** A separate square far away, so it can never merge with the two above. */
const SQUARE_FAR = [[10, 10], [11, 10], [11, 11], [10, 11], [10, 10]];

describe("bufferGeoJson", () => {
  it("grows a polygon with a positive distance", () => {
    const out = bufferGeoJson(fc(poly(SQUARE_A)), 10, "kilometers");
    expect(out.outputFeatureCount).toBe(1);
    const ring = ((out.geojson as Fc).features[0].geometry.coordinates as number[][][])[0];
    // Every buffered vertex must lie outside the original 0..1 box.
    const minX = Math.min(...ring.map((p) => p[0]));
    expect(minX).toBeLessThan(0);
  });

  it("buffers points into polygons", () => {
    const out = bufferGeoJson(fc(point([0, 0])), 1, "kilometers");
    expect((out.geojson as Fc).features[0].geometry.type).toMatch(/Polygon/);
  });

  it("shrinks a polygon with a negative distance", () => {
    const big = [[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]];
    const out = bufferGeoJson(fc(poly(big)), -10, "kilometers");
    const ring = ((out.geojson as Fc).features[0].geometry.coordinates as number[][][])[0];
    expect(Math.min(...ring.map((p) => p[0]))).toBeGreaterThan(0);
  });

  it("reports features that vanish under an aggressive negative buffer", () => {
    // A ~1 degree square shrunk by 200 km collapses entirely.
    expect(() => bufferGeoJson(fc(poly(SQUARE_A)), -200, "kilometers")).toThrow(ProcessingError);
  });

  it("rejects a zero or non-finite distance", () => {
    expect(() => bufferGeoJson(fc(poly(SQUARE_A)), 0, "meters")).toThrow(ProcessingError);
    expect(() => bufferGeoJson(fc(poly(SQUARE_A)), Number.NaN, "meters")).toThrow(ProcessingError);
  });
});

describe("dissolveGeoJson", () => {
  it("merges two polygons sharing an edge into one", () => {
    const out = dissolveGeoJson(fc(poly(SQUARE_A), poly(SQUARE_B)));
    expect(out.inputFeatureCount).toBe(2);
    expect(out.outputFeatureCount).toBe(1);
  });

  it("keeps disjoint polygons separate", () => {
    const out = dissolveGeoJson(fc(poly(SQUARE_A), poly(SQUARE_FAR)));
    expect(out.outputFeatureCount).toBe(2);
  });

  it("groups by an attribute when one is given", () => {
    // A and B touch but have different regions, so they must NOT merge.
    const out = dissolveGeoJson(
      fc(poly(SQUARE_A, { region: "north" }), poly(SQUARE_B, { region: "south" })),
      "region"
    );
    expect(out.outputFeatureCount).toBe(2);
  });

  it("flattens MultiPolygons rather than rejecting them (turf's dissolve is Polygon-only)", () => {
    const multi = {
      type: "Feature",
      properties: {},
      geometry: { type: "MultiPolygon", coordinates: [[SQUARE_A], [SQUARE_B]] },
    };
    const out = dissolveGeoJson(fc(multi));
    expect(out.outputFeatureCount).toBe(1);
  });

  it("skips non-polygon features and says so", () => {
    const out = dissolveGeoJson(fc(poly(SQUARE_A), poly(SQUARE_B), point([5, 5])));
    expect(out.warnings.join(" ")).toMatch(/non-polygon/i);
  });

  it("throws a clear error when there are no polygons at all", () => {
    expect(() => dissolveGeoJson(fc(point([0, 0])))).toThrow(/polygon/i);
  });

  it("throws when the group-by property exists on nothing", () => {
    expect(() => dissolveGeoJson(fc(poly(SQUARE_A)), "nope")).toThrow(/nothing to group by/i);
  });
});

describe("mergeGeoJson", () => {
  it("unions touching polygons into a single feature", () => {
    const out = mergeGeoJson(fc(poly(SQUARE_A), poly(SQUARE_B)));
    expect(out.outputFeatureCount).toBe(1);
    expect(out.warnings.join(" ")).toMatch(/attributes were dropped/i);
  });

  it("falls back to a GeometryCollection for mixed geometry types", () => {
    const out = mergeGeoJson(fc(poly(SQUARE_A), point([5, 5])));
    expect(out.outputFeatureCount).toBe(1);
    expect((out.geojson as Fc).features[0].geometry.type).toBe("GeometryCollection");
    expect(out.warnings.join(" ")).toMatch(/GeometryCollection/);
  });

  it("is a no-op for a single feature, and says so", () => {
    const out = mergeGeoJson(fc(poly(SQUARE_A)));
    expect(out.outputFeatureCount).toBe(1);
    expect(out.warnings.join(" ")).toMatch(/already contains a single feature/i);
  });
});

describe("splitMultiGeometry", () => {
  it.each([
    ["MultiPolygon", [[SQUARE_A], [SQUARE_FAR]], "Polygon"],
    ["MultiLineString", [[[0, 0], [1, 1]], [[2, 2], [3, 3]]], "LineString"],
    ["MultiPoint", [[0, 0], [1, 1]], "Point"],
  ])("splits %s into %s parts", (type, coordinates, expectedType) => {
    const input = fc({ type: "Feature", properties: { name: "x" }, geometry: { type, coordinates } });
    const out = splitMultiGeometry(input);
    expect(out.inputFeatureCount).toBe(1);
    expect(out.outputFeatureCount).toBe(2);
    for (const feature of (out.geojson as Fc).features) {
      expect(feature.geometry.type).toBe(expectedType);
      // Attributes are duplicated onto each part, not lost.
      expect(feature.properties.name).toBe("x");
    }
  });

  it("says nothing changed when there are no multi-part geometries", () => {
    const out = splitMultiGeometry(fc(poly(SQUARE_A)));
    expect(out.outputFeatureCount).toBe(1);
    expect(out.warnings.join(" ")).toMatch(/no multi-part/i);
  });
});

describe("listPropertyKeys", () => {
  it("returns the union of every feature's property keys, sorted", () => {
    const keys = listPropertyKeys(fc(poly(SQUARE_A, { b: 1, a: 2 }), poly(SQUARE_B, { c: 3 })));
    expect(keys).toEqual(["a", "b", "c"]);
  });
});

describe("analysis operations", () => {
  it("centroid produces one point per feature and keeps its properties", () => {
    const out = centroidGeoJson(fc(poly(SQUARE_A, { name: "A" }), poly(SQUARE_FAR, { name: "B" })));
    expect(out.outputFeatureCount).toBe(2);
    const features = (out.geojson as Fc).features;
    expect(features[0].geometry.type).toBe("Point");
    expect(features.map((f) => f.properties.name)).toEqual(["A", "B"]);
  });

  it("bounding box spans the whole dataset as one rectangle", () => {
    const out = boundingBoxGeoJson(fc(poly(SQUARE_A), poly(SQUARE_FAR)));
    expect(out.outputFeatureCount).toBe(1);
    const properties = (out.geojson as Fc).features[0].properties;
    expect(properties).toMatchObject({ west: 0, south: 0, east: 11, north: 11 });
  });

  it("convex hull encloses all input points", () => {
    const out = convexHullGeoJson(fc(point([0, 0]), point([4, 0]), point([0, 4]), point([1, 1])));
    expect(out.outputFeatureCount).toBe(1);
    expect((out.geojson as Fc).features[0].geometry.type).toBe("Polygon");
  });

  it("convex hull fails clearly on collinear input", () => {
    expect(() => convexHullGeoJson(fc(point([0, 0]), point([1, 1])))).toThrow(/at least 3/i);
  });
});

describe("featureStatistics", () => {
  it("counts features, geometry types and vertices", () => {
    const stats = featureStatistics(fc(poly(SQUARE_A), point([5, 5])));
    expect(stats.featureCount).toBe(2);
    expect(stats.geometryTypeCounts).toEqual({ Polygon: 1, Point: 1 });
    expect(stats.vertexCount).toBe(6); // 5-position ring + 1 point
  });

  it("reports total area and length, and the CRS they assume", () => {
    const stats = featureStatistics(fc(poly(SQUARE_A)));
    expect(stats.totalAreaSquareMeters).toBeGreaterThan(0);
    expect(stats.analyzedCrs).toBe("EPSG:4326");
  });

  it("summarizes numeric attributes with min/max/mean", () => {
    const stats = featureStatistics(
      fc(poly(SQUARE_A, { pop: 10 }), poly(SQUARE_FAR, { pop: 30 }))
    );
    const pop = stats.attributes.find((attribute) => attribute.key === "pop")!;
    expect(pop).toMatchObject({ numeric: true, min: 10, max: 30, mean: 20, presentCount: 2 });
  });

  it("treats a mostly-textual column as non-numeric", () => {
    const stats = featureStatistics(fc(poly(SQUARE_A, { name: "a" }), poly(SQUARE_FAR, { name: "b" })));
    const name = stats.attributes.find((attribute) => attribute.key === "name")!;
    expect(name.numeric).toBe(false);
    expect(name.min).toBeUndefined();
    expect(name.distinctCount).toBe(2);
  });

  it("counts missing values per attribute", () => {
    const stats = featureStatistics(fc(poly(SQUARE_A, { pop: 5 }), poly(SQUARE_FAR, {})));
    const pop = stats.attributes.find((attribute) => attribute.key === "pop")!;
    expect(pop.presentCount).toBe(1);
    expect(pop.missingCount).toBe(1);
  });

  it("counts null-geometry features separately without throwing", () => {
    const stats = featureStatistics(
      fc(poly(SQUARE_A), { type: "Feature", properties: {}, geometry: null })
    );
    expect(stats.nullGeometryCount).toBe(1);
    expect(stats.geometryTypeCounts.null).toBe(1);
  });
});

describe("checkTopology", () => {
  it("detects a self-intersecting (bow-tie) polygon", () => {
    const bowTie = [[0, 0], [2, 2], [2, 0], [0, 2], [0, 0]];
    const issues = checkTopology(fc(poly(bowTie)));
    expect(issues.some((issue) => /intersects itself/i.test(issue.message))).toBe(true);
    // Never auto-fixable — resolving it means guessing which shape was meant.
    expect(issues.filter((issue) => /intersects itself/i.test(issue.message))[0].autoFixable).toBe(false);
  });

  it("detects consecutive duplicate vertices", () => {
    const dup = [[0, 0], [1, 0], [1, 0], [1, 1], [0, 0]];
    const issues = checkTopology(fc(poly(dup)));
    expect(issues.some((issue) => /duplicate vertex/i.test(issue.message))).toBe(true);
  });

  it("detects a degenerate ring with too few distinct points", () => {
    const degenerate = [[0, 0], [1, 1], [0, 0], [0, 0]];
    const issues = checkTopology(fc(poly(degenerate)));
    expect(issues.some((issue) => /degenerate ring/i.test(issue.message))).toBe(true);
  });

  it("detects a zero-area (collinear) ring", () => {
    const collinear = [[0, 0], [1, 1], [2, 2], [0, 0]];
    const issues = checkTopology(fc(poly(collinear)));
    expect(issues.some((issue) => /zero area/i.test(issue.message))).toBe(true);
  });

  it("deliberately says nothing about ring winding order", () => {
    // RFC 7946 wants counter-clockwise exteriors, but nothing in this app's
    // pipeline cares and a large share of real files (including this repo's
    // own sample.geojson) wind the other way — warning about it would make
    // working files look broken. See checkRings' doc comment.
    const clockwise = [[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]];
    expect(checkTopology(fc(poly(clockwise)))).toEqual([]);
  });

  it("reports nothing for a clean counter-clockwise polygon", () => {
    expect(checkTopology(fc(poly(SQUARE_A)))).toEqual([]);
  });

  it("carries the feature index so issues can be traced back", () => {
    const bowTie = [[0, 0], [2, 2], [2, 0], [0, 2], [0, 0]];
    const issues = checkTopology(fc(poly(SQUARE_A), poly(bowTie)));
    expect(issues[0].featureIndex).toBe(1);
  });
});

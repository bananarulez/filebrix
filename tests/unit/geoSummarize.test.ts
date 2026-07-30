import { describe, expect, it } from "vitest";
import { summarizeGeoJson } from "@/engines/geospatial/ops/summarize";
import { ProcessingError } from "@/lib/errors/ProcessingError";

const sample = {
  type: "FeatureCollection",
  features: [
    { type: "Feature", properties: { name: "A", kind: "point" }, geometry: { type: "Point", coordinates: [10, 20] } },
    {
      type: "Feature",
      properties: { name: "B" },
      geometry: { type: "Polygon", coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
    },
    { type: "Feature", properties: {}, geometry: null },
  ],
};

describe("summarizeGeoJson", () => {
  it("counts features and geometry types, including null geometries", () => {
    const summary = summarizeGeoJson(sample);
    expect(summary.featureCount).toBe(3);
    expect(summary.geometryTypeCounts).toEqual({ Point: 1, Polygon: 1, null: 1 });
  });

  it("computes a bounding box across every feature", () => {
    const summary = summarizeGeoJson(sample);
    expect(summary.bbox).toEqual([0, 0, 10, 20]);
  });

  it("collects the union of property keys and a preview", () => {
    const summary = summarizeGeoJson(sample);
    expect(summary.propertyKeys.sort()).toEqual(["kind", "name"]);
    expect(summary.propertyPreview.length).toBeGreaterThan(0);
  });

  it("handles a single bare Feature (not a FeatureCollection)", () => {
    const summary = summarizeGeoJson(sample.features[0]);
    expect(summary.featureCount).toBe(1);
    expect(summary.geometryTypeCounts).toEqual({ Point: 1 });
  });

  it("handles a bare Geometry at the document root", () => {
    const summary = summarizeGeoJson({ type: "Point", coordinates: [1, 2] });
    expect(summary.featureCount).toBe(1);
    expect(summary.geometryTypeCounts).toEqual({ Point: 1 });
  });

  it("does not crash on a LineString crossing the antimeridian", () => {
    const antimeridian = {
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates: [[179, 10], [-179, 10]] },
    };
    const summary = summarizeGeoJson(antimeridian);
    // Plain min/max bbox across the antimeridian — a known GeoJSON/turf
    // limitation, not a bug: it's wide, not wrapped, but must not throw.
    expect(summary.bbox).toEqual([-179, 10, 179, 10]);
  });

  it("throws a MALFORMED_FILE ProcessingError for an unrecognized root type", () => {
    expect(() => summarizeGeoJson({ type: "NotAThing" })).toThrow(ProcessingError);
    try {
      summarizeGeoJson({ type: "NotAThing" });
    } catch (error) {
      expect((error as ProcessingError).code).toBe("MALFORMED_FILE");
    }
  });

  it("throws for non-object input", () => {
    expect(() => summarizeGeoJson("not an object")).toThrow(ProcessingError);
    expect(() => summarizeGeoJson(null)).toThrow(ProcessingError);
  });

  it("handles a large feature collection without excessive delay", () => {
    const features = Array.from({ length: 20000 }, (_, i) => ({
      type: "Feature",
      properties: { id: i },
      geometry: { type: "Point", coordinates: [(i % 360) - 180, (i % 170) - 85] },
    }));
    const start = Date.now();
    const summary = summarizeGeoJson({ type: "FeatureCollection", features });
    expect(summary.featureCount).toBe(20000);
    expect(Date.now() - start).toBeLessThan(5000);
  });
});

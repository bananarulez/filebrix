import { describe, expect, it } from "vitest";
import { parseGeoJsonText } from "@/engines/geospatial/ops/parse";
import { asRecord, extractFeatureList, isPosition } from "@/engines/geospatial/ops/shape";
import { ProcessingError } from "@/lib/errors/ProcessingError";

describe("parseGeoJsonText", () => {
  it("parses a valid GeoJSON object", () => {
    expect(parseGeoJsonText('{"type":"FeatureCollection","features":[]}')).toEqual({
      type: "FeatureCollection",
      features: [],
    });
  });

  it("throws MALFORMED_FILE for text that isn't valid JSON at all", () => {
    expect(() => parseGeoJsonText("{not json")).toThrow(ProcessingError);
    expect(() => parseGeoJsonText("")).toThrow(ProcessingError);
  });

  it("throws MALFORMED_FILE for a JSON array root (valid JSON, not a GeoJSON container)", () => {
    expect(() => parseGeoJsonText("[1,2,3]")).toThrow(ProcessingError);
  });

  it("throws MALFORMED_FILE for a JSON null or primitive root", () => {
    expect(() => parseGeoJsonText("null")).toThrow(ProcessingError);
    expect(() => parseGeoJsonText("42")).toThrow(ProcessingError);
    expect(() => parseGeoJsonText('"just a string"')).toThrow(ProcessingError);
  });
});

describe("asRecord", () => {
  it("accepts a plain object", () => {
    expect(asRecord({ a: 1 })).toEqual({ a: 1 });
  });

  it("rejects null, arrays, and primitives", () => {
    expect(asRecord(null)).toBeNull();
    expect(asRecord([1, 2])).toBeNull();
    expect(asRecord("string")).toBeNull();
    expect(asRecord(42)).toBeNull();
    expect(asRecord(undefined)).toBeNull();
  });
});

describe("extractFeatureList", () => {
  it("extracts features from a FeatureCollection, defaulting to [] when features is missing/invalid", () => {
    const withFeatures = extractFeatureList({ type: "FeatureCollection", features: [{ id: 1 }] });
    expect(withFeatures).toEqual({ features: [{ id: 1 }], isFeatureCollection: true, isBareGeometry: false });

    const missingFeatures = extractFeatureList({ type: "FeatureCollection" });
    expect(missingFeatures?.features).toEqual([]);

    const nonArrayFeatures = extractFeatureList({ type: "FeatureCollection", features: "oops" });
    expect(nonArrayFeatures?.features).toEqual([]);
  });

  it("wraps a single Feature as a one-element list", () => {
    const feature = { type: "Feature", geometry: null, properties: {} };
    expect(extractFeatureList(feature)).toEqual({
      features: [feature],
      isFeatureCollection: false,
      isBareGeometry: false,
    });
  });

  it("synthesizes a Feature wrapper for a bare geometry type", () => {
    const point = { type: "Point", coordinates: [1, 2] };
    const result = extractFeatureList(point);
    expect(result?.isBareGeometry).toBe(true);
    expect(result?.features).toEqual([{ type: "Feature", geometry: point, properties: {} }]);
  });

  it("recognizes every simple geometry type and GeometryCollection as bare geometry", () => {
    for (const type of [
      "Point",
      "MultiPoint",
      "LineString",
      "MultiLineString",
      "Polygon",
      "MultiPolygon",
      "GeometryCollection",
    ]) {
      expect(extractFeatureList({ type })?.isBareGeometry).toBe(true);
    }
  });

  it("returns null for an unrecognized or missing type", () => {
    expect(extractFeatureList({ type: "NotAThing" })).toBeNull();
    expect(extractFeatureList({})).toBeNull();
    expect(extractFeatureList({ type: 42 })).toBeNull();
  });
});

describe("isPosition", () => {
  it("accepts [lon, lat] and [lon, lat, elevation]", () => {
    expect(isPosition([1, 2])).toBe(true);
    expect(isPosition([1, 2, 3])).toBe(true);
  });

  it("rejects wrong-length arrays, non-finite numbers, and non-arrays", () => {
    expect(isPosition([1])).toBe(false);
    expect(isPosition([1, 2, 3, 4])).toBe(false);
    expect(isPosition([1, NaN])).toBe(false);
    expect(isPosition([1, Infinity])).toBe(false);
    expect(isPosition(["1", "2"])).toBe(false);
    expect(isPosition(null)).toBe(false);
    expect(isPosition("1,2")).toBe(false);
  });
});

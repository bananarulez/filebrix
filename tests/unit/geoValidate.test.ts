import { describe, expect, it } from "vitest";
import { repairGeoJson, validateGeoJson } from "@/engines/geospatial/ops/validate";

describe("validateGeoJson", () => {
  it("reports no errors for a well-formed FeatureCollection", () => {
    const result = validateGeoJson({
      type: "FeatureCollection",
      features: [
        { type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [1, 2] } },
      ],
    });
    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.canRepair).toBe(false);
  });

  it("flags an unrecognized root type as an error", () => {
    const result = validateGeoJson({ type: "Bogus" });
    expect(result.valid).toBe(false);
    expect(result.issues[0].severity).toBe("error");
    expect(result.issues[0].autoFixable).toBe(false);
  });

  it("flags an unclosed polygon ring as an auto-fixable warning", () => {
    const result = validateGeoJson({
      type: "Feature",
      properties: {},
      geometry: { type: "Polygon", coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1]]] },
    });
    const ringIssue = result.issues.find((issue) => issue.message.includes("isn't closed"));
    expect(ringIssue).toBeDefined();
    expect(ringIssue?.severity).toBe("warning");
    expect(ringIssue?.autoFixable).toBe(true);
    expect(result.canRepair).toBe(true);
    expect(result.valid).toBe(true); // a warning alone doesn't make the file invalid
  });

  it("flags a missing properties member as an auto-fixable warning", () => {
    const result = validateGeoJson({
      type: "FeatureCollection",
      features: [{ type: "Feature", geometry: { type: "Point", coordinates: [1, 2] } }],
    });
    const issue = result.issues.find((i) => i.message.includes('"properties"'));
    expect(issue?.autoFixable).toBe(true);
    expect(result.canRepair).toBe(true);
  });

  it("flags an out-of-range coordinate as a non-fixable warning", () => {
    const result = validateGeoJson({
      type: "Feature",
      properties: {},
      geometry: { type: "Point", coordinates: [200, 100] },
    });
    const issue = result.issues.find((i) => i.message.includes("out of range"));
    expect(issue?.severity).toBe("warning");
    expect(issue?.autoFixable).toBe(false);
  });

  it("flags a polygon ring with too few positions as an error", () => {
    const result = validateGeoJson({
      type: "Feature",
      properties: {},
      geometry: { type: "Polygon", coordinates: [[[0, 0], [1, 0], [0, 0]]] },
    });
    expect(result.valid).toBe(false);
  });

  it("flags malformed coordinate nesting as an error, not a crash", () => {
    const result = validateGeoJson({
      type: "Feature",
      properties: {},
      geometry: { type: "Point", coordinates: "not-an-array" },
    });
    expect(result.valid).toBe(false);
  });

  it("rejects a nested GeometryCollection", () => {
    const result = validateGeoJson({
      type: "GeometryCollection",
      geometries: [{ type: "GeometryCollection", geometries: [] }],
    });
    expect(result.valid).toBe(false);
  });

  it("handles a FeatureCollection whose features member isn't an array", () => {
    const result = validateGeoJson({ type: "FeatureCollection", features: "nope" });
    expect(result.valid).toBe(false);
  });

  it("does not throw for wildly malformed input", () => {
    expect(() => validateGeoJson(null)).not.toThrow();
    expect(() => validateGeoJson("just a string")).not.toThrow();
    expect(() => validateGeoJson(42)).not.toThrow();
    expect(validateGeoJson(null).valid).toBe(false);
  });
});

describe("repairGeoJson", () => {
  it("closes unclosed polygon rings and reports the change", () => {
    const input = {
      type: "Feature",
      properties: {},
      geometry: { type: "Polygon", coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1]]] },
    };
    const { geojson, changes } = repairGeoJson(input);
    expect(changes.some((c) => c.includes("Closed 1 unclosed polygon ring"))).toBe(true);
    const ring = (geojson as { geometry: { coordinates: number[][][] } }).geometry.coordinates[0];
    expect(ring[0]).toEqual(ring[ring.length - 1]);
    // never mutates the caller's original object
    expect(input.geometry.coordinates[0].length).toBe(4);
  });

  it("adds a missing properties: null and reports the change", () => {
    const input = {
      type: "FeatureCollection",
      features: [{ type: "Feature", geometry: { type: "Point", coordinates: [1, 2] } }],
    };
    const { geojson, changes } = repairGeoJson(input);
    expect(changes.some((c) => c.includes("properties"))).toBe(true);
    const repairedFeature = (geojson as { features: Array<{ properties: unknown }> }).features[0];
    expect(repairedFeature.properties).toBeNull();
    expect("properties" in input.features[0]).toBe(false);
  });

  it("reports no changes when nothing needed fixing", () => {
    const input = {
      type: "Feature",
      properties: {},
      geometry: { type: "Point", coordinates: [1, 2] },
    };
    const { changes } = repairGeoJson(input);
    expect(changes).toEqual([]);
  });
});

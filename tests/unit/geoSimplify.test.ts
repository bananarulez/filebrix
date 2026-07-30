import { describe, expect, it } from "vitest";
import { simplifyGeoJson } from "@/engines/geospatial/ops/simplify";
import { ProcessingError } from "@/lib/errors/ProcessingError";

function wigglyLine(pointCount: number): { type: "Feature"; properties: object; geometry: { type: "LineString"; coordinates: number[][] } } {
  const coordinates: number[][] = [];
  for (let i = 0; i < pointCount; i += 1) {
    coordinates.push([i * 0.001, Math.sin(i / 3) * 0.0001]);
  }
  return { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates } };
}

describe("simplifyGeoJson", () => {
  it("reduces vertex count for a dense, near-straight line at a generous tolerance", () => {
    const line = wigglyLine(500);
    const outcome = simplifyGeoJson(line, 0.01, false);
    expect(outcome.beforeVertexCount).toBe(500);
    expect(outcome.afterVertexCount).toBeLessThan(outcome.beforeVertexCount);
    expect(outcome.afterVertexCount).toBeGreaterThanOrEqual(2);
  });

  it("keeps a FeatureCollection's shape (feature count) — only vertices are reduced", () => {
    const fc = {
      type: "FeatureCollection",
      features: [wigglyLine(100), wigglyLine(100)],
    };
    const outcome = simplifyGeoJson(fc, 0.01, false);
    const result = outcome.geojson as { features: unknown[] };
    expect(result.features.length).toBe(2);
  });

  it("a near-zero tolerance leaves the vertex count effectively unchanged", () => {
    const line = wigglyLine(50);
    const outcome = simplifyGeoJson(line, 0.0000001, false);
    expect(outcome.afterVertexCount).toBe(outcome.beforeVertexCount);
  });

  it("throws a ProcessingError for structurally invalid GeoJSON rather than crashing", () => {
    expect(() =>
      simplifyGeoJson({ type: "Feature", properties: {}, geometry: { type: "NotAGeometry", coordinates: [1, 2] } }, 0.01, false)
    ).toThrow(ProcessingError);
  });

  it("throws for non-object input", () => {
    expect(() => simplifyGeoJson(null, 0.01, false)).toThrow(ProcessingError);
  });
});

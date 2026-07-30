import { describe, expect, it } from "vitest";
import { geoJsonToCsv } from "@/engines/geospatial/ops/csvExport";
import { csvTableToGeoJson, detectLatLonColumns } from "@/engines/geospatial/ops/csvImport";
import type { NormalizedTable } from "@/engines/spreadsheet/types";

describe("geoJsonToCsv", () => {
  it("produces one row per feature with a representative point and property columns", async () => {
    const { blob, warnings } = geoJsonToCsv({
      type: "FeatureCollection",
      features: [
        { type: "Feature", properties: { name: "A" }, geometry: { type: "Point", coordinates: [10, 20] } },
        {
          type: "Feature",
          properties: { name: "B" },
          geometry: { type: "Polygon", coordinates: [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]] },
        },
      ],
    });
    const text = await blob.text();
    expect(text).toContain("geometry_type,longitude,latitude,name");
    expect(text).toContain("Point,10,20,A");
    // Polygon's representative point is the bbox center: (0+2)/2, (0+2)/2
    expect(text).toContain("Polygon,1,1,B");
    expect(warnings).toEqual([]);
  });

  it("leaves lon/lat blank and warns for features with no usable geometry", async () => {
    const { blob, warnings } = geoJsonToCsv({
      type: "FeatureCollection",
      features: [{ type: "Feature", properties: {}, geometry: null }],
    });
    const text = await blob.text();
    expect(text).toContain("null,,");
    expect(warnings.length).toBe(1);
  });
});

describe("detectLatLonColumns", () => {
  it("recognizes common header names case-insensitively", () => {
    expect(detectLatLonColumns(["Latitude", "Longitude", "name"])).toEqual({
      latColumn: "Latitude",
      lonColumn: "Longitude",
    });
    expect(detectLatLonColumns(["lat", "lng"])).toEqual({ latColumn: "lat", lonColumn: "lng" });
  });

  it("returns nulls when nothing matches", () => {
    expect(detectLatLonColumns(["foo", "bar"])).toEqual({ latColumn: null, lonColumn: null });
  });
});

describe("csvTableToGeoJson", () => {
  const table: NormalizedTable = {
    columns: ["name", "lat", "lon"],
    rows: [
      ["Store A", 40.7128, -74.006],
      ["Store B", "51.5074", "-0.1278"],
      ["Bad row", "not-a-number", -74.006],
      ["Out of range", 999, -74.006],
    ],
    warnings: [],
  };

  it("builds a Point FeatureCollection from selected columns, skipping bad rows", () => {
    const { geojson, warnings } = csvTableToGeoJson(table, "lat", "lon");
    const fc = geojson as { type: string; features: Array<{ geometry: { coordinates: number[] }; properties: Record<string, unknown> }> };
    expect(fc.type).toBe("FeatureCollection");
    expect(fc.features.length).toBe(2);
    expect(fc.features[0].geometry.coordinates).toEqual([-74.006, 40.7128]);
    expect(fc.features[0].properties).toEqual({ name: "Store A" });
    expect(warnings.some((w) => w.includes("skipped"))).toBe(true);
  });

  it("throws a ProcessingError when the chosen columns don't exist", () => {
    expect(() => csvTableToGeoJson(table, "missing", "lon")).toThrow();
  });
});

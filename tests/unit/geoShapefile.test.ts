import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { shapefileZipToGeoJson } from "@/engines/geospatial/import/shapefile";
import { topoJsonTextToGeoJson } from "@/engines/geospatial/import/topojson";
import { ProcessingError } from "@/lib/errors/ProcessingError";

const FIXTURES = path.resolve(__dirname, "..", "fixtures", "geo");

function zipFixture(name: string): File {
  const bytes = readFileSync(path.join(FIXTURES, name));
  return new File([new Uint8Array(bytes)], name, { type: "application/zip" });
}

interface FeatureCollection {
  type: string;
  features: {
    geometry: { type: string; coordinates: unknown };
    properties: Record<string, unknown> | null;
  }[];
}

/** Every coordinate pair in a geometry, however deeply nested. */
function coordinatePairs(coordinates: unknown): [number, number][] {
  if (!Array.isArray(coordinates)) return [];
  if (typeof coordinates[0] === "number" && typeof coordinates[1] === "number") {
    return [[coordinates[0], coordinates[1]]];
  }
  return coordinates.flatMap((entry) => coordinatePairs(entry));
}

describe("shapefile import", () => {
  it("reads geometry and .dbf attributes from a zipped shapefile", async () => {
    const result = (await shapefileZipToGeoJson(zipFixture("shapefile-wgs84.zip"))) as FeatureCollection;

    expect(result.type).toBe("FeatureCollection");
    expect(result.features).toHaveLength(2);
    // Attributes come from the .dbf sidecar — a reader that only opened the
    // .shp would produce geometry with no properties at all.
    expect(result.features[0]!.properties).toMatchObject({ name: "Prague", rank: 1 });
    expect(result.features[1]!.properties).toMatchObject({ name: "Brno" });
  });

  /**
   * The load-bearing test for this whole feature.
   *
   * The fixture is authored in EPSG:5514 (Czech Krovak) by pyshp, so its raw
   * coordinates are around (-743000, -1044000) *metres*. If the `.prj`
   * sidecar were ignored, those numbers would pass straight through and the
   * shape would land nowhere near Earth. Asserting a real lon/lat range —
   * rather than "some geometry came back" — is what actually proves the
   * reprojection happened.
   */
  it("reprojects a projected shapefile to WGS84 using its .prj", async () => {
    const result = (await shapefileZipToGeoJson(zipFixture("shapefile-krovak.zip"))) as FeatureCollection;

    expect(result.features).toHaveLength(1);
    const pairs = coordinatePairs(result.features[0]!.geometry.coordinates);
    expect(pairs.length).toBeGreaterThan(3);

    for (const [lon, lat] of pairs) {
      // Prague, give or take the square's own 1 km extent.
      expect(lon).toBeGreaterThan(14.3);
      expect(lon).toBeLessThan(14.6);
      expect(lat).toBeGreaterThan(50.0);
      expect(lat).toBeLessThan(50.2);
    }
  });

  it("leaves coordinates alone when there is no .prj to reproject from", async () => {
    // Without a .prj the only safe assumption is that the data is already in
    // longitude/latitude. Guessing a projection would silently move it.
    const result = (await shapefileZipToGeoJson(zipFixture("shapefile-no-prj.zip"))) as FeatureCollection;
    expect(result.features[0]!.geometry.coordinates).toEqual([14.4378, 50.0755]);
  });

  it("gives a clear error for a ZIP that contains no shapefile", async () => {
    await expect(shapefileZipToGeoJson(zipFixture("not-a-shapefile.zip"))).rejects.toThrow(ProcessingError);
    await expect(shapefileZipToGeoJson(zipFixture("not-a-shapefile.zip"))).rejects.toThrow(/\.shp/);
  });
});

describe("topojson import", () => {
  /** A minimal topology: one square, described through arcs rather than coordinates. */
  const TOPOLOGY = JSON.stringify({
    type: "Topology",
    objects: {
      shapes: {
        type: "GeometryCollection",
        geometries: [{ type: "Polygon", arcs: [[0]], properties: { name: "square" } }],
      },
    },
    arcs: [
      [
        [0, 0],
        [1, 0],
        [0, 1],
        [-1, 0],
        [0, -1],
      ],
    ],
    transform: { scale: [1, 1], translate: [10, 40] },
  });

  it("converts a topology into a GeoJSON FeatureCollection", async () => {
    const result = (await topoJsonTextToGeoJson(TOPOLOGY)) as FeatureCollection;

    expect(result.type).toBe("FeatureCollection");
    expect(result.features).toHaveLength(1);
    expect(result.features[0]!.geometry.type).toBe("Polygon");
    expect(result.features[0]!.properties).toMatchObject({ name: "square" });

    // Arcs are delta-encoded against `transform`, so decoding them wrongly
    // produces coordinates near the origin instead of near (10, 40).
    const [firstLon, firstLat] = coordinatePairs(result.features[0]!.geometry.coordinates)[0]!;
    expect(firstLon).toBeCloseTo(10, 5);
    expect(firstLat).toBeCloseTo(40, 5);
  });

  it("rejects JSON that isn't a topology, with a message that says why", async () => {
    await expect(topoJsonTextToGeoJson('{"type":"FeatureCollection","features":[]}')).rejects.toThrow(
      /Topology/
    );
  });

  it("rejects malformed JSON separately from valid-JSON-but-not-TopoJSON", async () => {
    await expect(topoJsonTextToGeoJson("{ not json")).rejects.toThrow(/valid JSON/);
  });
});

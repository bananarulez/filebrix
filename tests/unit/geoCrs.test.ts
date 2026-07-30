import { describe, expect, it } from "vitest";
import { detectCrs, reprojectGeoJson, resolveCrs } from "@/engines/geospatial/ops/crs";
import { COMMON_CRS, findCrs, searchCrs, parseCustomDefinition } from "@/engines/geospatial/ops/crsRegistry";
import { ProcessingError } from "@/lib/errors/ProcessingError";

/** Prague castle, WGS 84 lon/lat. */
const PRAGUE: [number, number] = [14.4006, 50.09];
/** London, Charing Cross. */
const LONDON: [number, number] = [-0.1275, 51.5072];

function pointFeature(coordinates: [number, number], properties: Record<string, unknown> = {}) {
  return {
    type: "FeatureCollection",
    features: [{ type: "Feature", properties, geometry: { type: "Point", coordinates } }],
  };
}

function firstPoint(geojson: unknown): number[] {
  const fc = geojson as { features: Array<{ geometry: { coordinates: number[] } }> };
  return fc.features[0].geometry.coordinates;
}

describe("CRS registry search", () => {
  it("finds a CRS by exact EPSG code, bare number, and URN form", () => {
    expect(findCrs("EPSG:4326")?.code).toBe("EPSG:4326");
    expect(findCrs("4326")?.code).toBe("EPSG:4326");
    expect(findCrs("urn:ogc:def:crs:EPSG::5514")?.code).toBe("EPSG:5514");
    expect(findCrs("http://www.opengis.net/gcs/EPSG/0/27700")?.code).toBe("EPSG:27700");
  });

  it("treats OGC:CRS84 as WGS 84 (GeoJSON's own lon/lat ordering)", () => {
    expect(findCrs("OGC:CRS84")?.code).toBe("EPSG:4326");
    expect(findCrs("urn:ogc:def:crs:OGC:1.3:CRS84")?.code).toBe("EPSG:4326");
  });

  it("searches by name and by alias", () => {
    expect(searchCrs("web mercator").map((crs) => crs.code)).toContain("EPSG:3857");
    expect(searchCrs("krovak").map((crs) => crs.code)).toContain("EPSG:5514");
    expect(searchCrs("british national grid").map((crs) => crs.code)).toContain("EPSG:27700");
    expect(searchCrs("czech").map((crs) => crs.code)).toContain("EPSG:5514");
  });

  it("ranks an exact code match ahead of looser matches", () => {
    expect(searchCrs("3857")[0].code).toBe("EPSG:3857");
  });

  it("returns the common quick-select list for an empty query", () => {
    expect(searchCrs("").map((crs) => crs.code)).toEqual(COMMON_CRS.map((crs) => crs.code));
  });

  it("exposes exactly the four CRS the product spec calls out as common", () => {
    expect(COMMON_CRS.map((crs) => crs.code)).toEqual([
      "EPSG:4326",
      "EPSG:3857",
      "EPSG:5514",
      "EPSG:25833",
    ]);
  });

  it("accepts a pasted proj4 string as a custom definition", () => {
    expect(parseCustomDefinition("  ")).toBeNull();
    expect(resolveCrs("+proj=longlat +datum=WGS84 +no_defs").code).toBe("Custom");
  });

  it("rejects a string that is neither a known CRS nor a valid definition", () => {
    expect(() => resolveCrs("not-a-real-crs")).toThrow(ProcessingError);
  });
});

/**
 * Reference values cross-checked against published coordinates for these
 * landmarks. Tolerances are metres, not exact equality — the point is that
 * the projection is genuinely correct, which a wrong `lon_0`/datum would
 * miss by kilometres. (An earlier draft of the Krovak definition used
 * `lon_0=42.5` and landed ~1,200 km away; that is exactly what these catch.)
 */
describe("reprojectGeoJson — known reference coordinates", () => {
  it("WGS 84 -> Web Mercator (EPSG:3857)", () => {
    const out = reprojectGeoJson(pointFeature(PRAGUE), "EPSG:4326", "EPSG:3857");
    const [x, y] = firstPoint(out.geojson);
    expect(x).toBeCloseTo(1603067, -2);
    expect(y).toBeCloseTo(6461877, -2);
  });

  it("WGS 84 -> S-JTSK / Krovak East North (EPSG:5514)", () => {
    const out = reprojectGeoJson(pointFeature(PRAGUE), "EPSG:4326", "EPSG:5514");
    const [x, y] = firstPoint(out.geojson);
    // Prague sits near (-744 km, -1043 km) in S-JTSK.
    expect(x).toBeGreaterThan(-746_000);
    expect(x).toBeLessThan(-742_000);
    expect(y).toBeGreaterThan(-1_044_000);
    expect(y).toBeLessThan(-1_041_000);
  });

  it("WGS 84 -> ETRS89 / UTM 33N (EPSG:25833)", () => {
    const out = reprojectGeoJson(pointFeature(PRAGUE), "EPSG:4326", "EPSG:25833");
    const [x, y] = firstPoint(out.geojson);
    expect(x).toBeCloseTo(457123, -2);
    expect(y).toBeCloseTo(5548809, -2);
  });

  it("WGS 84 -> British National Grid (EPSG:27700)", () => {
    const out = reprojectGeoJson(pointFeature(LONDON), "EPSG:4326", "EPSG:27700");
    const [x, y] = firstPoint(out.geojson);
    expect(x).toBeCloseTo(530050, -2);
    expect(y).toBeCloseTo(180358, -2);
  });

  it("round-trips back to the original coordinates", () => {
    for (const target of ["EPSG:3857", "EPSG:5514", "EPSG:25833", "EPSG:27700"]) {
      const there = reprojectGeoJson(pointFeature(PRAGUE), "EPSG:4326", target, null);
      const back = reprojectGeoJson(there.geojson, target, "EPSG:4326", null);
      const [lon, lat] = firstPoint(back.geojson);
      expect(lon).toBeCloseTo(PRAGUE[0], 6);
      expect(lat).toBeCloseTo(PRAGUE[1], 6);
    }
  });
});

describe("reprojectGeoJson — data preservation", () => {
  it("preserves feature properties and id verbatim", () => {
    const input = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          id: "abc-123",
          properties: { name: "Castle", visitors: 42, nested: { a: [1, 2] } },
          geometry: { type: "Point", coordinates: PRAGUE },
        },
      ],
    };
    const out = reprojectGeoJson(input, "EPSG:4326", "EPSG:3857");
    const feature = (out.geojson as { features: Array<Record<string, unknown>> }).features[0];
    expect(feature.id).toBe("abc-123");
    expect(feature.properties).toEqual({ name: "Castle", visitors: 42, nested: { a: [1, 2] } });
  });

  it("never mutates the input document", () => {
    const input = pointFeature(PRAGUE);
    const snapshot = JSON.parse(JSON.stringify(input));
    reprojectGeoJson(input, "EPSG:4326", "EPSG:3857");
    expect(input).toEqual(snapshot);
  });

  it.each([
    ["Point", [14.4, 50.1]],
    ["MultiPoint", [[14.4, 50.1], [14.5, 50.2]]],
    ["LineString", [[14.4, 50.1], [14.5, 50.2]]],
    ["MultiLineString", [[[14.4, 50.1], [14.5, 50.2]]]],
    ["Polygon", [[[14.4, 50.1], [14.5, 50.1], [14.5, 50.2], [14.4, 50.1]]]],
    ["MultiPolygon", [[[[14.4, 50.1], [14.5, 50.1], [14.5, 50.2], [14.4, 50.1]]]]],
  ])("preserves the %s geometry type and its nesting depth", (type, coordinates) => {
    const input = {
      type: "FeatureCollection",
      features: [{ type: "Feature", properties: {}, geometry: { type, coordinates } }],
    };
    const out = reprojectGeoJson(input, "EPSG:4326", "EPSG:3857");
    const geometry = (out.geojson as { features: Array<{ geometry: { type: string; coordinates: unknown } }> })
      .features[0].geometry;

    expect(geometry.type).toBe(type);
    const depth = (value: unknown): number => (Array.isArray(value) ? 1 + depth(value[0]) : 0);
    expect(depth(geometry.coordinates)).toBe(depth(coordinates));
  });

  it("transforms every geometry inside a GeometryCollection", () => {
    const input = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "GeometryCollection",
        geometries: [
          { type: "Point", coordinates: PRAGUE },
          { type: "LineString", coordinates: [PRAGUE, [14.5, 50.2]] },
        ],
      },
    };
    const out = reprojectGeoJson(input, "EPSG:4326", "EPSG:3857");
    const geometry = (out.geojson as { geometry: { type: string; geometries: Array<{ coordinates: unknown }> } })
      .geometry;

    expect(geometry.type).toBe("GeometryCollection");
    expect((geometry.geometries[0].coordinates as number[])[0]).toBeCloseTo(1603067, -2);
    expect(((geometry.geometries[1].coordinates as number[][])[0])[0]).toBeCloseTo(1603067, -2);
  });

  it("carries a third ordinate (elevation) through untouched", () => {
    const input = {
      type: "Feature",
      properties: {},
      geometry: { type: "Point", coordinates: [14.4006, 50.09, 235.5] },
    };
    const out = reprojectGeoJson(input, "EPSG:4326", "EPSG:3857");
    const coordinates = (out.geojson as { geometry: { coordinates: number[] } }).geometry.coordinates;
    expect(coordinates).toHaveLength(3);
    expect(coordinates[2]).toBe(235.5);
  });

  it("writes a legacy crs member for a non-WGS84 target and strips it for 4326", () => {
    const projected = reprojectGeoJson(pointFeature(PRAGUE), "EPSG:4326", "EPSG:5514");
    expect((projected.geojson as { crs?: { properties: { name: string } } }).crs?.properties.name).toContain("5514");
    expect(projected.warnings.join(" ")).toMatch(/not WGS 84/i);

    const back = reprojectGeoJson(projected.geojson, "EPSG:5514", "EPSG:4326");
    expect((back.geojson as { crs?: unknown }).crs).toBeUndefined();
  });

  it("leaves coordinates untouched when source and target match", () => {
    const out = reprojectGeoJson(pointFeature(PRAGUE), "EPSG:4326", "EPSG:4326");
    expect(firstPoint(out.geojson)).toEqual(PRAGUE);
    expect(out.warnings.join(" ")).toMatch(/left unchanged/i);
  });
});

describe("detectCrs", () => {
  it("reads a legacy crs member", () => {
    const detection = detectCrs({
      type: "FeatureCollection",
      crs: { type: "name", properties: { name: "urn:ogc:def:crs:EPSG::5514" } },
      features: [],
    });
    expect(detection).toMatchObject({ detected: true, code: "EPSG:5514", source: "crs-member" });
  });

  it("reports not-detected for a plain RFC 7946 document", () => {
    expect(detectCrs(pointFeature(PRAGUE)).detected).toBe(false);
  });

  it("reports not-detected but returns the raw string for an unknown CRS name", () => {
    const detection = detectCrs({
      type: "FeatureCollection",
      crs: { type: "name", properties: { name: "EPSG:999999" } },
      features: [],
    });
    expect(detection.detected).toBe(false);
    expect(detection.raw).toBe("EPSG:999999");
  });
});

/**
 * The curated registry is the instant path; this is the depth behind it.
 * `scripts/generate-epsg-index.mjs` trims the `epsg-index` dev dependency
 * (~16 MB, never shipped) into a ~140 KB gzipped index the app lazy-loads on
 * the first real search.
 */
describe("full EPSG catalogue", () => {
  it("loads thousands of CRS, far beyond the curated list", async () => {
    const { loadFullCrsIndex } = await import("@/engines/geospatial/ops/crsRegistry");
    const all = await loadFullCrsIndex();
    expect(all.length).toBeGreaterThan(5000);
    // Every entry must carry a usable proj4 definition — an entry without one
    // would be a dead search hit that fails only at transform time.
    expect(all.every((crs) => crs.proj4.length > 0)).toBe(true);
    expect(all.every((crs) => crs.code.startsWith("EPSG:"))).toBe(true);
  });

  it("finds codes that are not in the curated list", async () => {
    const { findCrsAnywhere, findCrs } = await import("@/engines/geospatial/ops/crsRegistry");
    // Deliberately obscure: not among the ~24 curated systems.
    expect(findCrs("EPSG:2065")).toBeNull();
    const found = await findCrsAnywhere("EPSG:2065");
    expect(found?.code).toBe("EPSG:2065");
    expect(found?.proj4).toContain("+proj=");
  });

  it("searches the full catalogue by name", async () => {
    const { searchAllCrs } = await import("@/engines/geospatial/ops/crsRegistry");
    const results = await searchAllCrs("Lambert", 40);
    expect(results.length).toBeGreaterThan(5);
    expect(results.some((crs) => /lambert/i.test(crs.name))).toBe(true);
  });

  it("keeps curated entries ahead of bulk ones for the same code", async () => {
    const { searchAllCrs } = await import("@/engines/geospatial/ops/crsRegistry");
    const results = await searchAllCrs("5514", 10);
    const krovak = results.find((crs) => crs.code === "EPSG:5514")!;
    // The curated entry carries aliases; the bulk-imported one has none.
    expect(krovak.aliases).toContain("krovak");
  });

  it("reprojects using a definition resolved from the full catalogue", async () => {
    const { findCrsAnywhere } = await import("@/engines/geospatial/ops/crsRegistry");
    const target = (await findCrsAnywhere("EPSG:2065"))!;
    // The engine takes the resolved { code, proj4 } pair, which is what keeps
    // the 8,000-entry index out of the worker entirely.
    const out = reprojectGeoJson(pointFeature(PRAGUE), "EPSG:4326", {
      code: target.code,
      proj4: target.proj4,
    });
    expect(out.to).toBe("EPSG:2065");
    const [x, y] = firstPoint(out.geojson);
    expect(Number.isFinite(x)).toBe(true);
    expect(Number.isFinite(y)).toBe(true);
    // S-JTSK Ferro is a Krovak variant like 5514 — same rough magnitudes.
    expect(Math.abs(x)).toBeGreaterThan(100_000);
  });
});

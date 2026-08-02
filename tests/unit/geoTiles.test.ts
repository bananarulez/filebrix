import { describe, expect, it } from "vitest";
import { tileFor, utmZoneFor } from "@/engines/geospatial/convert/tiles";

/**
 * Pinned to published reference answers, not to whatever the implementation
 * happens to return — the same discipline `geoCrs.test.ts` uses for
 * projections. A zone calculation that is off by one still looks perfectly
 * plausible, so "it returned a number" proves nothing.
 */
describe("utmZoneFor", () => {
  it("places well-known cities in their documented zones", () => {
    // Prague, Czechia — zone 33, band U.
    expect(utmZoneFor(14.4378, 50.0755)).toMatchObject({ zone: 33, band: "U", hemisphere: "N", label: "33U" });
    // New York — zone 18, band T.
    expect(utmZoneFor(-74.006, 40.7128)).toMatchObject({ zone: 18, band: "T", hemisphere: "N" });
    // Sydney — zone 56, southern hemisphere, band H.
    expect(utmZoneFor(151.2093, -33.8688)).toMatchObject({ zone: 56, band: "H", hemisphere: "S" });
  });

  it("gives the EPSG code for the zone's WGS 84 projection", () => {
    // 326xx north, 327xx south — the codes you'd paste into the CRS converter.
    expect(utmZoneFor(14.4378, 50.0755).epsg).toBe(32633);
    expect(utmZoneFor(151.2093, -33.8688).epsg).toBe(32756);
  });

  /**
   * The two irregularities that a plain `floor((lon + 180) / 6) + 1` gets
   * wrong. Both are real features of the UTM grid, and both are the reason
   * this is a function rather than one line inline.
   */
  it("applies the widened zone 32 over southern Norway", () => {
    // Bergen sits at 5.32°E, which naive arithmetic puts in zone 31.
    expect(utmZoneFor(5.3221, 60.391).zone).toBe(32);
    // Just south of the exception's 56°N floor, the normal rule applies again.
    expect(utmZoneFor(5.3221, 55.0).zone).toBe(31);
  });

  it("applies the Svalbard exception, where only zones 31/33/35/37 are used", () => {
    expect(utmZoneFor(15.0, 78.0).zone).toBe(33);
    expect(utmZoneFor(25.0, 78.0).zone).toBe(35);
    // Same longitude, below the exception's latitude floor: normal rule.
    expect(utmZoneFor(25.0, 60.0).zone).toBe(35);
  });

  it("refuses the polar regions rather than inventing a zone", () => {
    expect(() => utmZoneFor(0, 88)).toThrow(/UPS/);
    expect(() => utmZoneFor(0, -85)).toThrow(/UPS/);
  });

  it("keeps the last zone at exactly +180°", () => {
    // (180 + 180) / 6 + 1 would be 61, which doesn't exist.
    expect(utmZoneFor(180, 0).zone).toBe(60);
  });
});

describe("tileFor", () => {
  it("matches an independently computed tile for a known coordinate", () => {
    // Prague (14.4378, 50.0755) at zoom 12. Cross-checked against the
    // standard OSM slippy-map formula computed outside this codebase:
    //   x = floor((lon + 180) / 360 * 2^z)                        -> 2212
    //   y = floor((1 - ln(tan φ + sec φ) / π) / 2 * 2^z)          -> 1387
    // Written down because the first draft of this test asserted a
    // remembered value that was simply wrong, and the implementation was
    // right — a reference number is only worth having if it came from
    // somewhere other than memory.
    expect(tileFor(14.4378, 50.0755, 12)).toMatchObject({ z: 12, x: 2212, y: 1387, path: "12/2212/1387" });
  });

  it("puts the whole world in one tile at zoom 0", () => {
    expect(tileFor(14.4378, 50.0755, 0)).toMatchObject({ z: 0, x: 0, y: 0 });
  });

  it("returns bounds that actually contain the requested point", () => {
    // The strongest available self-check: whatever tile is returned, the
    // input has to fall inside it.
    const lon = 14.4378;
    const lat = 50.0755;
    const { bounds } = tileFor(lon, lat, 14);
    expect(lon).toBeGreaterThanOrEqual(bounds.west);
    expect(lon).toBeLessThanOrEqual(bounds.east);
    expect(lat).toBeGreaterThanOrEqual(bounds.south);
    expect(lat).toBeLessThanOrEqual(bounds.north);
  });

  it("flips Y for the TMS scheme", () => {
    const tile = tileFor(14.4378, 50.0755, 12);
    expect(tile.tmsY).toBe(2 ** 12 - 1 - tile.y);
  });

  it("refuses latitudes outside Web Mercator's range", () => {
    expect(() => tileFor(0, 86, 5)).toThrow(/85/);
  });
});

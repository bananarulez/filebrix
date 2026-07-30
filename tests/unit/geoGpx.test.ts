import { describe, expect, it } from "vitest";
import {
  buildElevationProfile,
  computeGpxTrackStats,
  geoJsonToGpxText,
  gpxTextToGeoJson,
} from "@/engines/geospatial/xml/gpx";
import { ProcessingError } from "@/lib/errors/ProcessingError";

const sampleGpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="test" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>Test Track</name>
    <trkseg>
      <trkpt lat="40.0000" lon="-74.0000"><ele>100</ele></trkpt>
      <trkpt lat="40.0010" lon="-74.0000"><ele>150</ele></trkpt>
      <trkpt lat="40.0020" lon="-74.0000"><ele>120</ele></trkpt>
    </trkseg>
  </trk>
</gpx>`;

describe("gpxTextToGeoJson", () => {
  it("converts tracks to a LineString feature", async () => {
    const geojson = (await gpxTextToGeoJson(sampleGpx)) as {
      features: Array<{ geometry: { type: string; coordinates: number[][] } }>;
    };
    expect(geojson.features.length).toBe(1);
    expect(geojson.features[0].geometry.type).toBe("LineString");
    expect(geojson.features[0].geometry.coordinates.length).toBe(3);
    // togeojson puts <ele> as the 3rd coordinate value.
    expect(geojson.features[0].geometry.coordinates[0][2]).toBe(100);
  });

  it("throws MALFORMED_FILE for a non-GPX root element", async () => {
    await expect(gpxTextToGeoJson("<kml></kml>")).rejects.toThrow(ProcessingError);
  });

  it("throws MALFORMED_FILE for non-well-formed XML", async () => {
    await expect(gpxTextToGeoJson("<gpx><trk>")).rejects.toThrow(ProcessingError);
  });

  it("does not resolve external entities (XXE)", async () => {
    const xxe = `<?xml version="1.0"?><!DOCTYPE gpx [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><gpx><trk><name>&xxe;</name></trk></gpx>`;
    let text = "";
    try {
      text = JSON.stringify(await gpxTextToGeoJson(xxe));
    } catch {
      text = "";
    }
    expect(text).not.toContain("root:");
  });
});

describe("computeGpxTrackStats", () => {
  it("computes elevation gain/loss/min/max exactly, and a positive distance", async () => {
    const geojson = await gpxTextToGeoJson(sampleGpx);
    const stats = computeGpxTrackStats(geojson);
    expect(stats.hasElevation).toBe(true);
    expect(stats.pointCount).toBe(3);
    expect(stats.minElevationMeters).toBe(100);
    expect(stats.maxElevationMeters).toBe(150);
    expect(stats.elevationGainMeters).toBe(50);
    expect(stats.elevationLossMeters).toBe(30);
    expect(stats.distanceMeters).toBeGreaterThan(0);
  });

  it("reports hasElevation: false when no <ele> is present", async () => {
    const noElevation = `<?xml version="1.0"?><gpx version="1.1" creator="test" xmlns="http://www.topografix.com/GPX/1/1"><trk><trkseg><trkpt lat="1" lon="1"/><trkpt lat="2" lon="2"/></trkseg></trk></gpx>`;
    const geojson = await gpxTextToGeoJson(noElevation);
    const stats = computeGpxTrackStats(geojson);
    expect(stats.hasElevation).toBe(false);
    expect(stats.minElevationMeters).toBeNull();
    expect(stats.elevationGainMeters).toBeNull();
  });

  it("handles an empty track without crashing", () => {
    const stats = computeGpxTrackStats({ type: "FeatureCollection", features: [] });
    expect(stats.pointCount).toBe(0);
    expect(stats.distanceMeters).toBe(0);
    expect(stats.hasElevation).toBe(false);
  });
});

describe("buildElevationProfile", () => {
  it("returns one point per track vertex with cumulative distance", async () => {
    const geojson = await gpxTextToGeoJson(sampleGpx);
    const profile = buildElevationProfile(geojson);
    expect(profile.length).toBe(3);
    expect(profile[0].distanceMeters).toBe(0);
    expect(profile[1].distanceMeters).toBeGreaterThan(0);
    expect(profile.map((p) => p.elevationMeters)).toEqual([100, 150, 120]);
  });

  it("returns an empty array when there's no elevation data", () => {
    const profile = buildElevationProfile({
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates: [[0, 0], [1, 1]] },
    });
    expect(profile).toEqual([]);
  });
});

describe("geoJsonToGpxText", () => {
  it("serializes Point features to waypoints and LineStrings to tracks", () => {
    const { gpxText, skippedFeatureCount } = geoJsonToGpxText({
      type: "FeatureCollection",
      features: [
        { type: "Feature", properties: { name: "Home" }, geometry: { type: "Point", coordinates: [-74, 40, 10] } },
        { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [[0, 0], [1, 1]] } },
      ],
    });
    expect(gpxText).toContain("<wpt");
    expect(gpxText).toContain('lat="40"');
    expect(gpxText).toContain("<ele>10</ele>");
    expect(gpxText).toContain("<trk>");
    expect(gpxText).toContain("<trkpt");
    expect(skippedFeatureCount).toBe(0);
  });

  it("skips Polygons (no GPX equivalent) and reports how many", () => {
    const { skippedFeatureCount } = geoJsonToGpxText({
      type: "Feature",
      properties: {},
      geometry: { type: "Polygon", coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
    });
    expect(skippedFeatureCount).toBe(1);
  });

  it("round-trips a track's coordinates through GPX and back", async () => {
    const original = {
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates: [[1.5, 2.5], [3.5, 4.5]] },
    };
    const { gpxText } = geoJsonToGpxText(original);
    const parsed = (await gpxTextToGeoJson(gpxText)) as {
      features: Array<{ geometry: { coordinates: number[][] } }>;
    };
    expect(parsed.features[0].geometry.coordinates[0][0]).toBeCloseTo(1.5, 5);
    expect(parsed.features[0].geometry.coordinates[0][1]).toBeCloseTo(2.5, 5);
  });

  it("throws for a malformed root", () => {
    expect(() => geoJsonToGpxText({ type: "Bogus" })).toThrow(ProcessingError);
  });
});

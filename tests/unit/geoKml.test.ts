import { describe, expect, it } from "vitest";
import { geoJsonToKmlText, kmlTextToGeoJson } from "@/engines/geospatial/xml/kml";
import { ProcessingError } from "@/lib/errors/ProcessingError";

const sampleKml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <Placemark>
      <name>Point A</name>
      <Point><coordinates>-74.006,40.7128,0</coordinates></Point>
    </Placemark>
    <Placemark>
      <name>Line B</name>
      <LineString><coordinates>0,0 1,1 2,2</coordinates></LineString>
    </Placemark>
  </Document>
</kml>`;

describe("kmlTextToGeoJson", () => {
  it("converts Placemarks to GeoJSON features", async () => {
    const geojson = (await kmlTextToGeoJson(sampleKml)) as {
      type: string;
      features: Array<{ geometry: { type: string } }>;
    };
    expect(geojson.type).toBe("FeatureCollection");
    expect(geojson.features.length).toBe(2);
    expect(geojson.features.map((f) => f.geometry.type).sort()).toEqual(["LineString", "Point"]);
  });

  it("throws MALFORMED_FILE for a non-KML root element", async () => {
    await expect(kmlTextToGeoJson("<gpx></gpx>")).rejects.toThrow(ProcessingError);
  });

  it("throws MALFORMED_FILE for non-well-formed XML", async () => {
    await expect(kmlTextToGeoJson("<kml><Document>")).rejects.toThrow(ProcessingError);
  });

  it("does not resolve external entities (XXE)", async () => {
    const xxe = `<?xml version="1.0"?><!DOCTYPE kml [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><kml><Document><name>&xxe;</name></Document></kml>`;
    let text = "";
    try {
      const geojson = await kmlTextToGeoJson(xxe);
      text = JSON.stringify(geojson);
    } catch {
      text = "";
    }
    expect(text).not.toContain("root:");
    expect(text.toLowerCase()).not.toContain("/bin/");
  });
});

describe("geoJsonToKmlText", () => {
  it("serializes Point/LineString/Polygon features to Placemarks", () => {
    const kml = geoJsonToKmlText({
      type: "FeatureCollection",
      features: [
        { type: "Feature", properties: { name: "P" }, geometry: { type: "Point", coordinates: [1, 2] } },
        { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [[0, 0], [1, 1]] } },
        {
          type: "Feature",
          properties: {},
          geometry: { type: "Polygon", coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
        },
      ],
    });
    expect(kml).toContain("<Placemark>");
    expect(kml).toContain("<name>P</name>");
    expect(kml).toContain("<Point>");
    expect(kml).toContain("<LineString>");
    expect(kml).toContain("<Polygon>");
    expect(kml).toContain("1,2");
  });

  it("escapes XML-significant characters in names and property values", () => {
    const kml = geoJsonToKmlText({
      type: "Feature",
      properties: { name: "A & <B>" },
      geometry: { type: "Point", coordinates: [0, 0] },
    });
    expect(kml).toContain("A &amp; &lt;B&gt;");
    expect(kml).not.toContain("<B>");
  });

  it("throws for a malformed root", () => {
    expect(() => geoJsonToKmlText({ type: "Bogus" })).toThrow(ProcessingError);
  });

  it("round-trips a Point through KML and back", async () => {
    const original = {
      type: "Feature",
      properties: { name: "Roundtrip" },
      geometry: { type: "Point", coordinates: [12.34, -56.78] },
    };
    const kml = geoJsonToKmlText(original);
    const parsed = (await kmlTextToGeoJson(kml)) as {
      features: Array<{ geometry: { coordinates: number[] } }>;
    };
    expect(parsed.features[0].geometry.coordinates[0]).toBeCloseTo(12.34, 5);
    expect(parsed.features[0].geometry.coordinates[1]).toBeCloseTo(-56.78, 5);
  });
});

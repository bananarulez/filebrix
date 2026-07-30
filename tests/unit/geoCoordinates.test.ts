import { describe, expect, it } from "vitest";
import {
  convertCoordinateLines,
  formatCoordinate,
  formatDd,
  formatDdm,
  formatDms,
  formatUtm,
  parseCoordinateLine,
} from "@/engines/geospatial/convert/coordinates";

describe("parseCoordinateLine", () => {
  it("parses decimal degrees with a comma", () => {
    expect(parseCoordinateLine("40.7128, -74.0060")).toEqual({ lat: 40.7128, lon: -74.006 });
  });

  it("parses decimal degrees with hemisphere letters", () => {
    const parsed = parseCoordinateLine("40.7128N 74.0060W");
    expect(parsed?.lat).toBeCloseTo(40.7128, 5);
    expect(parsed?.lon).toBeCloseTo(-74.006, 5);
  });

  it("parses degrees-minutes-seconds", () => {
    const parsed = parseCoordinateLine(`40°42'46.08"N 74°0'21.6"W`);
    expect(parsed?.lat).toBeCloseTo(40.7128, 3);
    expect(parsed?.lon).toBeCloseTo(-74.006, 3);
  });

  it("parses degrees-decimal-minutes", () => {
    const parsed = parseCoordinateLine(`40°42.768'N 74°0.36'W`);
    expect(parsed?.lat).toBeCloseTo(40.7128, 3);
    expect(parsed?.lon).toBeCloseTo(-74.006, 3);
  });

  it("parses UTM", () => {
    const parsed = parseCoordinateLine("18T 583960 4507523");
    expect(parsed?.lat).toBeCloseTo(40.7128, 1);
    expect(parsed?.lon).toBeCloseTo(-74.006, 1);
  });

  it("returns null for unrecognized text", () => {
    expect(parseCoordinateLine("not a coordinate at all")).toBeNull();
  });

  it("returns null for a blank line", () => {
    expect(parseCoordinateLine("   ")).toBeNull();
  });

  it("returns null for out-of-range decimal degrees", () => {
    expect(parseCoordinateLine("200, 500")).toBeNull();
  });
});

describe("format round-trips", () => {
  const point = { lat: 40.7128, lon: -74.006 };

  it("formatDd round-trips through parseCoordinateLine", () => {
    const formatted = formatDd(point);
    const reparsed = parseCoordinateLine(formatted);
    expect(reparsed?.lat).toBeCloseTo(point.lat, 5);
    expect(reparsed?.lon).toBeCloseTo(point.lon, 5);
  });

  it("formatDms round-trips through parseCoordinateLine", () => {
    const formatted = formatDms(point);
    const reparsed = parseCoordinateLine(formatted);
    expect(reparsed?.lat).toBeCloseTo(point.lat, 3);
    expect(reparsed?.lon).toBeCloseTo(point.lon, 3);
  });

  it("formatDdm round-trips through parseCoordinateLine", () => {
    const formatted = formatDdm(point);
    const reparsed = parseCoordinateLine(formatted);
    expect(reparsed?.lat).toBeCloseTo(point.lat, 3);
    expect(reparsed?.lon).toBeCloseTo(point.lon, 3);
  });

  it("formatUtm round-trips through parseCoordinateLine", () => {
    const formatted = formatUtm(point);
    const reparsed = parseCoordinateLine(formatted);
    expect(reparsed?.lat).toBeCloseTo(point.lat, 1);
    expect(reparsed?.lon).toBeCloseTo(point.lon, 1);
  });
});

describe("formatCoordinate", () => {
  it("dispatches to the right formatter", () => {
    const point = { lat: 1, lon: 2 };
    expect(formatCoordinate(point, "dd")).toBe(formatDd(point));
    expect(formatCoordinate(point, "dms")).toBe(formatDms(point));
  });
});

describe("convertCoordinateLines", () => {
  it("converts each line independently and reports errors per-line", () => {
    const results = convertCoordinateLines("40.7128, -74.0060\nnonsense\n51.5074, -0.1278", "dms");
    expect(results.length).toBe(3);
    expect(results[0].output).not.toBeNull();
    expect(results[0].error).toBeNull();
    expect(results[1].output).toBeNull();
    expect(results[1].error).not.toBeNull();
    expect(results[2].output).not.toBeNull();
  });

  it("skips blank lines", () => {
    const results = convertCoordinateLines("40.7128, -74.0060\n\n   \n51.5074, -0.1278", "dd");
    expect(results.length).toBe(2);
  });
});

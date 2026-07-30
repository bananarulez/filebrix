import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderInWorkspace } from "./geoWorkspaceHarness";
import { GeoConverterTool } from "@/components/geo/GeoConverterTool";
import { geoJsonToCsv, parseGeoJsonFile } from "@/engines/geospatial";
import { geoJsonToKmlText, kmlTextToGeoJson } from "@/engines/geospatial/xml/kml";
import { gpxTextToGeoJson } from "@/engines/geospatial/xml/gpx";
import { ProcessingError } from "@/lib/errors/ProcessingError";

vi.mock("@/engines/geospatial", () => ({
  parseGeoJsonFile: vi.fn(),
  geoJsonToCsv: vi.fn(),
}));

vi.mock("@/engines/geospatial/xml/kml", () => ({
  kmlTextToGeoJson: vi.fn(),
  geoJsonToKmlText: vi.fn(),
}));

vi.mock("@/engines/geospatial/xml/gpx", () => ({
  gpxTextToGeoJson: vi.fn(),
}));

const mockedParseGeoJson = vi.mocked(parseGeoJsonFile);
const mockedGeoJsonToCsv = vi.mocked(geoJsonToCsv);
const mockedKmlToGeoJson = vi.mocked(kmlTextToGeoJson);
const mockedGeoJsonToKml = vi.mocked(geoJsonToKmlText);
const mockedGpxToGeoJson = vi.mocked(gpxTextToGeoJson);

describe("GeoConverterTool", () => {
  it("kml-to-geojson: converts and offers a .geojson download", async () => {
    mockedKmlToGeoJson.mockResolvedValue({ type: "FeatureCollection", features: [] });

    renderInWorkspace(<GeoConverterTool kind="kml-to-geojson" />, { file: new File(["<kml/>"], "sample.kml") });

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /download \.geojson/i })).toBeInTheDocument()
    );
  });

  it("geojson-to-kml: converts and offers a .kml download", async () => {
    mockedParseGeoJson.mockResolvedValue({ type: "FeatureCollection", features: [] });
    mockedGeoJsonToKml.mockReturnValue("<kml/>");

    renderInWorkspace(<GeoConverterTool kind="geojson-to-kml" />, { file: new File(["{}"], "sample.geojson") });

    await waitFor(() => expect(screen.getByRole("button", { name: /download \.kml/i })).toBeInTheDocument());
  });

  it("gpx-to-geojson: converts and offers a .geojson download", async () => {
    mockedGpxToGeoJson.mockResolvedValue({ type: "FeatureCollection", features: [] });

    renderInWorkspace(<GeoConverterTool kind="gpx-to-geojson" />, { file: new File(["<gpx/>"], "sample.gpx") });

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /download \.geojson/i })).toBeInTheDocument()
    );
  });

  it("geojson-to-csv: converts and surfaces warnings", async () => {
    mockedParseGeoJson.mockResolvedValue({ type: "FeatureCollection", features: [] });
    mockedGeoJsonToCsv.mockResolvedValue({
      blob: new Blob(["geometry_type,longitude,latitude\n"], { type: "text/csv" }),
      warnings: ["1 feature(s) had no usable geometry — their longitude/latitude were left blank."],
    });

    renderInWorkspace(<GeoConverterTool kind="geojson-to-csv" />, { file: new File(["{}"], "sample.geojson") });

    await waitFor(() => expect(screen.getByRole("button", { name: /download \.csv/i })).toBeInTheDocument());
    expect(screen.getByText(/left blank/)).toBeInTheDocument();
  });

  it("shows a friendly error when conversion fails", async () => {
    mockedKmlToGeoJson.mockRejectedValue(new ProcessingError("MALFORMED_FILE", "This isn't a valid KML file."));

    renderInWorkspace(<GeoConverterTool kind="kml-to-geojson" />, { file: new File(["not kml"], "sample.kml") });

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByText(/never uploaded/i)).toBeInTheDocument();
  });
});

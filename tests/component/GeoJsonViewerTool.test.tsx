import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderInWorkspace } from "./geoWorkspaceHarness";
import { GeoJsonViewerTool } from "@/components/geo/GeoJsonViewerTool";
import { parseGeoJsonFile, summarizeGeoJson } from "@/engines/geospatial";

vi.mock("@/engines/geospatial", () => ({
  parseGeoJsonFile: vi.fn(),
  summarizeGeoJson: vi.fn(),
}));

// GeoMap needs a real WebGL context, which jsdom doesn't provide (same
// reasoning as PdfThumbnail's canvas dependency — see CLAUDE.md) — the map
// itself is exercised in a real browser via the e2e suite instead.
vi.mock("@/components/geo/LazyGeoMap", () => ({
  LazyGeoMap: () => <div data-testid="geo-map-stub" />,
}));

const mockedParse = vi.mocked(parseGeoJsonFile);
const mockedSummarize = vi.mocked(summarizeGeoJson);

function makeFile(name = "sample.geojson"): File {
  return new File(["{}"], name, { type: "application/geo+json" });
}

describe("GeoJsonViewerTool", () => {
  it("shows feature counts, geometry types and bounding box once loaded", async () => {
    mockedParse.mockResolvedValue({ type: "FeatureCollection", features: [] });
    mockedSummarize.mockResolvedValue({
      featureCount: 2,
      geometryTypeCounts: { Point: 1, Polygon: 1 },
      bbox: [-1, -1, 1, 1],
      propertyKeys: ["name"],
      propertyPreview: [{ name: "A" }],
      warnings: [],
    });

    renderInWorkspace(<GeoJsonViewerTool />, {
      file: makeFile(),
      geojson: { type: "FeatureCollection", features: [] },
      sourceFormat: "geojson",
    });

    await waitFor(() =>
      expect(screen.getByText("Features").nextElementSibling).toHaveTextContent("2")
    );
    expect(screen.getByText(/Point \(1\)/)).toBeInTheDocument();
    expect(screen.getByText(/Polygon \(1\)/)).toBeInTheDocument();
    expect(screen.getByTestId("geo-map-stub")).toBeInTheDocument();
  });

});

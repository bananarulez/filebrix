import { describe, expect, it, vi } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import { renderInWorkspace } from "./geoWorkspaceHarness";
import { CsvToGeoJsonTool } from "@/components/geo/CsvToGeoJsonTool";
import {
  csvTableToGeoJson,
  detectLatLonColumns,
  parseCsvFile,
  summarizeGeoJson,
} from "@/engines/geospatial";

vi.mock("@/engines/geospatial", () => ({
  parseCsvFile: vi.fn(),
  detectLatLonColumns: vi.fn(),
  csvTableToGeoJson: vi.fn(),
  summarizeGeoJson: vi.fn(),
}));

vi.mock("@/components/geo/LazyGeoMap", () => ({
  LazyGeoMap: () => <div data-testid="geo-map-stub" />,
}));

const mockedParseCsv = vi.mocked(parseCsvFile);
const mockedDetect = vi.mocked(detectLatLonColumns);
const mockedConvert = vi.mocked(csvTableToGeoJson);
const mockedSummarize = vi.mocked(summarizeGeoJson);

describe("CsvToGeoJsonTool", () => {
  it("pre-selects detected lat/lon columns and converts on click", async () => {
    mockedParseCsv.mockResolvedValue({
      columns: ["name", "lat", "lon"],
      rows: [["Store A", 1, 2]],
      warnings: [],
    });
    mockedDetect.mockReturnValue({ latColumn: "lat", lonColumn: "lon" });
    mockedConvert.mockResolvedValue({
      geojson: { type: "FeatureCollection", features: [] },
      warnings: [],
    });
    mockedSummarize.mockResolvedValue({
      featureCount: 1,
      geometryTypeCounts: { Point: 1 },
      bbox: [1, 2, 1, 2],
      propertyKeys: [],
      propertyPreview: [],
      warnings: [],
    });

    renderInWorkspace(<CsvToGeoJsonTool />, {
      file: new File(["name,lat,lon"], "coords.csv"),
      csvTable: { columns: ["name", "lat", "lon"], rows: [["Store A", 1, 2]], warnings: [] },
      sourceFormat: "csv",
    });

    await waitFor(() => expect(screen.getByRole("button", { name: /convert to geojson/i })).toBeEnabled());
    expect(screen.getByDisplayValue("lat")).toBeInTheDocument();
    expect(screen.getByDisplayValue("lon")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /convert to geojson/i }));

    await waitFor(() => expect(mockedConvert).toHaveBeenCalledWith(expect.anything(), "lat", "lon"));
    await waitFor(() => expect(screen.getByRole("button", { name: /download \.geojson/i })).toBeInTheDocument());
    expect(screen.getByTestId("geo-map-stub")).toBeInTheDocument();
  });

  it("lets the user override the guessed columns", async () => {
    mockedParseCsv.mockResolvedValue({
      columns: ["y", "x", "id"],
      rows: [[1, 2, "a"]],
      warnings: [],
    });
    mockedDetect.mockReturnValue({ latColumn: null, lonColumn: null });

    renderInWorkspace(<CsvToGeoJsonTool />, {
      file: new File(["y,x,id"], "coords.csv"),
      csvTable: { columns: ["y", "x", "id"], rows: [[1, 2, "a"]], warnings: [] },
      sourceFormat: "csv",
    });

    await waitFor(() => expect(screen.getAllByRole("combobox").length).toBe(2));
    const [latSelect, lonSelect] = screen.getAllByRole("combobox");
    fireEvent.change(latSelect, { target: { value: "y" } });
    fireEvent.change(lonSelect, { target: { value: "x" } });

    expect((latSelect as HTMLSelectElement).value).toBe("y");
    expect((lonSelect as HTMLSelectElement).value).toBe("x");
  });
});

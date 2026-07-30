import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { GeoFilePanel, GeoWorkspace, useGeoWorkspace } from "@/components/geo/GeoWorkspace";
import { parseAnyGeoFile } from "@/components/geo/parseAnyGeoFile";
import { detectFileType } from "@/lib/detect/detectFile";
import { summarizeGeoJson, parseCsvFile } from "@/engines/geospatial";
import { ProcessingError } from "@/lib/errors/ProcessingError";

vi.mock("@/components/geo/parseAnyGeoFile", () => ({ parseAnyGeoFile: vi.fn() }));
vi.mock("@/lib/detect/detectFile", () => ({ detectFileType: vi.fn() }));
vi.mock("@/engines/geospatial", () => ({
  summarizeGeoJson: vi.fn(),
  parseCsvFile: vi.fn(),
}));

const mockedParseAny = vi.mocked(parseAnyGeoFile);
const mockedDetect = vi.mocked(detectFileType);
const mockedSummarize = vi.mocked(summarizeGeoJson);
const mockedParseCsv = vi.mocked(parseCsvFile);

/** Renders whatever the workspace currently holds, so tests can assert on it. */
function WorkspaceProbe() {
  const { sourceFormat, geojson, csvTable, documentKey } = useGeoWorkspace();
  return (
    <div>
      <span data-testid="format">{sourceFormat ?? "none"}</span>
      <span data-testid="has-geojson">{geojson ? "yes" : "no"}</span>
      <span data-testid="has-csv">{csvTable ? "yes" : "no"}</span>
      <span data-testid="doc-key">{documentKey}</span>
    </div>
  );
}

function selectFile(file: File) {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });
}

/**
 * The workspace owns what every geo tool used to own individually: the drop
 * zone, the loaded file, format detection, and the parse-failure message.
 * These assertions previously lived in the individual tool tests (each mocking
 * its own parser) and moved here when that responsibility did.
 */
describe("GeoWorkspace", () => {
  it("detects a geometry file, parses it once, and exposes it to children", async () => {
    mockedDetect.mockResolvedValue({ format: "geojson", confidence: "content" });
    mockedParseAny.mockResolvedValue({
      geojson: { type: "FeatureCollection", features: [] },
      sourceFormat: "geojson",
    });
    mockedSummarize.mockResolvedValue({
      featureCount: 0,
      geometryTypeCounts: {},
      bbox: [0, 0, 1, 1],
      propertyKeys: [],
      propertyPreview: [],
      warnings: [],
    });

    render(
      <GeoWorkspace>
        <GeoFilePanel />
        <WorkspaceProbe />
      </GeoWorkspace>
    );
    selectFile(new File(["{}"], "sample.geojson"));

    await waitFor(() => expect(screen.getByTestId("format")).toHaveTextContent("geojson"));
    expect(screen.getByTestId("has-geojson")).toHaveTextContent("yes");
    // A geometry file never goes down the CSV branch.
    expect(screen.getByTestId("has-csv")).toHaveTextContent("no");
    expect(screen.getByText(/Detected: GeoJSON/)).toBeInTheDocument();
  });

  it("routes a CSV down the table branch instead of the geometry one", async () => {
    mockedDetect.mockResolvedValue({ format: "csv", confidence: "content" });
    mockedParseCsv.mockResolvedValue({ columns: ["lat", "lon"], rows: [[1, 2]], warnings: [] });

    render(
      <GeoWorkspace>
        <GeoFilePanel />
        <WorkspaceProbe />
      </GeoWorkspace>
    );
    selectFile(new File(["lat,lon\n1,2"], "points.csv"));

    await waitFor(() => expect(screen.getByTestId("format")).toHaveTextContent("csv"));
    expect(screen.getByTestId("has-csv")).toHaveTextContent("yes");
    expect(screen.getByTestId("has-geojson")).toHaveTextContent("no");
    // A CSV has no geometry to summarize, so that call is skipped entirely.
    expect(mockedSummarize).not.toHaveBeenCalled();
  });

  it("shows a friendly error for a malformed file", async () => {
    mockedDetect.mockResolvedValue({ format: "geojson", confidence: "content" });
    mockedParseAny.mockRejectedValue(new ProcessingError("MALFORMED_FILE", "This file isn't valid JSON."));

    render(
      <GeoWorkspace>
        <GeoFilePanel />
        <WorkspaceProbe />
      </GeoWorkspace>
    );
    selectFile(new File(["not json"], "broken.geojson"));

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByText(/never uploaded/i)).toBeInTheDocument();
  });

  it("bumps documentKey on each load so tools remount with fresh state", async () => {
    mockedDetect.mockResolvedValue({ format: "geojson", confidence: "content" });
    mockedParseAny.mockResolvedValue({
      geojson: { type: "FeatureCollection", features: [] },
      sourceFormat: "geojson",
    });
    mockedSummarize.mockResolvedValue({
      featureCount: 0,
      geometryTypeCounts: {},
      bbox: null,
      propertyKeys: [],
      propertyPreview: [],
      warnings: [],
    });

    render(
      <GeoWorkspace>
        <GeoFilePanel />
        <WorkspaceProbe />
      </GeoWorkspace>
    );
    expect(screen.getByTestId("doc-key")).toHaveTextContent("0");

    selectFile(new File(["{}"], "a.geojson"));
    await waitFor(() => expect(screen.getByTestId("doc-key")).toHaveTextContent("1"));

    selectFile(new File(["{}"], "b.geojson"));
    await waitFor(() => expect(screen.getByTestId("doc-key")).toHaveTextContent("2"));
  });

  it("clears the loaded file on request", async () => {
    mockedDetect.mockResolvedValue({ format: "geojson", confidence: "content" });
    mockedParseAny.mockResolvedValue({
      geojson: { type: "FeatureCollection", features: [] },
      sourceFormat: "geojson",
    });
    mockedSummarize.mockResolvedValue({
      featureCount: 0,
      geometryTypeCounts: {},
      bbox: null,
      propertyKeys: [],
      propertyPreview: [],
      warnings: [],
    });

    render(
      <GeoWorkspace>
        <GeoFilePanel />
        <WorkspaceProbe />
      </GeoWorkspace>
    );
    selectFile(new File(["{}"], "sample.geojson"));
    await waitFor(() => expect(screen.getByTestId("has-geojson")).toHaveTextContent("yes"));

    fireEvent.click(screen.getByRole("button", { name: /clear file/i }));
    await waitFor(() => expect(screen.getByTestId("has-geojson")).toHaveTextContent("no"));
    expect(screen.getByTestId("format")).toHaveTextContent("none");
  });
});

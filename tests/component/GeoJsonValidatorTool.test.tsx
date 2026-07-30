import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import { renderInWorkspace, makeFile } from "./geoWorkspaceHarness";
import { GeoJsonValidatorTool } from "@/components/geo/GeoJsonValidatorTool";
import { checkTopology, parseGeoJsonFile, repairGeoJson, validateGeoJson } from "@/engines/geospatial";

vi.mock("@/engines/geospatial", () => ({
  parseGeoJsonFile: vi.fn(),
  validateGeoJson: vi.fn(),
  repairGeoJson: vi.fn(),
  // The tool runs a second, geometric pass alongside the structural one —
  // see the component's own comment for why the two are separate.
  checkTopology: vi.fn(),
}));

const mockedParse = vi.mocked(parseGeoJsonFile);
const mockedValidate = vi.mocked(validateGeoJson);
const mockedRepair = vi.mocked(repairGeoJson);
const mockedTopology = vi.mocked(checkTopology);

describe("GeoJsonValidatorTool", () => {
  beforeEach(() => {
    mockedTopology.mockResolvedValue([]);
  });

  it("reports a valid file with no issues", async () => {
    mockedParse.mockResolvedValue({ type: "FeatureCollection", features: [] });
    mockedValidate.mockResolvedValue({ valid: true, issues: [], canRepair: false });

    renderInWorkspace(<GeoJsonValidatorTool />, {
      file: makeFile("sample.geojson"),
      geojson: { type: "FeatureCollection", features: [] },
      sourceFormat: "geojson",
    });

    await waitFor(() => expect(screen.getByText(/no problems found/i)).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /repair automatically/i })).not.toBeInTheDocument();
  });

  it("lists issues and offers a repair button when auto-fixable", async () => {
    mockedParse.mockResolvedValue({ type: "FeatureCollection", features: [] });
    mockedValidate.mockResolvedValue({
      valid: true,
      issues: [
        { severity: "warning", message: "Feature 0 has a polygon ring that isn't closed.", featureIndex: 0, autoFixable: true },
      ],
      canRepair: true,
    });

    renderInWorkspace(<GeoJsonValidatorTool />, {
      file: makeFile("sample.geojson"),
      geojson: { type: "FeatureCollection", features: [] },
      sourceFormat: "geojson",
    });

    await waitFor(() => expect(screen.getByText(/isn't closed/)).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /repair automatically/i })).toBeInTheDocument();
  });

  it("never modifies the file without an explicit repair click, and shows what changed afterward", async () => {
    mockedParse.mockResolvedValue({ type: "FeatureCollection", features: [] });
    mockedValidate.mockResolvedValue({
      valid: true,
      issues: [{ severity: "warning", message: "issue", autoFixable: true }],
      canRepair: true,
    });
    mockedRepair.mockResolvedValue({
      geojson: { type: "FeatureCollection", features: [] },
      changes: ["Closed 1 unclosed polygon ring."],
    });

    renderInWorkspace(<GeoJsonValidatorTool />, {
      file: makeFile("sample.geojson"),
      geojson: { type: "FeatureCollection", features: [] },
      sourceFormat: "geojson",
    });
    await waitFor(() => expect(screen.getByRole("button", { name: /repair automatically/i })).toBeInTheDocument());

    expect(mockedRepair).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /repair automatically/i }));

    await waitFor(() => expect(screen.getByText("Closed 1 unclosed polygon ring.")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /download repaired geojson/i })).toBeInTheDocument();
  });

});

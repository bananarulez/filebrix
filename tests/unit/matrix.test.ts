import { describe, expect, it } from "vitest";
import { buildConversionMatrix, getSupportedOutputs, getToolsForConversion } from "@/registry/matrix";
import { makeTool } from "../helpers/toolFactory";

describe("conversion matrix", () => {
  const csvToExcel = makeTool({
    id: "1",
    slug: "csv-to-excel",
    acceptedFileTypes: ["csv"],
    outputFileTypes: ["xlsx"],
  });
  const csvToJson = makeTool({
    id: "2",
    slug: "csv-to-json",
    acceptedFileTypes: ["csv"],
    outputFileTypes: ["json"],
  });
  const csvViewer = makeTool({
    id: "3",
    slug: "csv-viewer",
    acceptedFileTypes: ["csv"],
    outputFileTypes: ["csv"],
  });

  const matrix = buildConversionMatrix([csvToExcel, csvToJson, csvViewer]);

  it("derives supported outputs from the registry, excluding same-format no-ops", () => {
    expect(getSupportedOutputs(matrix, "csv").sort()).toEqual(["json", "xlsx"]);
  });

  it("resolves which tools perform a specific conversion", () => {
    expect(getToolsForConversion(matrix, "csv", "xlsx")).toEqual([csvToExcel]);
    expect(getToolsForConversion(matrix, "csv", "gpx")).toEqual([]);
  });
});

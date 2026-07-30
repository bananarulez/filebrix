import { describe, expect, it } from "vitest";
import {
  getRelatedTools,
  getToolBySlug,
  getToolsAcceptingFormat,
  getToolsByEngine,
  getToolUrl,
  searchTools,
} from "@/registry";
import { makeTool } from "../helpers/toolFactory";

describe("registry helpers", () => {
  const csvToExcel = makeTool({
    id: "csv-to-excel",
    slug: "csv-to-excel",
    name: "CSV to Excel",
    engine: "spreadsheet",
    acceptedFileTypes: ["csv"],
    outputFileTypes: ["xlsx"],
    keywords: ["csv", "excel"],
    relatedTools: ["excel-to-csv"],
  });
  const excelToCsv = makeTool({
    id: "excel-to-csv",
    slug: "excel-to-csv",
    name: "Excel to CSV",
    engine: "spreadsheet",
    acceptedFileTypes: ["xlsx"],
    outputFileTypes: ["csv"],
    keywords: ["excel", "csv"],
  });
  const mergePdf = makeTool({
    id: "merge-pdf",
    slug: "merge-pdf",
    name: "Merge PDF",
    engine: "pdf",
    routeGroup: "pdf",
    acceptedFileTypes: ["pdf"],
    outputFileTypes: ["pdf"],
    keywords: ["merge", "pdf"],
  });
  const list = [csvToExcel, excelToCsv, mergePdf];

  it("looks up a tool by slug", () => {
    expect(getToolBySlug("merge-pdf", list)).toBe(mergePdf);
    expect(getToolBySlug("missing", list)).toBeUndefined();
  });

  it("filters tools by engine", () => {
    expect(getToolsByEngine("spreadsheet", list)).toEqual([csvToExcel, excelToCsv]);
  });

  it("filters tools accepting a file format", () => {
    expect(getToolsAcceptingFormat("csv", list)).toEqual([csvToExcel]);
  });

  it("resolves related tool slugs to definitions, dropping unknown slugs", () => {
    expect(getRelatedTools(csvToExcel, list)).toEqual([excelToCsv]);
  });

  it("builds a route-group-aware URL", () => {
    expect(getToolUrl(mergePdf)).toBe("/pdf/merge-pdf");
    expect(getToolUrl(csvToExcel)).toBe("/convert/csv-to-excel");
  });

  it("searches by name, description and keywords", () => {
    expect(searchTools("excel", list)).toEqual([csvToExcel, excelToCsv]);
    expect(searchTools("merge", list)).toEqual([mergePdf]);
    expect(searchTools("", list)).toEqual([]);
  });
});

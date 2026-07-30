import { describe, expect, it } from "vitest";
import { searchSite } from "@/registry/search";

function appNames(results: ReturnType<typeof searchSite>): string[] {
  return results.filter((r) => r.kind === "application").map((r) => r.name);
}

function toolNames(results: ReturnType<typeof searchSite>): string[] {
  return results.filter((r) => r.kind === "tool").map((r) => r.tool.name);
}

describe("searchSite", () => {
  it('"PDF" surfaces PDF Studio (by name) ahead of every matching PDF tool', () => {
    const results = searchSite("PDF");
    expect(appNames(results)).toEqual(["PDF Studio"]);
    const names = toolNames(results);
    for (const expected of ["Merge PDF", "Split PDF", "Rotate PDF", "PDF to Images"]) {
      expect(names).toContain(expected);
    }
    // Applications rank before every tool result.
    expect(results[0].kind).toBe("application");
    const firstToolIndex = results.findIndex((r) => r.kind === "tool");
    const lastAppIndex = results.map((r) => r.kind).lastIndexOf("application");
    expect(lastAppIndex).toBeLessThan(firstToolIndex);
  });

  it('"CSV" surfaces Data Studio (via accepted file format, not by name) ahead of CSV tools', () => {
    const results = searchSite("CSV");
    expect(appNames(results)).toContain("Data Studio");
    expect(results[0]).toMatchObject({ kind: "application", name: "Data Studio" });
    const names = toolNames(results);
    for (const expected of ["CSV Viewer", "CSV to Excel Converter", "CSV to JSON Converter"]) {
      expect(names).toContain(expected);
    }
  });

  it('"Resize" surfaces Image Studio (via its one matching tool\'s owning app) then Resize Image', () => {
    const results = searchSite("Resize");
    expect(results).toEqual([
      { kind: "application", slug: "image-tools", name: "Image Studio", href: "/image-tools" },
      expect.objectContaining({ kind: "tool", tool: expect.objectContaining({ name: "Resize Image" }) }),
    ]);
  });

  it("matches an Application by one of its own capability labels", () => {
    // "Security" isn't in any tool's name/keywords, and isn't a file format —
    // it only exists as PDF Studio's own capability label.
    const results = searchSite("Security");
    expect(appNames(results)).toEqual(["PDF Studio"]);
  });

  it("matches Developer Toolkit via its own sub-category capability", () => {
    const results = searchSite("Encoding");
    expect(appNames(results)).toContain("Developer Toolkit");
  });

  it("deduplicates an Application matched through more than one signal", () => {
    // "csv" matches Data Studio's accepted format AND several of its own
    // tools (CSV Viewer, CSV to Excel, ...) — Data Studio must appear once.
    const results = searchSite("csv");
    const dataStudioCount = results.filter((r) => r.kind === "application" && r.name === "Data Studio").length;
    expect(dataStudioCount).toBe(1);
  });

  it("resolves Parquet Viewer's owning app through Data Studio's relatedEngines, not a direct engine match", () => {
    const results = searchSite("Parquet");
    expect(appNames(results)).toContain("Data Studio");
    expect(toolNames(results)).toContain("Parquet Viewer");
  });

  it("is case-insensitive and trims whitespace", () => {
    expect(searchSite("  pdf studio  ")).toEqual(searchSite("PDF Studio"));
  });

  it("returns nothing for an empty or whitespace-only query", () => {
    expect(searchSite("")).toEqual([]);
    expect(searchSite("   ")).toEqual([]);
  });

  it("returns nothing for a query matching no application or tool", () => {
    expect(searchSite("zzz-not-a-real-thing-zzz")).toEqual([]);
  });
});

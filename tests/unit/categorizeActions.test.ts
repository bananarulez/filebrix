import { describe, expect, it } from "vitest";
import { categorizeActions, GENERIC_TEXT_TOOL_SLUGS, hasAnyActions } from "@/lib/detect/categorizeActions";
import { getToolBySlug } from "@/registry";
import { makeTool } from "../helpers/toolFactory";

describe("categorizeActions", () => {
  it("groups tools into view/convert/edit/utility by their category", () => {
    const viewer = makeTool({ id: "excel-viewer", slug: "excel-viewer", category: "view" });
    const converter = makeTool({ id: "excel-to-csv", slug: "excel-to-csv", category: "convert" });
    const resize = makeTool({ id: "resize-image", slug: "resize-image", category: "edit" });
    const validator = makeTool({ id: "geojson-validator", slug: "geojson-validator", category: "utility" });

    const result = categorizeActions([viewer, converter, resize, validator]);

    expect(result.view).toEqual([viewer]);
    expect(result.convert).toEqual([converter]);
    expect(result.edit).toEqual([resize]);
    expect(result.utility).toEqual([validator]);
  });

  it("returns empty arrays for an empty input", () => {
    const result = categorizeActions([]);
    expect(result).toEqual({ view: [], convert: [], edit: [], utility: [] });
  });

  it("preserves the input order within each section", () => {
    const a = makeTool({ id: "a", category: "convert" });
    const b = makeTool({ id: "b", category: "convert" });
    const result = categorizeActions([b, a]);
    expect(result.convert).toEqual([b, a]);
  });
});

describe("hasAnyActions", () => {
  it("is false when every section is empty", () => {
    expect(hasAnyActions({ view: [], convert: [], edit: [], utility: [] })).toBe(false);
  });

  it("is true when any single section has a tool", () => {
    expect(hasAnyActions({ view: [], convert: [makeTool()], edit: [], utility: [] })).toBe(true);
  });
});

describe("GENERIC_TEXT_TOOL_SLUGS", () => {
  it("only names tools that actually exist in the real registry", () => {
    for (const slug of GENERIC_TEXT_TOOL_SLUGS) {
      expect(getToolBySlug(slug), `expected a real registered tool for slug "${slug}"`).toBeDefined();
    }
  });
});

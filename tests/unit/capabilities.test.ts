import { describe, expect, it } from "vitest";
import {
  getAllCapabilities,
  getCapabilitiesForStudio,
  getCapabilityConfig,
  getToolCapability,
  getToolsByCapability,
} from "@/registry/capabilities";
import { getToolBySlug } from "@/registry";

describe("getToolCapability", () => {
  it("reads appEntry.mode for a tool rendered by a Studio app", () => {
    expect(getToolCapability(getToolBySlug("merge")!)).toBe("pages");
    expect(getToolCapability(getToolBySlug("resize-image")!)).toBe("edit");
  });

  it("reads appEntry.mode for the JSON/XML/YAML tools too, which now deep-link into Data Studio", () => {
    // These 9 used to be the only Studio-owned tools rendering bespoke UI
    // (a colocated TextTransformTool wrapper) and so the only users of the
    // explicit `capability` field. They now render the shared Studio app in
    // the same mode, via appEntry — their capability, and therefore which
    // index page lists them, is unchanged either way.
    expect(getToolBySlug("json-formatter")!.appEntry?.mode).toBe("edit");
    expect(getToolCapability(getToolBySlug("json-formatter")!)).toBe("edit");
    expect(getToolCapability(getToolBySlug("json-validator")!)).toBe("analyze");
    expect(getToolCapability(getToolBySlug("yaml-to-json")!)).toBe("convert");
  });

  it("still falls back to an explicit capability field when a tool has no appEntry", () => {
    // No registered tool needs this today (every Studio-owned tool deep-links
    // via appEntry), but the fallback remains the supported escape hatch for a
    // Studio tool whose page renders genuinely bespoke UI — asserted directly
    // so the branch can't rot unnoticed. See ToolDefinition.capability.
    const bespoke = { ...getToolBySlug("json-formatter")!, appEntry: undefined, capability: "view" as const };
    expect(getToolCapability(bespoke)).toBe("view");
  });

  it("is undefined for a Developer Toolkit tool (indexed by devCategory instead)", () => {
    expect(getToolCapability(getToolBySlug("uuid-generator")!)).toBeUndefined();
  });
});

describe("getToolsByCapability", () => {
  it("groups a Studio's tools by capability", () => {
    const pages = getToolsByCapability("pdf-tools", "pages").map((tool) => tool.slug);
    expect(pages).toEqual(
      expect.arrayContaining(["merge", "split", "rotate", "extract-pages", "delete-pages", "reorder-pages"])
    );
    expect(pages).not.toContain("pdf-to-images"); // that's Convert
  });

  it("spans a Studio's multiple engines — Parquet Viewer counts as Data Studio's View", () => {
    const view = getToolsByCapability("data-studio", "view").map((tool) => tool.slug);
    expect(view).toContain("parquet-viewer"); // engine: "parquet", not "spreadsheet"
    expect(view).toContain("csv-viewer");
  });

  it("never returns a tool belonging to a different Application", () => {
    const dataConvert = getToolsByCapability("data-studio", "convert");
    expect(dataConvert.every((tool) => tool.engine === "spreadsheet" || tool.engine === "parquet")).toBe(true);
  });
});

describe("getAllCapabilities", () => {
  const capabilities = getAllCapabilities();

  it("generates an index page only for capabilities that have tools", () => {
    expect(capabilities.length).toBeGreaterThan(0);
    for (const capability of capabilities) {
      expect(capability.tools.length).toBeGreaterThan(0);
    }
  });

  it("omits Studio-only capabilities with no standalone tools", () => {
    const paths = capabilities.map((capability) => capability.path);
    // Placeholder/in-app-only capabilities — deliberately no index page.
    expect(paths).not.toContain("/pdf-tools/security");
    expect(paths).not.toContain("/image-tools/view");
  });

  it("includes Geospatial Studio's Analyze, which gained standalone tools", () => {
    // Analyze was deliberately page-less while it hosted only the in-app
    // summary view; adding GeoJSON Statistics gave it a real tool to index,
    // which is exactly the condition an index page is meant to track.
    const analyze = capabilities.find((capability) => capability.path === "/geospatial-tools/analyze");
    expect(analyze).toBeDefined();
    expect(analyze!.tools.length).toBeGreaterThan(0);
  });

  it("builds a self-consistent path, app name and label for each capability", () => {
    const pages = capabilities.find((capability) => capability.path === "/pdf-tools/pages")!;
    expect(pages.appName).toBe("PDF Studio");
    expect(pages.label).toBe("Pages");
    expect(pages.categorySlug).toBe("pdf-tools");
    expect(pages.description.length).toBeGreaterThan(20);
  });

  it("gives every capability a unique path", () => {
    const paths = capabilities.map((capability) => capability.path);
    expect(new Set(paths).size).toBe(paths.length);
  });
});

describe("getCapabilitiesForStudio", () => {
  it("returns only that Application's own capabilities", () => {
    const imageCapabilities = getCapabilitiesForStudio("image-tools");
    expect(imageCapabilities.map((capability) => capability.id).sort()).toEqual([
      "convert",
      "edit",
      "metadata",
    ]);
  });
});

describe("getCapabilityConfig", () => {
  it("resolves a registered capability", () => {
    expect(getCapabilityConfig("data-studio", "convert").path).toBe("/data-studio/convert");
  });

  it("throws for a capability with no index page, rather than rendering an empty one", () => {
    expect(() => getCapabilityConfig("pdf-tools", "security")).toThrow(/no capability index page/i);
  });
});

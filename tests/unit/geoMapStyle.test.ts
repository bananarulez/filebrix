import { describe, expect, it } from "vitest";
import { BASEMAP_LABELS, BASEMAP_STYLES, BASEMAP_TILE_HOST, DEFAULT_BASEMAP, type BasemapId } from "@/engines/geospatial/map/style";

function tileTemplates(id: BasemapId): string[] {
  const source = BASEMAP_STYLES[id].sources["basemap-tiles"];
  if (source.type !== "raster" || !("tiles" in source) || !source.tiles) {
    throw new Error(`basemap-tiles source for "${id}" isn't a raster source with tile URLs`);
  }
  return source.tiles;
}

describe("BASEMAP_STYLES", () => {
  it("defines exactly the 3 basemaps advertised in BASEMAP_LABELS", () => {
    const ids = Object.keys(BASEMAP_LABELS) as BasemapId[];
    expect(ids.sort()).toEqual(["dark", "light", "voyager"]);
    for (const id of ids) {
      expect(BASEMAP_STYLES[id]).toBeDefined();
    }
  });

  it("DEFAULT_BASEMAP is a real, defined style", () => {
    expect(BASEMAP_STYLES[DEFAULT_BASEMAP]).toBeDefined();
  });

  it("every basemap's tile URLs stay on the one CSP-allowed host", () => {
    for (const id of Object.keys(BASEMAP_STYLES) as BasemapId[]) {
      for (const url of tileTemplates(id)) {
        expect(new URL(url.replace("{z}", "0").replace("{x}", "0").replace("{y}", "0")).host).toMatch(
          new RegExp(`\\.${BASEMAP_TILE_HOST.replace(".", "\\.")}$`)
        );
      }
    }
  });

  it("tile URL templates use only real substitutable tokens — no unsubstituted {r}", () => {
    // Regression guard: an earlier version included a literal `{r}` retina
    // suffix that maplibre-gl's tile URL templating never actually
    // substitutes (only `{z}`/`{x}`/`{y}` and a few others are real
    // tokens), so every tile request carried a literal "{r}" in its path.
    for (const id of Object.keys(BASEMAP_STYLES) as BasemapId[]) {
      for (const url of tileTemplates(id)) {
        expect(url).not.toContain("{r}");
        expect(url).toContain("{z}");
        expect(url).toContain("{x}");
        expect(url).toContain("{y}");
      }
    }
  });

  it("light and dark basemaps use their own distinct CARTO tile path", () => {
    expect(tileTemplates("light")[0]).toContain("light_all");
    expect(tileTemplates("dark")[0]).toContain("dark_all");
    expect(tileTemplates("voyager")[0]).toContain("voyager");
  });
});

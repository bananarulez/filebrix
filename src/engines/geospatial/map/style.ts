import type { StyleSpecification } from "maplibre-gl";

/**
 * A plain data module — no runtime dependency on maplibre-gl itself (the
 * `StyleSpecification` import is type-only and erased at build time), so
 * it's safe to reference from anywhere without pulling MapLibre into a
 * bundle. Raster tiles (not vector) deliberately: they need no glyph/font
 * server and no extra CSP allowances beyond the tile host's `connect-src`.
 *
 * Free, no-API-key CARTO basemap tiles — see README.txt §17: this is the
 * only network request a geo tool ever makes, and it carries no user data
 * (no coordinates, geometries or properties), only tile z/x/y. All user
 * data is added as a local GeoJSON source on top of this basemap, never
 * sent anywhere.
 */
export const BASEMAP_TILE_HOST = "basemaps.cartocdn.com";

export type BasemapId = "light" | "dark" | "voyager";

export const DEFAULT_BASEMAP: BasemapId = "light";

export const BASEMAP_LABELS: Record<BasemapId, string> = {
  light: "Light",
  dark: "Dark",
  voyager: "Voyager",
};

const ATTRIBUTION =
  '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>';

/**
 * CARTO's free raster tile paths, all under the one already-CSP-allowed
 * host (`*.basemaps.cartocdn.com`) — switching basemaps needs no CSP
 * change. The URL templates deliberately omit `{r}`: an earlier version
 * included it as a retina/`@2x` suffix (a Leaflet.js convention CARTO's
 * own docs describe), but maplibre-gl's tile URL templating doesn't
 * recognize `{r}` as a substitutable token at all — only `{z}`/`{x}`/`{y}`
 * and a few others — so it was being requested completely literally.
 * CARTO's servers tolerated the literal string (tiles still loaded), but
 * there's no reason to keep a token that was never doing anything;
 * confirmed by testing without it — same successful tile loads, one fewer
 * malformed-looking URL to explain.
 */
function tileUrls(pathSegment: string): string[] {
  return ["a", "b", "c", "d"].map(
    (subdomain) => `https://${subdomain}.${BASEMAP_TILE_HOST}/${pathSegment}/{z}/{x}/{y}.png`
  );
}

function rasterStyle(pathSegment: string): StyleSpecification {
  return {
    version: 8,
    sources: {
      "basemap-tiles": {
        type: "raster",
        tiles: tileUrls(pathSegment),
        tileSize: 256,
        attribution: ATTRIBUTION,
      },
    },
    layers: [{ id: "basemap-layer", type: "raster", source: "basemap-tiles" }],
  };
}

export const BASEMAP_STYLES: Record<BasemapId, StyleSpecification> = {
  light: rasterStyle("light_all"),
  dark: rasterStyle("dark_all"),
  voyager: rasterStyle("rastertiles/voyager"),
};

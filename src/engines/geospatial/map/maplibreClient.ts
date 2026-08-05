import bbox from "@turf/bbox";
import type { GeoJSON } from "geojson";
import { BASEMAP_STYLES, DEFAULT_BASEMAP, type BasemapId } from "./style";
import type { BBox2D } from "../types";

type MaplibreModule = typeof import("maplibre-gl");
type MapInstance = import("maplibre-gl").Map;
type GeoJSONSourceInstance = import("maplibre-gl").GeoJSONSource;
type ExpressionSpecification = import("maplibre-gl").ExpressionSpecification;

let modulePromise: Promise<MaplibreModule> | null = null;

/**
 * MapLibre manages its own internal worker(s) for tile/geometry processing
 * (like DuckDB-WASM/pdf.js — see CLAUDE.md rule 4), so this talks to it
 * directly on the main thread rather than routing through
 * engines/shared/workerClient.ts. Lazy-loaded so it never lands in a
 * bundle for tools that don't render a map.
 *
 * `setWorkerUrl` points maplibre-gl at a self-hosted copy of its own worker
 * script (`public/maplibre/`, via `scripts/copy-maplibre-assets.mjs`)
 * instead of letting it compute the URL itself. This is required, not
 * defensive: maplibre-gl derives that URL from `new URL("./maplibre-gl-
 * worker.mjs", import.meta.url)`, which assumes its module is served from
 * the same directory as the worker file — true for the raw npm package,
 * false once Next.js/Turbopack bundles it into a hashed chunk URL with no
 * such sibling file. Confirmed empirically: with no override, the GeoJSON
 * source's `_workerID` never gets set and it never finishes loading — no
 * thrown error, no failed network request, since maplibre-gl's own
 * `getWorkerUrl()` short-circuits to `""` before attempting a fetch when
 * `import.meta.url` doesn't look like a real page URL. The raster basemap
 * renders fine regardless, since it doesn't need this worker — which is
 * what made this bug look like "the map works" while a dropped GeoJSON
 * file's features silently never appeared.
 */
async function getMaplibre(): Promise<MaplibreModule> {
  if (!modulePromise) {
    modulePromise = import("maplibre-gl").then((mod) => {
      mod.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
      return mod;
    });
  }
  return modulePromise;
}

const USER_DATA_SOURCE_ID = "user-data";
const EMPTY_FEATURE_COLLECTION: GeoJSON = { type: "FeatureCollection", features: [] };

// Every "in geometry-type" filter lists both the singular and Multi* form —
// harmless if the runtime already normalizes Multi* geometries down to the
// singular type for filtering purposes, necessary if it doesn't.
const POLYGON_TYPES = ["Polygon", "MultiPolygon"];
const LINE_TYPES = ["LineString", "MultiLineString"];
const POINT_TYPES = ["Point", "MultiPoint"];

/** `true` when this feature-state (a `["feature-state", "selected"]` read) is set — the shared highlight condition every layer's paint expression branches on. */
const IS_SELECTED: ExpressionSpecification = ["boolean", ["feature-state", "selected"], false];

export interface GeoMapHandle {
  /** Replaces the rendered user dataset. Never touches the network — MapLibre receives this as a local JS object. */
  setUserData(geojson: unknown): void;
  fitToBounds(bbox: BBox2D): void;
  /** Switches the basemap tile style in place, preserving the current user dataset and selection (styles wipe all sources/layers, so both are silently restored once the new style finishes loading). */
  setBasemap(id: BasemapId): void;
  /** Highlights one feature by its index in the last `setUserData` call (matching `generateId: true`'s insertion-order ids) and eases the camera to it without changing zoom. `null` clears the selection. */
  setSelectedFeature(index: number | null): Promise<void>;
  /** Re-reads the container's size. Needed after a change MapLibre can't observe for itself — entering or leaving fullscreen, where the container's height is swapped by React rather than animated. */
  resize(): void;
  destroy(): void;
}

export interface CreateGeoMapOptions {
  /**
   * Element to promote to fullscreen, when it isn't the map container itself.
   *
   * MapLibre defaults to `map.getContainer()`, which sounds right and isn't:
   * anything rendered as a *sibling* of that container — for us, the basemap
   * picker, kept outside it so React and MapLibre never fight over one node's
   * children — is outside the fullscreen subtree and simply stops being
   * displayed. Passing the wrapper that holds both keeps the picker reachable
   * at the size where choosing a basemap matters most.
   */
  fullscreenContainer?: HTMLElement | null;
}

export async function createGeoMap(
  container: HTMLElement,
  options: CreateGeoMapOptions = {}
): Promise<GeoMapHandle> {
  const maplibregl = await getMaplibre();
  const map: MapInstance = new maplibregl.Map({
    container,
    style: BASEMAP_STYLES[DEFAULT_BASEMAP],
    attributionControl: false,
  });
  map.addControl(new maplibregl.AttributionControl({ compact: true }));
  map.addControl(new maplibregl.NavigationControl(), "top-right");
  map.addControl(
    new maplibregl.FullscreenControl(
      options.fullscreenContainer ? { container: options.fullscreenContainer } : {}
    ),
    "top-right"
  );

  // Restored after any style swap (setBasemap wipes every source/layer) and
  // used to resolve a selected index back to real geometry for panning.
  let currentGeojson: GeoJSON = EMPTY_FEATURE_COLLECTION;
  let selectedId: number | null = null;

  function ensureLayers(): void {
    if (map.getSource(USER_DATA_SOURCE_ID)) return;
    // `generateId: true` assigns each feature a sequential numeric id in
    // array order (0, 1, 2, ...) without mutating the GeoJSON we were
    // handed — this is what setSelectedFeature's index-based API keys off,
    // via setFeatureState, rather than requiring every input file to carry
    // its own `id` field (most don't).
    map.addSource(USER_DATA_SOURCE_ID, {
      type: "geojson",
      data: EMPTY_FEATURE_COLLECTION,
      generateId: true,
    });
    map.addLayer({
      id: "user-fill",
      type: "fill",
      source: USER_DATA_SOURCE_ID,
      filter: ["in", ["geometry-type"], ["literal", POLYGON_TYPES]],
      paint: {
        "fill-color": ["case", IS_SELECTED, "#f97316", "#2563eb"],
        "fill-opacity": ["case", IS_SELECTED, 0.5, 0.25],
      },
    });
    map.addLayer({
      id: "user-polygon-outline",
      type: "line",
      source: USER_DATA_SOURCE_ID,
      filter: ["in", ["geometry-type"], ["literal", POLYGON_TYPES]],
      paint: {
        "line-color": ["case", IS_SELECTED, "#f97316", "#2563eb"],
        "line-width": ["case", IS_SELECTED, 4, 2],
      },
    });
    map.addLayer({
      id: "user-line",
      type: "line",
      source: USER_DATA_SOURCE_ID,
      filter: ["in", ["geometry-type"], ["literal", LINE_TYPES]],
      paint: {
        "line-color": ["case", IS_SELECTED, "#f97316", "#2563eb"],
        "line-width": ["case", IS_SELECTED, 5, 3],
      },
    });
    map.addLayer({
      id: "user-point",
      type: "circle",
      source: USER_DATA_SOURCE_ID,
      filter: ["in", ["geometry-type"], ["literal", POINT_TYPES]],
      paint: {
        "circle-color": ["case", IS_SELECTED, "#f97316", "#dc2626"],
        "circle-radius": ["case", IS_SELECTED, 8, 5],
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 1.5,
      },
    });
  }

  /**
   * Resolves once the current style has a loaded GeoJSON source+layers,
   * restoring data/selection first if this is a *second* style (i.e. after
   * setBasemap). Waits on `"style.load"`, not `"load"` — confirmed against
   * a real bug: `"load"` is the map's one-time "first visually complete
   * render" event and never fires again after `setStyle()`, so a version
   * of this waiting on `"load"` worked for the initial map but left every
   * `setBasemap()` call's `ready` promise permanently unresolved.
   *
   * The `"style.load"` listener is registered *before* `trigger()` runs
   * the actual style change (`setBasemap` passes `() => map.setStyle(...)`
   * as `trigger`), not after — confirmed empirically against a subtler
   * second bug: MapLibre's `setStyle()` diffs against the current style
   * and, when the diff can be applied without a full rebuild, fires
   * `"style.load"` *synchronously* inside that same `setStyle()` call
   * (`Style.setState()` in maplibre-gl's source). A version of this that
   * called `setStyle()` first and registered `map.once("style.load", ...)`
   * afterward could lose that synchronous event outright — verified with a
   * `setInterval`-based poll showing `isStyleLoaded()` flipping `true`
   * within one tick of `setStyle()` while a listener registered just after
   * it never fired at all, leaving the GeoJSON source/layers (and the
   * user's data) never restored to the new style. The synchronous
   * `isStyleLoaded()` fallback check below must equally run *after*
   * `trigger()`, not before — an earlier version of this fix called
   * `waitForLayers()` (whose fallback checked `isStyleLoaded()`
   * immediately) before `map.setStyle()`, which caught the *previous*
   * style's already-loaded state and resolved the promise before the new
   * style's swap had even started, permanently losing the real
   * post-switch event since `finish` had already run once. Threading
   * `trigger` through so it runs between listener registration and the
   * fallback check is what makes both edge cases safe at once, regardless
   * of which internal path — synchronous diff or async full reload — a
   * given style swap happens to take.
   */
  function waitForLayers(trigger?: () => void): Promise<void> {
    return new Promise((resolve) => {
      let settled = false;
      function finish() {
        if (settled) return;
        settled = true;
        ensureLayers();
        const source = map.getSource(USER_DATA_SOURCE_ID) as GeoJSONSourceInstance | undefined;
        source?.setData(currentGeojson);
        if (selectedId !== null) map.setFeatureState({ source: USER_DATA_SOURCE_ID, id: selectedId }, { selected: true });
        resolve();
      }
      map.once("style.load", finish);
      trigger?.();
      if (map.isStyleLoaded()) finish();
    });
  }

  let ready = waitForLayers();

  return {
    async setUserData(geojson: unknown) {
      currentGeojson = (geojson ?? EMPTY_FEATURE_COLLECTION) as GeoJSON;
      selectedId = null;
      await ready;
      const source = map.getSource(USER_DATA_SOURCE_ID) as GeoJSONSourceInstance | undefined;
      source?.setData(currentGeojson);
    },
    fitToBounds(bbox: BBox2D) {
      map.fitBounds(
        [
          [bbox[0], bbox[1]],
          [bbox[2], bbox[3]],
        ],
        { padding: 40, animate: false, maxZoom: 16 }
      );
    },
    setBasemap(id: BasemapId) {
      // trigger runs setStyle() between listener-registration and the
      // isStyleLoaded() fallback check inside waitForLayers — see its
      // comment for why both orderings matter here.
      ready = waitForLayers(() => map.setStyle(BASEMAP_STYLES[id]));
    },
    async setSelectedFeature(index: number | null) {
      await ready;
      if (selectedId !== null) {
        map.setFeatureState({ source: USER_DATA_SOURCE_ID, id: selectedId }, { selected: false });
      }
      selectedId = index;
      if (index === null) return;

      map.setFeatureState({ source: USER_DATA_SOURCE_ID, id: index }, { selected: true });

      // Pan to the feature without changing zoom, so a selection off-screen
      // (a dataset spanning a wide area, say) is actually revealed —
      // deliberately not fitBounds/flyTo, which would also rezoom.
      const feature =
        currentGeojson.type === "FeatureCollection" ? currentGeojson.features[index] : currentGeojson;
      if (!feature) return;
      try {
        // Indexed rather than destructured to match summarize.ts's own
        // handling: @turf/bbox returns a 6-tuple ([minX,minY,minZ,maxX,
        // maxY,maxZ]) for 3D geometry, so a positional [0,1,2,3] read is
        // only correct for 2D input — an existing, accepted simplification
        // in this codebase (most GeoJSON here is 2D), not something this
        // change introduces.
        const computed = bbox(feature as GeoJSON);
        const center: [number, number] = [(computed[0] + computed[2]) / 2, (computed[1] + computed[3]) / 2];
        map.easeTo({ center, duration: 300 });
      } catch {
        // A feature with no valid coordinates (null geometry, say) — highlighting still applied above, just no camera move.
      }
    },
    resize() {
      map.resize();
    },
    destroy() {
      map.remove();
    },
  };
}

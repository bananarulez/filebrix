"use client";

// This file is only ever reached via next/dynamic(..., { ssr: false }) from
// a tool component (see GeoJsonViewerTool/GpxViewerTool), so this static
// CSS import never lands in a bundle for pages that don't render a map —
// the dynamic-import boundary is at the *call site*, not here. The
// maplibre-gl JS module itself is lazy-loaded separately, inside
// engines/geospatial/map/maplibreClient.ts.
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import { createGeoMap, type GeoMapHandle } from "@/engines/geospatial/map/maplibreClient";
import { BASEMAP_LABELS, DEFAULT_BASEMAP, type BasemapId } from "@/engines/geospatial/map/style";
import type { BBox2D } from "@/engines/geospatial";

const BASEMAP_IDS = Object.keys(BASEMAP_LABELS) as BasemapId[];

interface GeoMapProps {
  geojson: unknown;
  bbox: BBox2D | null;
  height?: number;
  /** Index (into the last-rendered feature list, `generateId`-order) of the feature to highlight and pan to. `null`/`undefined` clears any highlight. */
  selectedFeatureIndex?: number | null;
}

/** Renders user geospatial data locally over an external raster basemap — see README.txt §17: only tile z/x/y ever leaves the browser, never the GeoJSON itself. */
export default function GeoMap({ geojson, bbox, height = 400, selectedFeatureIndex = null }: GeoMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<GeoMapHandle | null>(null);
  const [ready, setReady] = useState(false);
  const [basemapId, setBasemapId] = useState<BasemapId>(DEFAULT_BASEMAP);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let cancelled = false;
    createGeoMap(container).then((handle) => {
      if (cancelled) {
        handle.destroy();
        return;
      }
      handleRef.current = handle;
      setReady(true);
    });
    return () => {
      cancelled = true;
      handleRef.current?.destroy();
      handleRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!ready || !handleRef.current) return;
    handleRef.current.setUserData(geojson);
    if (bbox) handleRef.current.fitToBounds(bbox);
  }, [ready, geojson, bbox]);

  useEffect(() => {
    if (!ready || !handleRef.current) return;
    void handleRef.current.setSelectedFeature(selectedFeatureIndex);
  }, [ready, selectedFeatureIndex]);

  return (
    // The outer `relative` wrapper is what the basemap picker below
    // positions itself against — deliberately a *separate* element from
    // the div MapLibre mounts into. MapLibre appends its own children
    // (canvas, controls) into that inner div imperatively, outside React's
    // knowledge; giving that same div real React children too would mean
    // two systems mutating one DOM node's child list, a well-known source
    // of React/imperative-library conflicts. Keeping MapLibre's container
    // free of React children (as it always was) sidesteps that entirely.
    <div className="relative">
      <div
        ref={containerRef}
        style={{ height }}
        // `relative` is load-bearing, not decorative: MapLibre's own CSS
        // sets `.maplibregl-map { position: relative }` on this container
        // so its `position: absolute` canvas positions against it — but
        // MapLibre's `Map.remove()` unconditionally strips that class from
        // the container on teardown. In dev, React Strict Mode
        // double-invokes this effect, and the *cancelled* first instance's
        // cleanup can run after the *surviving* second instance has
        // already attached, stripping the class the live map still
        // depends on — confirmed empirically (only one `.maplibregl-canvas`
        // ends up in the DOM, but zero elements have `.maplibregl-map`).
        // Without an ancestor establishing a positioning context, the
        // canvas falls back to the viewport as its containing block,
        // rendering at the page's top-left instead of inside this box.
        // Setting `relative` here ourselves makes rendering correct
        // regardless of whether MapLibre's own class survives that race.
        className="relative w-full overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800"
        // Not `role="img"` (an earlier version used that): this now hosts
        // real interactive controls — MapLibre's own zoom/compass/
        // fullscreen buttons plus the basemap picker below — which
        // `role="img"` would hide from assistive tech by presenting the
        // whole subtree as one static image.
        role="region"
        aria-label="Interactive map"
      />
      <label className="absolute top-2 left-2 z-10">
        <span className="sr-only">Basemap style</span>
        <select
          value={basemapId}
          onChange={(event) => {
            const next = event.target.value as BasemapId;
            setBasemapId(next);
            handleRef.current?.setBasemap(next);
          }}
          className="rounded-md border border-gray-300 bg-white/95 px-2 py-1 text-xs font-medium text-gray-700 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-gray-700 dark:bg-gray-900/95 dark:text-gray-200"
        >
          {BASEMAP_IDS.map((id) => (
            <option key={id} value={id}>
              {BASEMAP_LABELS[id]}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

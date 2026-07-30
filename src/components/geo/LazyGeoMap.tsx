"use client";

import dynamic from "next/dynamic";

/**
 * The single dynamic-import boundary for MapLibre: every geo tool that
 * shows a map renders this instead of importing GeoMap directly, so
 * maplibre-gl (JS + CSS) only ever loads for someone actually viewing a
 * map, never for the KML/GPX converters, validator, simplifier or
 * coordinate converter (README.txt §40 / CLAUDE.md rule 4).
 */
export const LazyGeoMap = dynamic(() => import("./GeoMap"), {
  ssr: false,
  loading: () => (
    <div
      style={{ height: 400 }}
      className="flex w-full items-center justify-center rounded-lg border border-gray-200 text-sm text-gray-400 dark:border-gray-800"
    >
      Loading map…
    </div>
  ),
});

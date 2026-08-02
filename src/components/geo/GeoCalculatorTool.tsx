"use client";

import { useMemo, useState } from "react";
import { tileFor, utmZoneFor } from "@/engines/geospatial/convert/tiles";

export type GeoCalculatorMode = "utm-zone" | "tile";

/**
 * The two paste-first geospatial lookups — which UTM zone a coordinate falls
 * in, and which map tile covers it.
 *
 * One component with a `mode` prop rather than two near-identical ones: both
 * take a longitude/latitude pair and render a labelled result list, so the
 * only real difference is the extra zoom input and which pure function runs.
 * Same reasoning as `DiffTool`'s `mode` and `GeoConverterTool`'s `kind`.
 *
 * File-free, like `CoordinateConverterTool` — `actionNeedsFile()` returns
 * false for both, so the Studio hides its drop zone rather than implying a
 * file is needed.
 */
export function GeoCalculatorTool({ mode }: { mode: GeoCalculatorMode }) {
  const [longitude, setLongitude] = useState("14.4378");
  const [latitude, setLatitude] = useState("50.0755");
  const [zoom, setZoom] = useState("12");

  const result = useMemo(() => {
    const lon = Number(longitude);
    const lat = Number(latitude);
    if (longitude.trim() === "" || latitude.trim() === "") return null;

    try {
      if (mode === "utm-zone") {
        const utm = utmZoneFor(lon, lat);
        return {
          rows: [
            ["UTM zone", utm.label],
            ["Zone number", String(utm.zone)],
            ["Latitude band", utm.band],
            ["Hemisphere", utm.hemisphere === "N" ? "Northern" : "Southern"],
            ["EPSG code", `EPSG:${utm.epsg}`],
          ] as [string, string][],
          error: null,
        };
      }

      const tile = tileFor(lon, lat, Number(zoom));
      return {
        rows: [
          ["Tile (z/x/y)", tile.path],
          ["Zoom", String(tile.z)],
          ["X", String(tile.x)],
          ["Y", String(tile.y)],
          ["Y (TMS scheme)", String(tile.tmsY)],
          [
            "Tile bounds",
            `W ${tile.bounds.west.toFixed(6)}, S ${tile.bounds.south.toFixed(6)}, E ${tile.bounds.east.toFixed(
              6
            )}, N ${tile.bounds.north.toFixed(6)}`,
          ],
        ] as [string, string][],
        error: null,
      };
    } catch (cause) {
      return { rows: [], error: cause instanceof Error ? cause.message : "Could not compute a result." };
    }
  }, [mode, longitude, latitude, zoom]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-4 text-sm">
        <label className="flex flex-col gap-1">
          <span className="font-medium">Longitude</span>
          <input
            type="text"
            inputMode="decimal"
            value={longitude}
            onChange={(event) => setLongitude(event.target.value)}
            aria-label="Longitude"
            className="w-40 rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-medium">Latitude</span>
          <input
            type="text"
            inputMode="decimal"
            value={latitude}
            onChange={(event) => setLatitude(event.target.value)}
            aria-label="Latitude"
            className="w-40 rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
          />
        </label>
        {mode === "tile" && (
          <label className="flex flex-col gap-1">
            <span className="font-medium">Zoom</span>
            <input
              type="number"
              min={0}
              max={24}
              value={zoom}
              onChange={(event) => setZoom(event.target.value)}
              aria-label="Zoom"
              className="w-24 rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
            />
          </label>
        )}
      </div>

      {result?.error && (
        <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          {result.error}
        </p>
      )}

      {result && result.rows.length > 0 && (
        <dl className="grid grid-cols-1 gap-x-4 gap-y-2 rounded-lg border border-gray-200 p-4 text-sm sm:grid-cols-2 dark:border-gray-800">
          {result.rows.map(([label, value]) => (
            <div key={label}>
              <dt className="text-gray-500">{label}</dt>
              <dd className="font-mono font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      )}

      <p className="text-xs text-gray-500">
        {mode === "utm-zone"
          ? "Zone 32 is widened over southern Norway and Svalbard uses only zones 31, 33, 35 and 37 — both exceptions are applied here, so results match a real UTM grid rather than a plain 6° division."
          : "X/Y follow the usual XYZ (slippy map) scheme used by most tile servers; the TMS row gives the flipped Y that some older tooling expects."}
      </p>
    </div>
  );
}

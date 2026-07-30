"use client";

import { useEffect, useState } from "react";
import { ProcessingStatus } from "@/components/tools/ProcessingStatus";
import { ErrorPanel } from "@/components/tools/ErrorPanel";
import { DownloadResult } from "@/components/tools/DownloadResult";
import { LazyGeoMap } from "@/components/geo/LazyGeoMap";
import { deriveOutputFilename } from "@/lib/format/deriveOutputFilename";
import { ProcessingError, type ProcessingErrorCode } from "@/lib/errors/ProcessingError";
import {
  detectCrs,
  findCrsAnywhere,
  reprojectGeoJson,
  type CrsDetection,
  type CrsRef,
  type ReprojectOutcome,
} from "@/engines/geospatial";
import { CrsPicker } from "./CrsPicker";
import { useGeoWorkspace } from "./GeoWorkspace";

interface ToolError {
  message: string;
  code?: ProcessingErrorCode;
}

function errorFrom(cause: unknown, fallbackMessage: string): ToolError {
  if (cause instanceof ProcessingError) return { message: cause.message, code: cause.code };
  return { message: fallbackMessage };
}

/**
 * Reprojects a dataset between coordinate reference systems.
 *
 * Kept separate from `GeoOperationTool` (which covers the seven single-input
 * geometry/analysis operations) because the interaction is genuinely
 * different: two searchable CRS pickers, an auto-detection pass over the
 * file's own metadata, and a map preview that is only meaningful for a WGS 84
 * result.
 */
export function CrsConverterTool() {
  const { file, geojson, bbox } = useGeoWorkspace();

  const [detection, setDetection] = useState<CrsDetection | null>(null);
  const [source, setSource] = useState("EPSG:4326");
  const [target, setTarget] = useState("EPSG:3857");
  const [result, setResult] = useState<ReprojectOutcome | null>(null);
  const [error, setError] = useState<ToolError | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  // Re-read the CRS declaration whenever a new file loads.
  // Derived rather than stored: see fix note in GeoWorkspace's documentKey.
  const isDetecting = !detection && !error;

  useEffect(() => {
    if (!geojson) return;

    let cancelled = false;
    detectCrs(geojson)
      .then((detected) => {
        if (cancelled) return;
        setDetection(detected);
        // Only ever *adopt* a declared CRS, never guess one. A file with no
        // metadata keeps whatever the user last chose, so an unlabelled
        // projected file is never silently treated as WGS 84.
        if (detected.detected && detected.code) setSource(detected.code);
      })
      .catch(() => {
        if (!cancelled) setDetection(null);
      })
    return () => {
      cancelled = true;
    };
  }, [geojson]);

  /**
   * Turns whatever the picker holds into something the engine can use without
   * needing the full EPSG catalogue itself: a code is resolved here (against
   * the lazily-loaded index) and sent as `{ code, proj4 }`, while a pasted
   * proj4/WKT string is passed straight through. That keeps the 8,000-entry
   * index out of the worker entirely.
   */
  async function toRef(value: string): Promise<CrsRef> {
    const match = await findCrsAnywhere(value);
    return match ? { code: match.code, proj4: match.proj4 } : value;
  }

  async function handleConvert() {
    if (!geojson) return;
    setIsRunning(true);
    setResult(null);
    setError(null);
    try {
      const [from, to] = await Promise.all([toRef(source), toRef(target)]);
      setResult(await reprojectGeoJson(geojson, from, to));
    } catch (cause) {
      setError(errorFrom(cause, "Could not reproject this data."));
    } finally {
      setIsRunning(false);
    }
  }

  function swap() {
    setSource(target);
    setTarget(source);
    setResult(null);
  }

  // The workspace above renders the drop zone and any load error; this tool
  // only appears once there is something to reproject.
  if (!geojson) return null;

  const detectedNote = detection
    ? detection.detected
      ? `Detected ${detection.code} from the file's own CRS metadata.`
      : detection.raw
        ? `The file declares "${detection.raw}", which isn't a CRS this app recognises - choose one below.`
        : "This file declares no CRS. GeoJSON files without one are usually WGS 84, but projected exports often omit it - pick the right source before converting."
    : undefined;

  // The map only ever renders WGS 84 lon/lat, so previewing a projected
  // result would draw it in the wrong place (or off-world). Preview the
  // reprojected data only when the target is 4326; otherwise keep showing the
  // input, which is what the user can actually check against.
  const previewGeojson = result && result.to === "EPSG:4326" ? result.geojson : geojson;

  return (
    <div className="flex flex-col gap-4">
      {error && <ErrorPanel message={error.message} code={error.code} />}
      {isDetecting && <ProcessingStatus state="analyzing-schema" />}

      <div className="grid gap-3 sm:grid-cols-2">
        <CrsPicker id="crs-source" label="Source CRS" value={source} onChange={setSource} detectedNote={detectedNote} />
        <CrsPicker id="crs-target" label="Target CRS" value={target} onChange={setTarget} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void handleConvert()}
          disabled={isRunning}
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {isRunning ? "Converting…" : "Convert CRS"}
        </button>
        <button
          type="button"
          onClick={swap}
          className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:border-gray-400 hover:text-gray-900 dark:border-gray-700 dark:text-gray-300 dark:hover:text-white"
        >
          Swap source and target
        </button>
      </div>

      <LazyGeoMap geojson={previewGeojson} bbox={bbox} />

      {result && file && (
        <div className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4 dark:border-gray-800">
          <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-gray-500">From</dt>
              <dd className="text-lg font-semibold">{result.from}</dd>
            </div>
            <div>
              <dt className="text-gray-500">To</dt>
              <dd className="text-lg font-semibold">{result.to}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Features</dt>
              <dd className="text-lg font-semibold">{result.featureCount.toLocaleString()}</dd>
            </div>
          </div>

          {result.to !== "EPSG:4326" && (
            <p className="text-sm text-gray-600 dark:text-gray-300">
              The map above still shows the original data - a preview can only draw WGS 84 lon/lat, so a
              projected result would appear in the wrong place.
            </p>
          )}

          {result.warnings.length > 0 && (
            <ul className="flex flex-col gap-1 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
              {result.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          )}

          <DownloadResult
            filename={deriveOutputFilename(file.name, "geojson").replace(
              /\.geojson$/,
              `-${result.to.replace(":", "").toLowerCase()}.geojson`
            )}
            blob={new Blob([JSON.stringify(result.geojson, null, 2)], { type: "application/geo+json" })}
            label="Download reprojected GeoJSON"
          />
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { ErrorPanel } from "@/components/tools/ErrorPanel";
import { DownloadResult } from "@/components/tools/DownloadResult";
import { LazyGeoMap } from "@/components/geo/LazyGeoMap";
import { deriveOutputFilename } from "@/lib/format/deriveOutputFilename";
import { ProcessingError, type ProcessingErrorCode } from "@/lib/errors/ProcessingError";
import { simplifyGeoJson } from "@/engines/geospatial";
import { useGeoWorkspace } from "./GeoWorkspace";

interface ToolError {
  message: string;
  code?: ProcessingErrorCode;
}

function errorFrom(cause: unknown, fallbackMessage: string): ToolError {
  if (cause instanceof ProcessingError) return { message: cause.message, code: cause.code };
  return { message: fallbackMessage };
}

const TOLERANCE_PRESETS = [
  { label: "Light (0.0001°)", value: 0.0001 },
  { label: "Medium (0.001°)", value: 0.001 },
  { label: "Aggressive (0.01°)", value: 0.01 },
];

export function GeoJsonSimplifierTool() {
  const { file, geojson, bbox } = useGeoWorkspace();
  const [tolerance, setTolerance] = useState(0.001);
  const [highQuality, setHighQuality] = useState(false);
  const [isSimplifying, setIsSimplifying] = useState(false);
  const [error, setError] = useState<ToolError | null>(null);
  const [simplified, setSimplified] = useState<{ geojson: unknown; before: number; after: number } | null>(null);

  // A newly-loaded file invalidates the previous simplification.
  useEffect(() => {
  }, [geojson]);

  async function handleSimplify() {
    if (!geojson) return;
    setIsSimplifying(true);
    setError(null);
    try {
      const outcome = await simplifyGeoJson(geojson, tolerance, highQuality);
      setSimplified({ geojson: outcome.geojson, before: outcome.beforeVertexCount, after: outcome.afterVertexCount });
    } catch (cause) {
      setError(errorFrom(cause, "Could not simplify this GeoJSON file."));
    } finally {
      setIsSimplifying(false);
    }
  }

  const reduction =
    simplified && simplified.before > 0
      ? Math.round((1 - simplified.after / simplified.before) * 100)
      : null;

  return (
    <div className="flex flex-col gap-4">
      {error && <ErrorPanel message={error.message} code={error.code} />}

      {geojson !== null && (
        <div className="flex flex-col gap-4">
          <fieldset className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4 text-sm dark:border-gray-800">
            <legend className="px-1 font-medium">Simplification tolerance</legend>
            <div className="flex flex-wrap gap-2">
              {TOLERANCE_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setTolerance(preset.value)}
                  className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
                    tolerance === preset.value
                      ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                      : "border-gray-200 text-gray-600 hover:border-gray-400 dark:border-gray-700 dark:text-gray-300"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <label className="flex flex-col gap-1">
              <span>Custom tolerance (in coordinate degrees)</span>
              <input
                type="number"
                min={0}
                step={0.0001}
                value={tolerance}
                onChange={(event) => setTolerance(Number(event.target.value) || 0)}
                className="w-40 rounded-md border border-gray-300 px-2 py-1 dark:border-gray-700 dark:bg-gray-900"
              />
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={highQuality} onChange={(event) => setHighQuality(event.target.checked)} />
              High quality (slower, better shape preservation)
            </label>
            <button
              type="button"
              onClick={() => void handleSimplify()}
              disabled={isSimplifying}
              className="inline-flex w-fit items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {isSimplifying ? "Simplifying…" : "Simplify"}
            </button>
          </fieldset>

          <LazyGeoMap geojson={simplified?.geojson ?? geojson} bbox={bbox} />

          {simplified && file && (
            <div className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4 dark:border-gray-800">
              <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-gray-500">Vertices before</dt>
                  <dd className="text-lg font-semibold">{simplified.before.toLocaleString()}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Vertices after</dt>
                  <dd className="text-lg font-semibold">{simplified.after.toLocaleString()}</dd>
                </div>
                {reduction !== null && (
                  <div>
                    <dt className="text-gray-500">Reduction</dt>
                    <dd className="text-lg font-semibold">{reduction}%</dd>
                  </div>
                )}
              </div>
              <DownloadResult
                filename={deriveOutputFilename(file.name, "geojson")}
                blob={new Blob([JSON.stringify(simplified.geojson, null, 2)], { type: "application/geo+json" })}
                label="Download simplified GeoJSON"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

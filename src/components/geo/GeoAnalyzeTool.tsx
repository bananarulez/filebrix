"use client";

import { useEffect, useState } from "react";
import { ProcessingStatus } from "@/components/tools/ProcessingStatus";
import { ErrorPanel } from "@/components/tools/ErrorPanel";
import { ProcessingError, type ProcessingErrorCode } from "@/lib/errors/ProcessingError";
import { summarizeGeoJson, validateGeoJson, type GeoJsonSummary, type ValidationResult } from "@/engines/geospatial";
import { useGeoWorkspace } from "./GeoWorkspace";

interface ToolError {
  message: string;
  code?: ProcessingErrorCode;
}

function errorFrom(cause: unknown, fallbackMessage: string): ToolError {
  if (cause instanceof ProcessingError) return { message: cause.message, code: cause.code };
  return { message: fallbackMessage };
}

function formatBBox(bbox: GeoJsonSummary["bbox"]): string {
  if (!bbox) return "Unavailable";
  return bbox.map((value) => value.toFixed(5)).join(", ");
}

/**
 * Geospatial Studio's Analyze tab — genuinely new UI, zero new engine code.
 * Composes two already-exported functions (`summarizeGeoJson`,
 * `validateGeoJson`) that `GeoJsonViewerTool`/`GeoJsonValidatorTool` already
 * use individually; this tab just shows both at once, read-only (no repair
 * action here — repairing stays Edit-tab-only). Accepts GeoJSON/KML/GPX via
 * the shared `parseAnyGeoFile` helper, same as the widened Viewer.
 */
export function GeoAnalyzeTool() {
  const { geojson } = useGeoWorkspace();
  const [summary, setSummary] = useState<GeoJsonSummary | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<ToolError | null>(null);

  // Derived rather than stored: see fix note in GeoWorkspace's documentKey.
  const isAnalyzing = !summary && !error;

  useEffect(() => {
    if (!geojson) return;

    let cancelled = false;
    Promise.all([summarizeGeoJson(geojson), validateGeoJson(geojson)])
      .then(([summaryResult, validationResult]) => {
        if (cancelled) return;
        setSummary(summaryResult);
        setValidation(validationResult);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(errorFrom(cause, "Could not analyze this file."));
      })
    return () => {
      cancelled = true;
    };
  }, [geojson]);

  // The workspace above renders the drop zone and any load error; this tab
  // only shows results once a document is loaded.
  if (!geojson) return null;

  return (
    <div className="flex flex-col gap-4">
      {isAnalyzing && <ProcessingStatus state="analyzing-schema" />}
      {error && <ErrorPanel message={error.message} code={error.code} />}

      {summary && validation && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4 rounded-lg border border-gray-200 p-4 text-sm dark:border-gray-800 sm:grid-cols-3">
            <div>
              <dt className="text-gray-500">Features</dt>
              <dd className="text-lg font-semibold">{summary.featureCount.toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Geometry types</dt>
              <dd className="text-sm font-medium">
                {Object.entries(summary.geometryTypeCounts)
                  .map(([type, count]) => `${type} (${count})`)
                  .join(", ")}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">CRS</dt>
              <dd className="text-sm font-medium">WGS84 (EPSG:4326)</dd>
            </div>
            <div className="col-span-2 sm:col-span-3">
              <dt className="text-gray-500">Bounding box</dt>
              <dd className="font-mono text-xs">{formatBBox(summary.bbox)}</dd>
            </div>
          </div>

          <p className="text-xs text-gray-500">
            CRS is shown as a constant, not detected per file: GeoJSON is always WGS84 decimal degrees per RFC 7946,
            and KML/GPX files are normalized to the same coordinate reference when read here.
          </p>

          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">Attribute summary</h3>
            {summary.propertyKeys.length === 0 ? (
              <p className="text-sm text-gray-500">No properties found on any feature.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {summary.propertyKeys.map((key) => (
                  <span
                    key={key}
                    className="rounded-full border border-gray-200 px-2.5 py-1 text-xs font-medium dark:border-gray-700"
                  >
                    {key}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">Validation status</h3>
            {validation.issues.length === 0 ? (
              <p className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-900/50 dark:bg-green-950/30 dark:text-green-300">
                Structurally valid — no problems found.
              </p>
            ) : (
              <>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {validation.valid ? "Valid, with some warnings" : "Structural problems found"} (
                  {validation.issues.length}). Use the Edit tab&rsquo;s Repair action to fix what&rsquo;s
                  auto-fixable.
                </p>
                <ul className="flex flex-col gap-2">
                  {validation.issues.map((issue, index) => (
                    <li
                      key={index}
                      className={`rounded-md border px-3 py-2 text-sm ${
                        issue.severity === "error"
                          ? "border-red-200 bg-red-50 text-red-900 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200"
                          : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200"
                      }`}
                    >
                      <span className="font-medium uppercase">{issue.severity}</span> — {issue.message}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

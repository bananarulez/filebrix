"use client";

import { useEffect, useState } from "react";
import { ProcessingStatus } from "@/components/tools/ProcessingStatus";
import { ErrorPanel } from "@/components/tools/ErrorPanel";
import { ProcessingError, type ProcessingErrorCode } from "@/lib/errors/ProcessingError";
import { featureStatistics, type FeatureStatistics } from "@/engines/geospatial";
import { useGeoWorkspace } from "./GeoWorkspace";

interface ToolError {
  message: string;
  code?: ProcessingErrorCode;
}

function errorFrom(cause: unknown, fallbackMessage: string): ToolError {
  if (cause instanceof ProcessingError) return { message: cause.message, code: cause.code };
  return { message: fallbackMessage };
}

/** Metres → a human-scale string; kilometres past 1 km, metres below. */
function formatLength(meters: number): string {
  if (meters <= 0) return "—";
  if (meters >= 1000) return `${(meters / 1000).toLocaleString(undefined, { maximumFractionDigits: 2 })} km`;
  return `${meters.toLocaleString(undefined, { maximumFractionDigits: 1 })} m`;
}

/** Square metres → km² past 1 km², hectares past 1 ha, m² below. */
function formatArea(squareMeters: number): string {
  if (squareMeters <= 0) return "—";
  if (squareMeters >= 1_000_000) {
    return `${(squareMeters / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 })} km²`;
  }
  if (squareMeters >= 10_000) {
    return `${(squareMeters / 10_000).toLocaleString(undefined, { maximumFractionDigits: 2 })} ha`;
  }
  return `${squareMeters.toLocaleString(undefined, { maximumFractionDigits: 1 })} m²`;
}

function formatNumber(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return "—";
  return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

/**
 * Whole-dataset statistics for the Analyze tab — counts, geometry breakdown,
 * total length/area, extent, CRS and per-attribute summaries.
 *
 * Read-only: the one Analyze action that produces no downloadable geometry,
 * so it renders no map and no download button. The file itself comes from
 * the shared `GeoWorkspace`, so it survives tab switches.
 */
export function GeoStatisticsTool() {
  const { geojson } = useGeoWorkspace();
  const [stats, setStats] = useState<FeatureStatistics | null>(null);
  const [error, setError] = useState<ToolError | null>(null);

  // Derived rather than stored: see fix note in GeoWorkspace's documentKey.
  const isComputing = !stats && !error;

  useEffect(() => {
    if (!geojson) return;
    let cancelled = false;
    featureStatistics(geojson)
      .then((result) => {
        if (!cancelled) setStats(result);
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setStats(null);
          setError(errorFrom(cause, "Could not analyze this file."));
        }
      })
    return () => {
      cancelled = true;
    };
  }, [geojson]);

  if (!geojson) return null;

  return (
    <div className="flex flex-col gap-4">
      {isComputing && <ProcessingStatus state="analyzing-schema" />}
      {error && <ErrorPanel message={error.message} code={error.code} />}

      {stats && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4 rounded-lg border border-gray-200 p-4 text-sm dark:border-gray-800 sm:grid-cols-4">
            <div>
              <dt className="text-gray-500">Features</dt>
              <dd className="text-lg font-semibold">{stats.featureCount.toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Vertices</dt>
              <dd className="text-lg font-semibold">{stats.vertexCount.toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Total length</dt>
              <dd className="text-lg font-semibold">{formatLength(stats.totalLengthMeters)}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Total area</dt>
              <dd className="text-lg font-semibold">{formatArea(stats.totalAreaSquareMeters)}</dd>
            </div>
          </div>

          <div className="flex flex-col gap-2 rounded-lg border border-gray-200 p-4 text-sm dark:border-gray-800">
            <h3 className="font-medium">Geometry types</h3>
            <ul className="flex flex-wrap gap-2">
              {Object.entries(stats.geometryTypeCounts).map(([type, count]) => (
                <li
                  key={type}
                  className="rounded-full border border-gray-200 px-2.5 py-1 text-xs dark:border-gray-700"
                >
                  {type === "null" ? "No geometry" : type} ({count.toLocaleString()})
                </li>
              ))}
            </ul>

            <h3 className="mt-2 font-medium">Coordinate system</h3>
            <p className="text-gray-600 dark:text-gray-300">
              {stats.analyzedCrs} — lengths and areas are computed geodesically on that assumption. Reproject
              with the CRS Converter first if your data is in a projected system.
            </p>

            {stats.bbox && (
              <>
                <h3 className="mt-2 font-medium">Bounding box</h3>
                <p className="font-mono text-xs text-gray-600 dark:text-gray-300">
                  west {stats.bbox[0]}, south {stats.bbox[1]}, east {stats.bbox[2]}, north {stats.bbox[3]}
                </p>
              </>
            )}

            {stats.nullGeometryCount > 0 && (
              <p className="text-amber-700 dark:text-amber-400">
                {stats.nullGeometryCount.toLocaleString()} feature
                {stats.nullGeometryCount === 1 ? " has" : "s have"} no geometry and are excluded from the
                measurements above.
              </p>
            )}
          </div>

          {stats.attributes.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-medium">Attributes</h3>
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
                <table className="w-full border-collapse text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      {["Attribute", "Present", "Missing", "Distinct", "Min", "Max", "Mean"].map((heading) => (
                        <th
                          key={heading}
                          className="border-b border-gray-200 px-3 py-2 text-left font-medium dark:border-gray-800"
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stats.attributes.map((attribute) => (
                      <tr key={attribute.key}>
                        <td className="border-b border-gray-100 px-3 py-2 font-mono text-xs dark:border-gray-900">
                          {attribute.key}
                        </td>
                        <td className="border-b border-gray-100 px-3 py-2 dark:border-gray-900">
                          {attribute.presentCount.toLocaleString()}
                        </td>
                        <td className="border-b border-gray-100 px-3 py-2 dark:border-gray-900">
                          {attribute.missingCount.toLocaleString()}
                        </td>
                        <td className="border-b border-gray-100 px-3 py-2 dark:border-gray-900">
                          {attribute.distinctCount.toLocaleString()}
                        </td>
                        <td className="border-b border-gray-100 px-3 py-2 dark:border-gray-900">
                          {formatNumber(attribute.min)}
                        </td>
                        <td className="border-b border-gray-100 px-3 py-2 dark:border-gray-900">
                          {formatNumber(attribute.max)}
                        </td>
                        <td className="border-b border-gray-100 px-3 py-2 dark:border-gray-900">
                          {formatNumber(attribute.mean)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

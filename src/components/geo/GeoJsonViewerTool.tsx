"use client";

import { useEffect, useMemo, useState } from "react";
import { ProcessingStatus } from "@/components/tools/ProcessingStatus";
import { ErrorPanel } from "@/components/tools/ErrorPanel";
import { VirtualizedTable } from "@/components/tools/VirtualizedTable";
import { LazyGeoMap } from "@/components/geo/LazyGeoMap";
import { ProcessingError, type ProcessingErrorCode } from "@/lib/errors/ProcessingError";
import { summarizeGeoJson, type GeoJsonSummary } from "@/engines/geospatial";
import { asRecord, extractFeatureList, isPosition } from "@/engines/geospatial/ops/shape";
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

function formatCell(value: unknown): string {
  return value === undefined || value === null ? "" : String(value);
}

/** The feature's actual geometry type (Point, Polygon, ...) — shown as its own table column regardless of how (or whether) a file's own properties name each feature, since a "name" property is free-text and can't be relied on to say what a feature actually is. */
function geometryTypeLabel(feature: unknown): string {
  const geometry = asRecord(asRecord(feature)?.geometry);
  return geometry && typeof geometry.type === "string" ? geometry.type : "—";
}

interface SelectedFeatureDetail {
  geometryType: string;
  /** A short "lat, lng" line for a Point; the raw coordinate structure (pretty-printed) for every other geometry type, since there's no one-line summary that stays correct for a Polygon's nested rings. */
  detail: string;
}

function describeSelectedFeature(feature: unknown): SelectedFeatureDetail | null {
  const featureRecord = asRecord(feature);
  const geometry = featureRecord ? asRecord(featureRecord.geometry) : null;
  if (!geometry || typeof geometry.type !== "string") return null;

  if (geometry.type === "Point" && isPosition(geometry.coordinates)) {
    const [lng, lat] = geometry.coordinates as number[];
    return { geometryType: geometry.type, detail: `${lat.toFixed(6)}, ${lng.toFixed(6)} (lat, lng)` };
  }
  return { geometryType: geometry.type, detail: JSON.stringify(geometry.coordinates, null, 2) };
}

interface GeoJsonViewerToolProps {
  /** When true, also accepts and renders KML files (converted through the
   * existing `kmlTextToGeoJson()` before running through this exact same
   * stats/map/property-table rendering) — used by Geospatial Studio's
   * unlocked View tab. Defaults to false, preserving the locked
   * `/geo/geojson-viewer` page's exact current GeoJSON-only behavior. */
  acceptKml?: boolean;
}

export function GeoJsonViewerTool({ acceptKml = false }: GeoJsonViewerToolProps) {
  const { geojson, sourceFormat } = useGeoWorkspace();
  const [summary, setSummary] = useState<GeoJsonSummary | null>(null);
  const [error, setError] = useState<ToolError | null>(null);
  const [selectedFeatureIndex, setSelectedFeatureIndex] = useState<number | null>(null);

  /**
   * `acceptKml` used to decide which parser ran; the workspace now detects
   * the format up front, so it only decides whether a KML document is
   * *accepted* here. `/geo/geojson-viewer` passes false to keep its narrow
   * SEO promise ("GeoJSON Viewer") true.
   */
  const rejectsThisFormat = !acceptKml && sourceFormat !== null && sourceFormat !== "geojson";

  // Derived rather than stored: see fix note in GeoWorkspace's documentKey.
  const isSummarizing = !summary && !error && !rejectsThisFormat;

  useEffect(() => {
    if (!geojson || rejectsThisFormat) return;

    let cancelled = false;
    summarizeGeoJson(geojson)
      .then((result) => {
        if (!cancelled) setSummary(result);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(errorFrom(cause, "Could not read this GeoJSON file."));
      })
    return () => {
      cancelled = true;
    };
  }, [geojson, rejectsThisFormat]);

  /**
   * The full feature list, derived straight from the in-memory document
   * rather than from `summary.propertyPreview` (which caps at 5 features).
   * `extractFeatureList`/`asRecord` are pure, dependency-free helpers, so
   * they're imported directly instead of routed through the worker.
   */
  const features = useMemo(() => {
    const record = asRecord(geojson);
    const extracted = record ? extractFeatureList(record) : null;
    return extracted?.features ?? [];
  }, [geojson]);

  const tableColumns = useMemo(
    () => ["Type", ...(summary?.propertyKeys ?? [])],
    [summary]
  );

  const tableRows = useMemo(
    () =>
      features.map((feature) => [
        geometryTypeLabel(feature),
        ...(summary?.propertyKeys ?? []).map((key) =>
          formatCell(asRecord(asRecord(feature)?.properties)?.[key])
        ),
      ]),
    [features, summary]
  );

  const selectedDetail =
    selectedFeatureIndex === null ? null : describeSelectedFeature(features[selectedFeatureIndex]);


  if (!geojson) return null;

  return (
    <div className="flex flex-col gap-4">
      {rejectsThisFormat && (
        <ErrorPanel message="This viewer only opens GeoJSON files. Use Geospatial Studio's View tab to open KML." />
      )}
      {isSummarizing && <ProcessingStatus state="analyzing-schema" />}
      {error && <ErrorPanel message={error.message} code={error.code} />}

      {summary && (
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
            <div className="col-span-2 sm:col-span-1">
              <dt className="text-gray-500">Bounding box</dt>
              <dd className="font-mono text-xs">{formatBBox(summary.bbox)}</dd>
            </div>
          </div>

          {summary.warnings.length > 0 && (
            <ul className="flex flex-col gap-1 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
              {summary.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          )}

          <LazyGeoMap geojson={geojson} bbox={summary.bbox} selectedFeatureIndex={selectedFeatureIndex} />

          {selectedDetail && (
            <div className="flex flex-col gap-2 rounded-lg border border-orange-200 bg-orange-50 p-4 text-sm dark:border-orange-900/50 dark:bg-orange-950/30">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-medium">
                  Selected feature — {selectedDetail.geometryType}
                  {selectedFeatureIndex !== null ? ` (#${selectedFeatureIndex + 1})` : ""}
                </h3>
                <button
                  type="button"
                  onClick={() => setSelectedFeatureIndex(null)}
                  className="rounded-md border border-orange-300 px-2 py-1 text-xs font-medium text-orange-800 hover:bg-orange-100 dark:border-orange-800 dark:text-orange-200 dark:hover:bg-orange-900/40"
                >
                  Clear selection
                </button>
              </div>
              <pre className="max-h-40 overflow-auto rounded-md bg-white/70 p-2 font-mono text-xs whitespace-pre-wrap dark:bg-gray-950/40">
                {selectedDetail.detail}
              </pre>
            </div>
          )}

          {features.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-medium">
                Features ({features.length.toLocaleString()}) — click a row to highlight it on the map
              </h3>
              <VirtualizedTable
                columns={tableColumns}
                rows={tableRows}
                onRowClick={setSelectedFeatureIndex}
                selectedRowIndex={selectedFeatureIndex}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

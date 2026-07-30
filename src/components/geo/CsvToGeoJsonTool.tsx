"use client";

import { useMemo, useState } from "react";
import { ProcessingStatus } from "@/components/tools/ProcessingStatus";
import { ErrorPanel } from "@/components/tools/ErrorPanel";
import { DownloadResult } from "@/components/tools/DownloadResult";
import { VirtualizedTable } from "@/components/tools/VirtualizedTable";
import { LazyGeoMap } from "@/components/geo/LazyGeoMap";
import { deriveOutputFilename } from "@/lib/format/deriveOutputFilename";
import { ProcessingError, type ProcessingErrorCode } from "@/lib/errors/ProcessingError";
import { csvTableToGeoJson, detectLatLonColumns, summarizeGeoJson, type BBox2D } from "@/engines/geospatial";
import type { CellValue } from "@/engines/spreadsheet";
import { useGeoWorkspace } from "./GeoWorkspace";

interface ToolError {
  message: string;
  code?: ProcessingErrorCode;
}

function errorFrom(cause: unknown, fallbackMessage: string): ToolError {
  if (cause instanceof ProcessingError) return { message: cause.message, code: cause.code };
  return { message: fallbackMessage };
}

function formatCellForDisplay(value: CellValue): string | number | null {
  if (value === null) return null;
  if (value instanceof Date) return value.toLocaleString();
  if (typeof value === "boolean") return value ? "true" : "false";
  return value;
}

export function CsvToGeoJsonTool() {
  const { file, csvTable: table } = useGeoWorkspace();
  /**
   * The auto-detected columns are a pure function of the loaded table, so
   * they're derived rather than synced through an effect. `latOverride`
   * holds only the user's explicit choice, which takes precedence when set.
   */
  const guess = useMemo(() => (table ? detectLatLonColumns(table.columns) : null), [table]);
  const [latOverride, setLatColumn] = useState<string | null>(null);
  const [lonOverride, setLonColumn] = useState<string | null>(null);
  const latColumn = latOverride ?? guess?.latColumn ?? table?.columns[0] ?? null;
  const lonColumn = lonOverride ?? guess?.lonColumn ?? table?.columns[1] ?? null;
  const [geojson, setGeojson] = useState<unknown>(null);
  const [bbox, setBbox] = useState<BBox2D | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<ToolError | null>(null);
  const [isConverting, setIsConverting] = useState(false);


  async function handleConvert() {
    if (!table || !latColumn || !lonColumn) return;
    setIsConverting(true);
    try {
      const outcome = await csvTableToGeoJson(table, latColumn, lonColumn);
      setGeojson(outcome.geojson);
      setWarnings(outcome.warnings);
      const summary = await summarizeGeoJson(outcome.geojson);
      setBbox(summary.bbox);
    } catch (cause) {
      setError(errorFrom(cause, "Could not convert this CSV file."));
    } finally {
      setIsConverting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {isConverting && <ProcessingStatus state="converting" />}
      {error && <ErrorPanel message={error.message} code={error.code} />}

      {table && (
        <div className="flex flex-col gap-4">
          <fieldset className="flex flex-wrap items-end gap-4 rounded-lg border border-gray-200 p-4 text-sm dark:border-gray-800">
            <legend className="px-1 font-medium">Choose the coordinate columns</legend>
            <label className="flex flex-col gap-1">
              <span>Latitude column</span>
              <select
                value={latColumn ?? ""}
                onChange={(event) => setLatColumn(event.target.value)}
                className="rounded-md border border-gray-300 px-2 py-1.5 dark:border-gray-700 dark:bg-gray-900"
              >
                {table.columns.map((column) => (
                  <option key={column} value={column}>
                    {column}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span>Longitude column</span>
              <select
                value={lonColumn ?? ""}
                onChange={(event) => setLonColumn(event.target.value)}
                className="rounded-md border border-gray-300 px-2 py-1.5 dark:border-gray-700 dark:bg-gray-900"
              >
                {table.columns.map((column) => (
                  <option key={column} value={column}>
                    {column}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => void handleConvert()}
              disabled={!latColumn || !lonColumn || isConverting}
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {isConverting ? "Converting…" : "Convert to GeoJSON"}
            </button>
          </fieldset>

          <VirtualizedTable
            columns={table.columns}
            rows={table.rows.slice(0, 50).map((row) => row.map(formatCellForDisplay))}
            height={240}
          />
        </div>
      )}

      {geojson !== null && file && (
        <div className="flex flex-col gap-3">
          {warnings.length > 0 && (
            <ul className="flex flex-col gap-1 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          )}
          <LazyGeoMap geojson={geojson} bbox={bbox} />
          <DownloadResult
            filename={deriveOutputFilename(file.name, "geojson")}
            blob={new Blob([JSON.stringify(geojson, null, 2)], { type: "application/geo+json" })}
            label="Download .geojson"
          />
        </div>
      )}
    </div>
  );
}

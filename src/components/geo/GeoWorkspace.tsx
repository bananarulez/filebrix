"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { FileDropZone } from "@/components/tools/FileDropZone";
import { FileInfo } from "@/components/tools/FileInfo";
import { ProcessingStatus } from "@/components/tools/ProcessingStatus";
import { ErrorPanel } from "@/components/tools/ErrorPanel";
import { ProcessingError, type ProcessingErrorCode } from "@/lib/errors/ProcessingError";
import { detectFileType } from "@/lib/detect/detectFile";
import { parseCsvFile, summarizeGeoJson, type BBox2D } from "@/engines/geospatial";
import type { NormalizedTable } from "@/engines/spreadsheet";
import { parseAnyGeoFile } from "./parseAnyGeoFile";
import { forgetWorkspaceFiles, recallWorkspaceFiles, rememberWorkspaceFiles } from "@/lib/workspaceFiles";

/**
 * Every format the Studio's single drop zone accepts. `csv` is included
 * because CSV to GeoJSON is a Convert action — it's a source format here,
 * never a geometry document.
 */
export type GeoWorkspaceFormat = "geojson" | "topojson" | "kml" | "kmz" | "gpx" | "shapefile" | "csv";

export const GEO_WORKSPACE_ACCEPT = ".geojson,.json,.topojson,.kml,.kmz,.gpx,.zip,.csv";

const FORMAT_LABEL: Record<GeoWorkspaceFormat, string> = {
  geojson: "GeoJSON",
  topojson: "TopoJSON",
  kml: "KML",
  kmz: "KMZ",
  gpx: "GPX",
  shapefile: "Shapefile",
  csv: "CSV",
};

interface WorkspaceError {
  message: string;
  code?: ProcessingErrorCode;
}

export interface GeoWorkspaceValue {
  file: File | null;
  /** The document normalized to GeoJSON — null for a CSV, which has no geometry yet. */
  geojson: unknown | null;
  /** Parsed table, set only for a CSV source. */
  csvTable: NormalizedTable | null;
  /** What the dropped file actually was, before any normalization. */
  sourceFormat: GeoWorkspaceFormat | null;
  bbox: BBox2D | null;
  status: "idle" | "reading" | "ready" | "error";
  error: WorkspaceError | null;
  /**
   * Bumped on every load and clear. `GeospatialStudioApp` folds it into each
   * tool's React `key`, so a new file remounts the active tool with fresh
   * state — which is why no tool needs (or is allowed, per
   * `react-hooks/set-state-in-effect`) a reset-setState prologue in its load
   * effect.
   */
  documentKey: number;
  clear(): void;
  /** Loads a dropped file. Only `GeoFilePanel` calls this in the app itself. */
  loadFile(selected: File): void;
}

/**
 * Exported so a component test can mount a single tool with a known document
 * already loaded, instead of driving the real drop zone and mocking the whole
 * detect/parse chain just to reach the code it actually wants to exercise.
 */
export const GeoWorkspaceContext = createContext<GeoWorkspaceValue | null>(null);

/**
 * Reads the Studio's currently-loaded file. Throws outside a `GeoWorkspace`,
 * which is a wiring bug rather than a runtime condition worth handling — every
 * geo tool component is rendered inside one.
 */
export function useGeoWorkspace(): GeoWorkspaceValue {
  const value = useContext(GeoWorkspaceContext);
  if (!value) throw new Error("useGeoWorkspace must be used inside a <GeoWorkspace>.");
  return value;
}

function errorFrom(cause: unknown, fallbackMessage: string): WorkspaceError {
  if (cause instanceof ProcessingError) return { message: cause.message, code: cause.code };
  return { message: fallbackMessage };
}

/**
 * Owns the one file Geospatial Studio is working on, plus the single drop
 * zone that loads it.
 *
 * **Why the file lives here and not in each tool.** Every geo tool used to
 * own its own `file` state and its own `FileDropZone`, so switching tabs
 * unmounted the tool and silently discarded the user's file — they had to
 * re-drop it for every operation. Data Studio never had that problem because
 * `SpreadsheetDataApp` is one component that owns the file centrally; this
 * gives the Geospatial engine the same property without collapsing its ten
 * genuinely-different tool UIs into one component. Tools are now
 * presentational: they read the loaded document from `useGeoWorkspace()` and
 * render only their own options and results.
 *
 * **The provider renders no UI of its own.** The drop zone lives in
 * `GeoFilePanel` below, which the Studio places *inside* its shell — under
 * the tab bar and action picker, the same order Data Studio uses. An
 * earlier version rendered the drop zone here, above `children`, which put
 * Geospatial Studio's file input above its own tabs and made it the one
 * Studio with a different layout. A test can still drive the real drop zone
 * by rendering `<GeoWorkspace><GeoFilePanel /></GeoWorkspace>`.
 */
export function GeoWorkspace({ children }: { children: ReactNode }) {
  const [file, setFile] = useState<File | null>(null);
  const [geojson, setGeojson] = useState<unknown>(null);
  const [csvTable, setCsvTable] = useState<NormalizedTable | null>(null);
  const [sourceFormat, setSourceFormat] = useState<GeoWorkspaceFormat | null>(null);
  const [bbox, setBbox] = useState<BBox2D | null>(null);
  const [status, setStatus] = useState<GeoWorkspaceValue["status"]>("idle");
  const [error, setError] = useState<WorkspaceError | null>(null);
  const [documentKey, setDocumentKey] = useState(0);

  const loadStartedRef = useRef(false);

  const clear = useCallback(() => {
    forgetWorkspaceFiles("geospatial");
    setDocumentKey((key) => key + 1);
    setFile(null);
    setGeojson(null);
    setCsvTable(null);
    setSourceFormat(null);
    setBbox(null);
    setStatus("idle");
    setError(null);
  }, []);

  const loadFile = useCallback(async (selected: File) => {
    loadStartedRef.current = true;
    setDocumentKey((key) => key + 1);
    setFile(selected);
    setGeojson(null);
    setCsvTable(null);
    setSourceFormat(null);
    setBbox(null);
    setError(null);
    setStatus("reading");

    try {
      const detected = await detectFileType(selected);

      // CSV is a source for one Convert action only — it has no geometry to
      // summarize, so it deliberately takes a different branch here.
      if (detected.format === "csv" || detected.format === "tsv") {
        setCsvTable(await parseCsvFile(selected));
        setSourceFormat("csv");
        setStatus("ready");
        rememberWorkspaceFiles("geospatial", [selected], ["csv"]);
        return;
      }

      const { geojson: parsed, sourceFormat: parsedFormat } = await parseAnyGeoFile(selected);
      setGeojson(parsed);
      setSourceFormat(parsedFormat);
      // Best-effort: a document that parses but can't be summarized (no
      // geometry at all) still loads — individual tools report their own,
      // more specific errors against it.
      setBbox(await summarizeGeoJson(parsed).then((summary) => summary.bbox).catch(() => null));
      setStatus("ready");
      // Every geo action is gated on the detected format already
      // (`actionFormats.ts`), and an action the file can't support falls back
      // to one it can — so unlike Image/Data there is nothing extra to check
      // before adopting it on the next page.
      rememberWorkspaceFiles("geospatial", [selected], [parsedFormat]);
    } catch (cause) {
      setError(errorFrom(cause, "Could not read this file."));
      setStatus("error");
    }
  }, []);

  /** Adopt the file the user already had open on the geo tool page they came from. */
  useEffect(() => {
    if (loadStartedRef.current) return;
    const recalled = recallWorkspaceFiles("geospatial");
    const [file] = recalled?.files ?? [];
    if (!file) return;
    let cancelled = false;
    // Deferred for the same reason as PdfWorkspace's recall — see that file.
    queueMicrotask(() => {
      if (cancelled || loadStartedRef.current) return;
      void loadFile(file);
    });
    return () => {
      cancelled = true;
    };
  }, [loadFile]);

  const value = useMemo<GeoWorkspaceValue>(
    () => ({
      file,
      geojson,
      csvTable,
      sourceFormat,
      bbox,
      status,
      error,
      documentKey,
      clear,
      loadFile: (selected: File) => void loadFile(selected),
    }),
    [file, geojson, csvTable, sourceFormat, bbox, status, error, documentKey, clear, loadFile]
  );

  return <GeoWorkspaceContext.Provider value={value}>{children}</GeoWorkspaceContext.Provider>;
}

/**
 * The Studio's single drop zone, plus what's loaded and how to clear it.
 * Rendered by `GeospatialStudioApp` inside its shell (below the tabs and the
 * action picker) rather than by the provider, so the Geospatial Studio's
 * layout matches the other three.
 */
export function GeoFilePanel({ toolSlug }: { toolSlug?: string }) {
  const { file, sourceFormat, status, error, clear, loadFile } = useGeoWorkspace();

  return (
    <div className="flex flex-col gap-4">
      <FileDropZone
        label={file ? "Drop a different file" : "Drop a GeoJSON, TopoJSON, KML, KMZ, GPX, zipped Shapefile or CSV file here"}
        hint="Nothing is uploaded — the file is detected and processed entirely on your device."
        accept={GEO_WORKSPACE_ACCEPT}
        onFilesSelected={(files) => {
          const [selected] = files;
          if (selected) loadFile(selected);
        }}
        toolSlug={toolSlug}
      />

      {file && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <FileInfo file={file} detectedFormat={sourceFormat ?? undefined} />
            {sourceFormat && (
              <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:border-blue-500/40 dark:bg-blue-950/40 dark:text-blue-300">
                Detected: {FORMAT_LABEL[sourceFormat]}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={clear}
            className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:border-gray-400 hover:text-gray-900 dark:border-gray-700 dark:text-gray-300 dark:hover:text-white"
          >
            Clear file
          </button>
        </div>
      )}

      {status === "reading" && <ProcessingStatus state="reading" />}
      {status === "error" && error && <ErrorPanel message={error.message} code={error.code} />}
    </div>
  );
}

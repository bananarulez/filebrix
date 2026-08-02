"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/app-shell/AppShell";
import { Toolbar, type ToolbarModeOption } from "@/components/app-shell/Toolbar";
import { studioTabId } from "@/components/app-shell/tabIds";
import { ActionPicker } from "@/components/app-shell/ActionPicker";
import { UndoRedoControls } from "@/components/app-shell/UndoRedoControls";
import { EditOperationList } from "@/components/app-shell/EditOperationList";
import { SidePanelSection } from "@/components/app-shell/SidePanel";
import { FileDropZone } from "@/components/tools/FileDropZone";
import { FileInfo } from "@/components/tools/FileInfo";
import { ProcessingStatus, type ProcessingState } from "@/components/tools/ProcessingStatus";
import { ErrorPanel } from "@/components/tools/ErrorPanel";
import { DownloadResult } from "@/components/tools/DownloadResult";
import { VirtualizedTable } from "@/components/tools/VirtualizedTable";
import { detectFileType } from "@/lib/detect/detectFile";
import { formatBytes } from "@/lib/format/bytes";
import { deriveOutputFilename } from "@/lib/format/deriveOutputFilename";
import { ProcessingError, type ProcessingErrorCode } from "@/lib/errors/ProcessingError";
import { forgetWorkspaceFiles, recallWorkspaceFiles, rememberWorkspaceFiles } from "@/lib/workspaceFiles";
import type { AppMode } from "@/registry/types";
import {
  inspectWorkbook,
  parseCsvFile,
  parseJsonFile,
  parseXlsxSheetFile,
  serializeToCsv,
  serializeToJson,
  serializeToXlsx,
  type CellValue,
  type JsonShape,
  type NormalizedTable,
  type SheetInfo
} from "@/engines/spreadsheet";
// XML/YAML stay main-thread-only: DOMParser/XMLSerializer don't exist
// inside Web Workers, and js-yaml has no benefit from the worker hop for
// the small-to-medium documents these tools realistically see.
import { parseXmlTable, serializeTableToXmlText } from "@/engines/spreadsheet/xmlTable";
import { parseYamlTable, serializeTableToYamlText } from "@/engines/spreadsheet/convert/yamlTable";
import { parseJsonOrThrow } from "@/engines/spreadsheet/format/json";
import { parseYamlOrThrow } from "@/engines/spreadsheet/format/yaml";
import { jsonValueToXmlText, xmlTextToJsonValue } from "@/engines/spreadsheet/convert/jsonXml";
import { jsonTextToYamlText } from "@/engines/spreadsheet/convert/jsonYaml";
import { analyzeTable, type DatasetAnalysis } from "@/engines/spreadsheet/edit/analyze";
import { cellToString, compareCells } from "@/engines/spreadsheet/edit/operations";
import {
  canRedo,
  canUndo,
  createRecipeState,
  currentTable,
  recipeReducer,
  type EditOperation,
  type RecipeState
} from "@/engines/spreadsheet/edit/recipe";
import { openParquetFile, writeTableToParquet } from "@/engines/parquet";
import { exceedsEditorRowCap, parquetSessionToTable } from "@/engines/parquet/tableBridge";
import type { ParquetSession } from "@/engines/parquet/types";
import { describeOperation } from "./editOperationLabels";
import { AddOperationPanel } from "./AddOperationPanel";
import { LazySpreadsheetGridEditor } from "./LazySpreadsheetGridEditor";
import { ParquetPreviewPane } from "./ParquetPreviewPane";
import { JsonTreeView } from "./JsonTreeView";
import {
  StructuredTextTool,
  STRUCTURED_TEXT_LABELS,
  type StructuredTextAction
} from "./StructuredTextTool";

const LARGE_FILE_THRESHOLD_BYTES = 20 * 1024 * 1024;

export type TabularFormat = "csv" | "tsv" | "xlsx" | "ods" | "json" | "xml" | "yaml" | "parquet";
/** The subset that goes through direct parse -> NormalizedTable -> serialize, i.e.
 * everything except Parquet, which is SQL-backed (`ParquetSession`) rather than
 * parsed synchronously from a `File` — see `parseByFormat`/`serializeByFormat`. */
type TableFileFormat = Exclude<TabularFormat, "parquet">;
/** Formats whose tabular parse can fail with `UNSUPPORTED_FORMAT` for a genuinely
 * non-tabular shape (a bare scalar, mismatched array shapes, ...) — those three, and
 * only those three, fall back to the tree-view value pipeline. See `loadTable`. */
type TreeCapableFormat = "json" | "xml" | "yaml";

const FORMAT_LABEL: Record<TabularFormat, string> = {
  csv: "CSV",
  tsv: "TSV",
  xlsx: "Excel",
  ods: "ODS",
  json: "JSON",
  xml: "XML",
  yaml: "YAML",
  parquet: "Parquet"
};

const ALL_FORMATS: TabularFormat[] = ["csv", "tsv", "xlsx", "ods", "json", "xml", "yaml", "parquet"];
const TREE_CAPABLE_FORMATS: TreeCapableFormat[] = ["json", "xml", "yaml"];
const WORKBOOK_FORMATS = new Set<TabularFormat>(["xlsx", "ods"]);

const MODE_OPTIONS: ToolbarModeOption<AppMode>[] = [
  { id: "view", label: "Viewer" },
  { id: "edit", label: "Editor" },
  { id: "convert", label: "Converter" },
  { id: "analyze", label: "Analyzer" }
];

function acceptAttribute(formats: TabularFormat[]): string {
  return formats.map((f) => `.${f}`).join(",");
}

function errorFrom(cause: unknown, fallbackMessage: string): { message: string; code?: ProcessingErrorCode } {
  if (cause instanceof ProcessingError) return { message: cause.message, code: cause.code };
  return { message: fallbackMessage };
}

async function parseByFormat(file: File, format: TableFileFormat, sheetName?: string): Promise<NormalizedTable> {
  switch (format) {
    case "csv":
    case "tsv":
      return parseCsvFile(file);
    case "xlsx":
    case "ods":
      return parseXlsxSheetFile(file, sheetName ?? "");
    case "json":
      return parseJsonFile(file);
    case "xml":
      return parseXmlTable(await file.text());
    case "yaml":
      return parseYamlTable(await file.text());
  }
}

async function serializeByFormat(
  table: NormalizedTable,
  format: TableFileFormat,
  options: { sheetName?: string; jsonShape?: JsonShape }
): Promise<Blob> {
  switch (format) {
    case "csv":
    case "tsv":
      return serializeToCsv(table);
    case "xlsx":
      return serializeToXlsx(table, options.sheetName);
    case "ods":
      return serializeToXlsx(table, options.sheetName, "ods");
    case "json":
      return serializeToJson(table, options.jsonShape);
    case "xml":
      return new Blob([serializeTableToXmlText(table)], {
        type: "application/xml"
      });
    case "yaml":
      return new Blob([serializeTableToYamlText(table, options.jsonShape)], {
        type: "application/x-yaml"
      });
  }
}

/** Converts a value from the tree-view pipeline (never a `NormalizedTable`) directly
 * to JSON/XML/YAML text, reusing the same lossless value-based functions the
 * standalone json-to-xml/xml-to-json/json-to-yaml/yaml-to-json paste-first tools use
 * — a round-trip through JSON text for the YAML case (`JSON.stringify` then
 * `jsonTextToYamlText`) rather than a new "value to YAML" function, since every value
 * this pipeline ever produces (from JSON, XML, or YAML source) is already plain,
 * JSON-serializable data with no `Date` instances. */
async function convertTreeValue(value: unknown, target: TabularFormat): Promise<Blob> {
  switch (target) {
    case "json":
      return new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
    case "xml":
      return new Blob([jsonValueToXmlText(value).output], { type: "application/xml" });
    case "yaml":
      return new Blob([jsonTextToYamlText(JSON.stringify(value)).output], { type: "application/x-yaml" });
    default:
      throw new ProcessingError("UNSUPPORTED_FORMAT", "This file can only be converted to JSON, XML or YAML.");
  }
}

function formatCellForDisplay(value: CellValue): string | number | null {
  if (value === null) return null;
  if (value instanceof Date) return value.toLocaleString();
  if (typeof value === "boolean") return value ? "true" : "false";
  return value;
}

/**
 * The action chosen within Edit/Analyze/Convert. `"table"` is the file-first
 * pipeline this app has always had (drop a file, get a grid/stats/export);
 * every other value mounts one of the nine paste-first JSON/XML/YAML tools
 * via `StructuredTextTool`, whose ids are those tools' own registry slugs.
 */
export type DataEditAction = "table" | "json-formatter" | "json-minifier" | "xml-formatter";
export type DataAnalyzeAction = "table" | "json-validator" | "xml-validator";
export type DataConvertAction = "table" | "json-to-xml" | "xml-to-json" | "json-to-yaml" | "yaml-to-json";

const EDIT_ACTIONS: DataEditAction[] = ["table", "json-formatter", "json-minifier", "xml-formatter"];
const ANALYZE_ACTIONS: DataAnalyzeAction[] = ["table", "json-validator", "xml-validator"];
const CONVERT_ACTIONS: DataConvertAction[] = [
  "table",
  "json-to-xml",
  "xml-to-json",
  "json-to-yaml",
  "yaml-to-json"
];

const EDIT_ACTION_LABEL: Record<DataEditAction, string> = { table: "Table", ...STRUCTURED_TEXT_LABELS };
const ANALYZE_ACTION_LABEL: Record<DataAnalyzeAction, string> = { table: "Table", ...STRUCTURED_TEXT_LABELS };
const CONVERT_ACTION_LABEL: Record<DataConvertAction, string> = { table: "File", ...STRUCTURED_TEXT_LABELS };

interface SpreadsheetDataAppProps {
  initialMode?: AppMode;
  /** Hides the format picker and locks the drop zone to one format — used by every old per-format tool URL so its SEO promise ("CSV Viewer") stays true. */
  lockedFormat?: TabularFormat;
  /** Convert mode's default output format, e.g. "excel-to-csv" defaults to csv rather than whatever the app's own fallback is. */
  initialOutputFormat?: TabularFormat;
  /** Registry slug, for the Universal File Drop handoff. */
  toolSlug?: string;
  /** Hides the Edit action picker — used by /tools/json-formatter, /tools/json-minifier and /tools/xml-formatter. */
  lockedEditAction?: DataEditAction;
  /** Hides the Analyze action picker — used by /tools/json-validator and /tools/xml-validator. */
  lockedAnalyzeAction?: DataAnalyzeAction;
  /** Hides the Convert action picker — used by the four /convert/{json,xml,yaml} URLs. */
  lockedConvertAction?: DataConvertAction;
}

type AppState =
  { status: Exclude<ProcessingState, "error"> } | { status: "error"; message: string; code?: ProcessingErrorCode };

/**
 * Replaces the ~17 previous bespoke spreadsheet/data-format components.
 *
 * Two layered edit histories, kept deliberately separate:
 * - Direct cell edits (typing, paste, row/column insert-delete) happen
 *   inside the Editor mode's jspreadsheet-ce grid, which owns its own
 *   native undo/redo. The grid reports its live contents up via
 *   `onLiveChange` into `liveTable` state.
 * - Bulk operations (find & replace, sort, dedupe, ...) go through
 *   `recipeState`/`recipeReducer` (engines/spreadsheet/edit/recipe.ts),
 *   with their own "Bulk edits" undo/redo list in the side panel.
 *
 * `table` (below) is `liveTable ?? currentTable(recipeState)` — once the
 * grid has reported anything, it's authoritative for every mode (View/
 * Convert/Analyze/export), so a manual cell edit is never silently
 * dropped. Applying a *new* bulk operation "rebases" `recipeState.original`
 * onto whatever `table` currently is (see `handleApplyOperation`), so a
 * bulk op always starts from the true current data, live edits included —
 * the trade-off is that undoing a bulk op only ever undoes bulk ops made
 * since that rebase, never a manual cell edit (which has its own separate
 * undo scope: the grid's native Ctrl+Z).
 *
 * Ctrl+Z (and Ctrl+Shift+Z / Ctrl+Y for redo) is routed to whichever
 * history makes sense for where focus is: while focus is inside the grid
 * (`gridContainerRef`), the keypress is left alone so jspreadsheet-ce's own
 * native undo handles it; everywhere else — e.g. right after clicking
 * "Apply" on a bulk operation, where focus lands on that button, not the
 * grid — it triggers the bulk-edit undo/redo instead, via the same
 * `handleBulkUndo`/`handleBulkRedo` the toolbar buttons use. Without this,
 * Ctrl+Z after a bulk operation would silently do nothing, since the grid
 * never sees the keypress and the button pair has no keyboard binding of
 * its own.
 *
 * Two formats don't go through the `table`/`recipeState` model directly:
 * - **Parquet** stays backed by a SQL `ParquetSession` (`parquetSession` state) —
 *   View and Analyze query it directly (paginated/aggregated, never materializing
 *   the whole file), and only Editor mode materializes it into a `NormalizedTable`
 *   (via `parquetSessionToTable`), and only when the file is under
 *   `MAX_EDITOR_ROWS` — see `engines/parquet/tableBridge.ts`. Convert reuses
 *   whatever's already materialized (`table`) if the user has been in Editor, or
 *   materializes fresh (uncapped) otherwise, so an edit made in the capped Editor
 *   view is never silently dropped from an export.
 * - **Non-tabular JSON/XML/YAML** (`isTreeMode`/`treeValue`) — when the tabular
 *   parse fails with `UNSUPPORTED_FORMAT` specifically (a genuinely non-tabular
 *   shape, not a malformed file), `loadTable` falls back to the same value-based
 *   parse the standalone json-to-xml/xml-to-json/json-to-yaml/yaml-to-json tools
 *   use, and View renders `JsonTreeView` instead of a table. Edit isn't available
 *   for this data (there's no table to edit); Convert is restricted to the
 *   lossless JSON/XML/YAML trio.
 */
export function SpreadsheetDataApp({
  initialMode = "view",
  lockedFormat,
  initialOutputFormat,
  toolSlug,
  lockedEditAction,
  lockedAnalyzeAction,
  lockedConvertAction
}: SpreadsheetDataAppProps) {
  const [mode, setMode] = useState<AppMode>(initialMode);
  const [editAction, setEditAction] = useState<DataEditAction>(lockedEditAction ?? "table");
  const [analyzeAction, setAnalyzeAction] = useState<DataAnalyzeAction>(lockedAnalyzeAction ?? "table");
  const [convertAction, setConvertAction] = useState<DataConvertAction>(lockedConvertAction ?? "table");
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<TabularFormat | null>(lockedFormat ?? null);
  const [state, setState] = useState<AppState>({ status: "idle" });
  const [sheets, setSheets] = useState<SheetInfo[] | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string | null>(null);
  const [recipeState, setRecipeState] = useState<RecipeState | null>(null);
  const [liveTable, setLiveTable] = useState<NormalizedTable | null>(null);
  const [gridVersion, setGridVersion] = useState(0);
  const [outputFormat, setOutputFormat] = useState<TabularFormat>(
    initialOutputFormat ?? (lockedFormat === "csv" ? "xlsx" : "csv")
  );
  const [jsonShape, setJsonShape] = useState<JsonShape>("array-of-objects");
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);

  const [parquetSession, setParquetSession] = useState<ParquetSession | null>(null);
  const [parquetAnalysis, setParquetAnalysis] = useState<DatasetAnalysis | null>(null);
  const [parquetMaterializing, setParquetMaterializing] = useState(false);
  const parquetSessionRef = useRef<ParquetSession | null>(null);

  const [isTreeMode, setIsTreeMode] = useState(false);
  const [treeValue, setTreeValue] = useState<unknown>(null);

  const [viewSearchInput, setViewSearchInput] = useState("");
  const [viewSortColumn, setViewSortColumn] = useState<string | null>(null);
  const [viewSortDirection, setViewSortDirection] = useState<"asc" | "desc">("asc");

  const gridContainerRef = useRef<HTMLDivElement | null>(null);
  // See the recall effect below: set synchronously so a pending Universal
  // File Drop handoff (whose drop zone mounts first) always wins.
  const loadStartedRef = useRef(false);

  const dispatchRecipe = useCallback((action: Parameters<typeof recipeReducer>[1]) => {
    setRecipeState((prev) => (prev ? recipeReducer(prev, action) : prev));
  }, []);

  const handleBulkUndo = useCallback(() => {
    dispatchRecipe({ type: "undo" });
    setLiveTable(null);
    setGridVersion((v) => v + 1);
  }, [dispatchRecipe]);

  const handleBulkRedo = useCallback(() => {
    dispatchRecipe({ type: "redo" });
    setLiveTable(null);
    setGridVersion((v) => v + 1);
  }, [dispatchRecipe]);

  const closeParquetSession = useCallback(async () => {
    const current = parquetSessionRef.current;
    parquetSessionRef.current = null;
    if (current) await current.close().catch(() => {});
  }, []);

  // Close whatever Parquet session is open when the tool unmounts entirely (e.g.
  // navigating away) — new-file/clear cases call closeParquetSession() directly.
  useEffect(() => {
    return () => {
      void closeParquetSession();
    };
  }, [closeParquetSession]);

  // Not stored as state — a pure function of `parquetSession`, so it's derived
  // directly during render rather than synced via an effect.
  const parquetEditorCapExceeded = format === "parquet" && parquetSession ? exceedsEditorRowCap(parquetSession) : false;

  // Lazily materializes a Parquet session into `recipeState` the first time Editor
  // mode is opened for it — never on a View/Analyze/Convert-only visit. Capped at
  // MAX_EDITOR_ROWS (see tableBridge.ts); View/Analyze/Convert stay fully
  // SQL-scalable regardless of file size, only Editor is capped.
  useEffect(() => {
    if (mode !== "edit" || format !== "parquet" || !parquetSession || recipeState || parquetEditorCapExceeded) return;
    let cancelled = false;

    (async () => {
      setParquetMaterializing(true);
      try {
        const normalized = await parquetSessionToTable(parquetSession);
        if (cancelled) return;
        setRecipeState(createRecipeState(normalized));
        setGridVersion((v) => v + 1);
      } catch (cause) {
        if (cancelled) return;
        setState({ status: "error", ...errorFrom(cause, "Could not load this file for editing.") });
      } finally {
        if (!cancelled) setParquetMaterializing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mode, format, parquetSession, recipeState, parquetEditorCapExceeded]);

  // Parquet's Analyze tab is SQL-aggregate-based (session.analyze()), not the
  // synchronous JS scan analyzeTable() does — fetched once per session, lazily,
  // only when Analyze mode is actually opened.
  useEffect(() => {
    if (mode !== "analyze" || format !== "parquet" || !parquetSession || parquetAnalysis) return;
    let cancelled = false;
    parquetSession
      .analyze()
      .then((result) => {
        if (!cancelled) setParquetAnalysis(result);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setState({ status: "error", ...errorFrom(cause, "Could not analyze this file.") });
      });
    return () => {
      cancelled = true;
    };
  }, [mode, format, parquetSession, parquetAnalysis]);

  // See the component doc comment: Ctrl+Z/Ctrl+Shift+Z (and Ctrl+Y) fall
  // back to the bulk-edit history whenever focus isn't inside the grid,
  // since the grid's own native undo only ever sees the keypress when it
  // has focus, and the toolbar's Undo/Redo buttons otherwise have no
  // keyboard binding at all.
  useEffect(() => {
    if (mode !== "edit" || !recipeState) return;

    function handleKeyDown(event: KeyboardEvent) {
      const key = event.key.toLowerCase();
      const isUndo = (event.ctrlKey || event.metaKey) && !event.shiftKey && key === "z";
      const isRedo =
        (event.ctrlKey || event.metaKey) && ((event.shiftKey && key === "z") || key === "y");
      if (!isUndo && !isRedo) return;
      if (gridContainerRef.current?.contains(document.activeElement)) return;

      event.preventDefault();
      if (isUndo) {
        if (!recipeState || !canUndo(recipeState)) return;
        handleBulkUndo();
      } else {
        if (!recipeState || !canRedo(recipeState)) return;
        handleBulkRedo();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mode, recipeState, handleBulkUndo, handleBulkRedo]);

  /**
   * Re-open the file the user already had loaded on the Data Studio tool page
   * they navigated from, so moving between e.g. CSV Viewer and CSV to JSON
   * doesn't silently discard it. Only adopted when this page can actually
   * take it: a `lockedFormat` page inherits nothing of another format, since
   * `handleFilesSelected` would immediately reject it with
   * "This looks like a CSV file, not JSON" — worse than an empty drop zone.
   */
  useEffect(() => {
    if (loadStartedRef.current) return;
    const recalled = recallWorkspaceFiles("data");
    const [file] = recalled?.files ?? [];
    if (!file) return;
    if (lockedFormat && recalled?.formats[0] !== lockedFormat) return;
    let cancelled = false;
    // Deferred for the same reason as PdfWorkspace's recall — see that file.
    queueMicrotask(() => {
      if (cancelled || loadStartedRef.current) return;
      void handleFilesSelected([file]);
    });
    return () => {
      cancelled = true;
    };
    // Runs once per mount: adoption is a "what was already open when this
    // page loaded" question, not something to redo when props change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isBusy =
    state.status === "opening-file" ||
    state.status === "reading" ||
    state.status === "analyzing-schema" ||
    state.status === "converting";

  const recipeTable = recipeState ? currentTable(recipeState) : null;
  const table = liveTable ?? recipeTable;

  /** Value-based fallback for JSON/XML/YAML: only reached when the tabular parse
   * threw `UNSUPPORTED_FORMAT` (a genuinely non-tabular shape), never for a
   * malformed file (which still hard-errors, unchanged). See the component doc
   * comment. */
  async function loadAsTree(selectedFile: File, fmt: TreeCapableFormat) {
    try {
      const text = await selectedFile.text();
      const value = fmt === "json" ? parseJsonOrThrow(text) : fmt === "xml" ? xmlTextToJsonValue(text) : parseYamlOrThrow(text);
      setIsTreeMode(true);
      setTreeValue(value);
      setRecipeState(null);
      setLiveTable(null);
      setResultBlob(null);
      setState({ status: "ready" });
    } catch (cause) {
      setState({ status: "error", ...errorFrom(cause, "Could not read this file.") });
    }
  }

  async function loadTable(selectedFile: File, fmt: TableFileFormat, sheetName?: string) {
    setState({
      status: fmt === "xlsx" || fmt === "ods" ? "analyzing-schema" : "reading"
    });
    setIsTreeMode(false);
    setTreeValue(null);
    try {
      const parsed = await parseByFormat(selectedFile, fmt, sheetName);
      setRecipeState(createRecipeState(parsed));
      setLiveTable(null);
      setGridVersion((v) => v + 1);
      setResultBlob(null);
      setState({ status: "ready" });
    } catch (cause) {
      // Every current locked-format tool (csv-to-json, json-to-csv, ...) either
      // requires CSV/XLSX (always tabular) or locks a JSON/XML source specifically
      // to a CSV *target* — structurally requiring a table either way. Tree mode
      // can only ever convert to JSON/XML/YAML, so falling back to it for one of
      // these tools would silently defeat the tool's one job instead of showing
      // the clear rejection message it showed before tree mode existed. Only the
      // general, unlocked app (no `lockedFormat`) offers the fallback.
      if (
        !lockedFormat &&
        (fmt === "json" || fmt === "xml" || fmt === "yaml") &&
        cause instanceof ProcessingError &&
        cause.code === "UNSUPPORTED_FORMAT"
      ) {
        await loadAsTree(selectedFile, fmt);
        return;
      }
      setState({
        status: "error",
        ...errorFrom(cause, "Could not read this file.")
      });
    }
  }

  async function loadParquet(selectedFile: File) {
    try {
      const session = await openParquetFile(selectedFile, (phase) => setState({ status: phase }));
      parquetSessionRef.current = session;
      setParquetSession(session);
      setState({ status: "ready" });
    } catch (cause) {
      setState({ status: "error", ...errorFrom(cause, "Could not open this file.") });
    }
  }

  async function handleFilesSelected(files: File[]) {
    const [selected] = files;
    if (!selected) return;
    loadStartedRef.current = true;

    await closeParquetSession();
    setFile(selected);
    setRecipeState(null);
    setLiveTable(null);
    setParquetSession(null);
    setParquetAnalysis(null);
    setIsTreeMode(false);
    setTreeValue(null);
    setSheets(null);
    setSelectedSheet(null);
    setResultBlob(null);
    setState({ status: "opening-file" });

    let fmt = lockedFormat ?? null;
    if (!fmt) {
      const detected = await detectFileType(selected);
      if (detected.format === "unknown" || !ALL_FORMATS.includes(detected.format as TabularFormat)) {
        setState({
          status: "error",
          message:
            "This doesn't look like a supported spreadsheet or data file (CSV, TSV, Excel, ODS, JSON, XML, YAML, or Parquet)."
        });
        return;
      }
      fmt = detected.format as TabularFormat;
    } else {
      const detected = await detectFileType(selected);
      // Text-based formats (csv/json/xml/yaml) are only ever "content"- or
      // "extension"-detected, never "signature"-detected (no magic bytes) —
      // restricting this check to "signature" alone would silently let a
      // mismatched text file through for every locked-format text tool.
      const isConfidentMismatch =
        (detected.confidence === "signature" || detected.confidence === "content") &&
        detected.format !== "unknown" &&
        detected.format !== lockedFormat;
      if (isConfidentMismatch) {
        setState({
          status: "error",
          message: `This looks like a ${detected.format.toUpperCase()} file, not ${FORMAT_LABEL[fmt]}.`
        });
        return;
      }
    }
    setFormat(fmt);
    // Remembered with its detected format so the next Data Studio tool page
    // can decide synchronously whether it's allowed to adopt it — a page
    // locked to JSON must not inherit a CSV and greet the user with an error.
    rememberWorkspaceFiles("data", [selected], [fmt]);

    if (fmt === "parquet") {
      await loadParquet(selected);
      return;
    }

    if (WORKBOOK_FORMATS.has(fmt)) {
      setState({ status: "reading" });
      try {
        const info = await inspectWorkbook(selected);
        if (info.sheets.length === 0) {
          setState({
            status: "error",
            message: "This workbook doesn't contain any sheets."
          });
          return;
        }
        setSheets(info.sheets);
        const firstSheet = info.sheets[0].name;
        setSelectedSheet(firstSheet);
        await loadTable(selected, fmt, firstSheet);
      } catch (cause) {
        setState({
          status: "error",
          ...errorFrom(cause, "Could not read this file.")
        });
      }
      return;
    }

    await loadTable(selected, fmt);
  }

  async function handleSheetChange(sheetName: string) {
    if (!file || !format || format === "parquet") return;
    setSelectedSheet(sheetName);
    await loadTable(file, format, sheetName);
  }

  function handleClear() {
    forgetWorkspaceFiles("data");
    void closeParquetSession();
    setFile(null);
    setFormat(lockedFormat ?? null);
    setRecipeState(null);
    setLiveTable(null);
    setParquetSession(null);
    setParquetAnalysis(null);
    setIsTreeMode(false);
    setTreeValue(null);
    setSheets(null);
    setSelectedSheet(null);
    setResultBlob(null);
    setState({ status: "idle" });
  }

  /** Rebases the bulk-op recipe onto whatever is currently authoritative
   * (including any manual grid edits) before applying, then forces the
   * grid to remount with the result — see the component doc comment for
   * why the two edit histories are kept separate rather than merged. */
  function handleApplyOperation(operation: EditOperation) {
    if (!table) return;
    setRecipeState(recipeReducer(createRecipeState(table), { type: "apply", operation }));
    setLiveTable(null);
    setGridVersion((v) => v + 1);
  }

  /** Reads whatever's already materialized (`table` — reflecting any edits made in
   * Editor mode, capped or not) if there is one; otherwise materializes fresh and
   * uncapped from the Parquet session. This is what keeps an edit made against a
   * capped Editor view from being silently dropped on export, while a Convert-only
   * visit (Editor never opened) still exports the full, uncapped dataset. */
  async function resolveSourceTable(): Promise<NormalizedTable | null> {
    if (table) return table;
    if (format === "parquet" && parquetSession) return parquetSessionToTable(parquetSession);
    return null;
  }

  async function handleExport() {
    if (!file || !format) return;
    setState({ status: "converting" });
    try {
      let blob: Blob;

      if (isTreeMode) {
        blob = await convertTreeValue(treeValue, outputFormat);
      } else {
        const sourceTable = await resolveSourceTable();
        if (!sourceTable) throw new ProcessingError("UNSUPPORTED_FORMAT", "Nothing to convert.");

        if (outputFormat === "parquet") {
          blob = await writeTableToParquet(sourceTable);
        } else {
          blob = await serializeByFormat(sourceTable, outputFormat, {
            sheetName: selectedSheet ?? undefined,
            jsonShape
          });
        }
      }

      setResultBlob(blob);
      setState({ status: "ready" });
    } catch (cause) {
      setState({
        status: "error",
        ...errorFrom(cause, "Could not convert this file.")
      });
    }
  }

  const analysis: DatasetAnalysis | null = useMemo(() => {
    if (format === "parquet") return parquetAnalysis;
    if (!table) return null;
    return analyzeTable(table, {
      fileName: file?.name,
      fileSizeBytes: file?.size,
      format: format ? FORMAT_LABEL[format] : undefined,
      sourceName: selectedSheet ?? undefined
    });
  }, [format, parquetAnalysis, table, file, selectedSheet]);

  // View mode's search/sort for in-memory (non-Parquet) tables — purely a display
  // reorder/filter, never mutates `table` itself. Bounded by the same in-memory-row
  // budget Editor mode relies on (both ultimately operate on the same materialized
  // `table`), so this stays cheap even at that budget's upper end.
  const displayRows = useMemo(() => {
    if (!table) return [];
    let rows = table.rows;
    const term = viewSearchInput.trim().toLowerCase();
    if (term) {
      rows = rows.filter((row) => row.some((cell) => cellToString(cell).toLowerCase().includes(term)));
    }
    if (viewSortColumn) {
      const columnIndex = table.columns.indexOf(viewSortColumn);
      if (columnIndex !== -1) {
        rows = rows.slice().sort((a, b) => {
          const cmp = compareCells(a[columnIndex], b[columnIndex]);
          return viewSortDirection === "asc" ? cmp : -cmp;
        });
      }
    }
    return rows;
  }, [table, viewSearchInput, viewSortColumn, viewSortDirection]);

  function handleViewSortColumn(column: string) {
    if (viewSortColumn !== column) {
      setViewSortColumn(column);
      setViewSortDirection("asc");
    } else if (viewSortDirection === "asc") {
      setViewSortDirection("desc");
    } else {
      setViewSortColumn(null);
    }
  }

  const opSteps = useMemo(
    () =>
      recipeState
        ? recipeState.applied.map((op, i) => ({
            id: `${i}-${op.type}`,
            label: describeOperation(op, recipeState.original.columns)
          }))
        : [],
    [recipeState]
  );

  // When a non-tabular JSON/XML/YAML file is loaded, Convert is restricted to the
  // lossless JSON/XML/YAML trio — clamp outputFormat to a valid target rather than
  // leaving it pointed at e.g. "csv" from a previous file. Corrected directly during
  // render (React's documented pattern for adjusting state in response to a prop/
  // derived change: https://react.dev/learn/you-might-not-need-an-effect) rather
  // than in a useEffect, since it's a pure correction with no external system
  // involved — the guard makes it self-limiting, not an infinite loop.
  if (isTreeMode) {
    const validTreeTargets = TREE_CAPABLE_FORMATS.filter((f) => f !== format);
    if (!(validTreeTargets as TabularFormat[]).includes(outputFormat)) {
      setOutputFormat(validTreeTargets[0] ?? "json");
    }
  }

  /**
   * Which paste-first JSON/XML/YAML action the current mode has selected, if
   * any. `"table"` — the default for every mode unless a page locks something
   * else — means the file-first pipeline below, so every pre-existing page
   * behaves exactly as it did before these actions existed.
   */
  const activeTextAction: StructuredTextAction | null =
    mode === "edit" && editAction !== "table"
      ? editAction
      : mode === "analyze" && analyzeAction !== "table"
        ? analyzeAction
        : mode === "convert" && convertAction !== "table"
          ? convertAction
          : null;

  /**
   * The second-level picker for whichever mode is active. Hidden entirely on
   * a locked-format page (one committed to CSV/Excel/… has no business
   * offering JSON/XML text tools) and on any mode whose own action a page has
   * locked — the same rule the other three Studios' pickers already follow.
   */
  const actionPicker = lockedFormat ? null : mode === "edit" && !lockedEditAction ? (
    <ActionPicker
      options={EDIT_ACTIONS}
      labels={EDIT_ACTION_LABEL}
      active={editAction}
      onChange={setEditAction}
    />
  ) : mode === "analyze" && !lockedAnalyzeAction ? (
    <ActionPicker
      options={ANALYZE_ACTIONS}
      labels={ANALYZE_ACTION_LABEL}
      active={analyzeAction}
      onChange={setAnalyzeAction}
    />
  ) : mode === "convert" && !lockedConvertAction ? (
    <ActionPicker
      options={CONVERT_ACTIONS}
      labels={CONVERT_ACTION_LABEL}
      active={convertAction}
      onChange={setConvertAction}
    />
  ) : null;

  return (
    <AppShell
      activeTabId={studioTabId(mode)}
      toolbar={
        <Toolbar
          modes={MODE_OPTIONS}
          activeMode={mode}
          onModeChange={setMode}
          formatLabel={lockedFormat ? FORMAT_LABEL[lockedFormat] : format ? FORMAT_LABEL[format] : undefined}
          right={
            mode === "edit" && recipeState ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Bulk edits:</span>
                <UndoRedoControls
                  canUndo={canUndo(recipeState)}
                  canRedo={canRedo(recipeState)}
                  onUndo={handleBulkUndo}
                  onRedo={handleBulkRedo}
                />
              </div>
            ) : undefined
          }
        />
      }
      sidePanel={
        // A paste-first action owns the whole body — the bulk-operation and
        // file-metadata panels both describe a loaded *table*, which that
        // action has nothing to do with even when one happens to be loaded.
        activeTextAction ? undefined : mode === "edit" && table ? (
          <>
            <SidePanelSection title="Add a bulk operation">
              <AddOperationPanel columns={table.columns} onApply={handleApplyOperation} />
            </SidePanelSection>
            <SidePanelSection title="Bulk edit history">
              <p className="mb-1 text-xs text-gray-400">
                Ctrl+Z undoes your last cell edit while you&rsquo;re in the grid, and your last bulk
                operation otherwise.
              </p>
              <EditOperationList steps={opSteps} />
            </SidePanelSection>
          </>
        ) : mode === "analyze" && analysis ? (
          <SidePanelSection title="File">
            <dl className="flex flex-col gap-1 text-sm">
              {analysis.fileMetadata?.fileName && (
                <div className="flex justify-between gap-2">
                  <dt className="text-gray-500">Name</dt>
                  <dd className="truncate text-right">{analysis.fileMetadata.fileName}</dd>
                </div>
              )}
              {analysis.fileMetadata?.fileSizeBytes !== undefined && (
                <div className="flex justify-between gap-2">
                  <dt className="text-gray-500">Size</dt>
                  <dd>{formatBytes(analysis.fileMetadata.fileSizeBytes)}</dd>
                </div>
              )}
              {analysis.fileMetadata?.format && (
                <div className="flex justify-between gap-2">
                  <dt className="text-gray-500">Format</dt>
                  <dd>{analysis.fileMetadata.format}</dd>
                </div>
              )}
              {analysis.fileMetadata?.sourceName && (
                <div className="flex justify-between gap-2">
                  <dt className="text-gray-500">Sheet</dt>
                  <dd className="truncate text-right">{analysis.fileMetadata.sourceName}</dd>
                </div>
              )}
            </dl>
          </SidePanelSection>
        ) : undefined
      }
      exportBar={
        // Same reasoning as sidePanel: a paste-first converter has its own
        // Convert button and download inside TextTransformTool, so the
        // file-first export bar would be a second, unrelated one.
        activeTextAction ? undefined : mode === "convert" &&
          file &&
          (table || isTreeMode || (format === "parquet" && parquetSession)) ? (
          <>
            <label className="flex items-center gap-2 text-sm">
              <span className="font-medium">Output format</span>
              <select
                value={outputFormat}
                onChange={(event) => setOutputFormat(event.target.value as TabularFormat)}
                className="rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-gray-700 dark:bg-gray-900"
              >
                {ALL_FORMATS.filter((f) => f !== format && (!isTreeMode || (TREE_CAPABLE_FORMATS as TabularFormat[]).includes(f))).map(
                  (f) => (
                    <option key={f} value={f}>
                      {FORMAT_LABEL[f]}
                    </option>
                  )
                )}
              </select>
            </label>
            {!isTreeMode && (outputFormat === "json" || outputFormat === "yaml") && (
              <label className="flex items-center gap-2 text-sm">
                <span className="font-medium">Output shape</span>
                <select
                  value={jsonShape}
                  onChange={(event) => setJsonShape(event.target.value as JsonShape)}
                  className="rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-gray-700 dark:bg-gray-900"
                >
                  <option value="array-of-objects">Array of objects</option>
                  <option value="array-of-arrays">Array of arrays</option>
                </select>
              </label>
            )}
            <button
              type="button"
              onClick={() => void handleExport()}
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            >
              Convert
            </button>
            {resultBlob && (
              <DownloadResult
                filename={deriveOutputFilename(file.name, outputFormat)}
                blob={resultBlob}
                label={`Download .${outputFormat}`}
              />
            )}
          </>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-4">
        {actionPicker}

        {activeTextAction ? (
          <StructuredTextTool action={activeTextAction} />
        ) : (
          <>
        <FileDropZone
          label={file ? "Drop a different file" : "Drop a spreadsheet or data file here"}
          hint="Nothing is uploaded — everything happens on your device."
          accept={lockedFormat ? `.${lockedFormat}` : acceptAttribute(ALL_FORMATS)}
          onFilesSelected={(files) => void handleFilesSelected(files)}
          toolSlug={toolSlug}
        />

        {file && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <FileInfo file={file} detectedFormat={format ?? undefined} />
            <button
              type="button"
              onClick={handleClear}
              className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:border-gray-400 hover:text-gray-900 dark:border-gray-700 dark:text-gray-300 dark:hover:text-white"
            >
              Clear file
            </button>
          </div>
        )}

        {file && file.size > LARGE_FILE_THRESHOLD_BYTES && state.status !== "error" && (
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Large file detected — {formatBytes(file.size)}. This may take a moment to process locally.
          </p>
        )}

        {isBusy && <ProcessingStatus state={state.status} />}
        {state.status === "error" && <ErrorPanel message={state.message} code={state.code} />}

        {sheets && sheets.length > 1 && (
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Sheet</span>
            <select
              value={selectedSheet ?? ""}
              onChange={(event) => void handleSheetChange(event.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-gray-700 dark:bg-gray-900"
            >
              {sheets.map((sheet) => (
                <option key={sheet.name} value={sheet.name}>
                  {sheet.name} ({sheet.rowCount} rows, {sheet.columnCount} columns)
                </option>
              ))}
            </select>
          </label>
        )}

        {table && table.warnings.length > 0 && (
          <ul className="flex flex-col gap-1 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
            {table.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        )}

        {format === "parquet" && parquetSession && mode !== "analyze" && mode !== "edit" && (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-4 rounded-lg border border-gray-200 p-4 text-sm dark:border-gray-800 sm:grid-cols-3">
              <div>
                <dt className="text-gray-500">Rows</dt>
                <dd className="text-lg font-semibold">{parquetSession.summary.rowCount.toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Columns</dt>
                <dd className="text-lg font-semibold">{parquetSession.summary.columns.length}</dd>
              </div>
            </div>
            <ParquetPreviewPane session={parquetSession} />
          </div>
        )}

        {isTreeMode && mode !== "analyze" && mode !== "edit" && <JsonTreeView value={treeValue} />}

        {table && format !== "parquet" && !isTreeMode && mode !== "analyze" && mode !== "edit" && (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-4 rounded-lg border border-gray-200 p-4 text-sm dark:border-gray-800 sm:grid-cols-3">
              <div>
                <dt className="text-gray-500">Rows</dt>
                <dd className="text-lg font-semibold">{table.rows.length.toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Columns</dt>
                <dd className="text-lg font-semibold">{table.columns.length}</dd>
              </div>
            </div>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Search</span>
              <input
                type="search"
                value={viewSearchInput}
                onChange={(event) => setViewSearchInput(event.target.value)}
                placeholder="Filter rows…"
                className="rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-gray-700 dark:bg-gray-900"
              />
            </label>
            <VirtualizedTable
              columns={table.columns}
              rows={displayRows.map((row) => row.map(formatCellForDisplay))}
              sortColumn={viewSortColumn ?? undefined}
              sortDirection={viewSortDirection}
              onSortColumn={handleViewSortColumn}
            />
          </div>
        )}

        {mode === "edit" && format === "parquet" && parquetEditorCapExceeded && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
            This file has {parquetSession?.summary.rowCount.toLocaleString()} rows. Editor mode supports Parquet
            files up to 50,000 rows to stay responsive. View, Analyze and Convert aren&rsquo;t affected — they
            query this file without loading the whole dataset into memory.
          </p>
        )}

        {mode === "edit" && format === "parquet" && !parquetEditorCapExceeded && parquetMaterializing && (
          <ProcessingStatus state="reading" />
        )}

        {mode === "edit" && isTreeMode && (
          <p className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
            Editing isn&rsquo;t available for this file — it isn&rsquo;t shaped as a table (see the Viewer tab).
            Convert still offers JSON, XML and YAML.
          </p>
        )}

        {table && mode === "edit" && !isTreeMode && (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-4 rounded-lg border border-gray-200 p-4 text-sm dark:border-gray-800 sm:grid-cols-3">
              <div>
                <dt className="text-gray-500">Rows</dt>
                <dd className="text-lg font-semibold">{table.rows.length.toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Columns</dt>
                <dd className="text-lg font-semibold">{table.columns.length}</dd>
              </div>
            </div>
            <div ref={gridContainerRef}>
              <LazySpreadsheetGridEditor key={gridVersion} table={table} onLiveChange={setLiveTable} />
            </div>
          </div>
        )}

        {mode === "analyze" && isTreeMode && (
          <p className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
            Analysis isn&rsquo;t available for this file — it isn&rsquo;t shaped as a table (see the Viewer tab).
          </p>
        )}

        {mode === "analyze" && format === "parquet" && !analysis && (
          <ProcessingStatus state="analyzing-schema" />
        )}

        {analysis && mode === "analyze" && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4 rounded-lg border border-gray-200 p-4 text-sm dark:border-gray-800 sm:grid-cols-3">
              <div>
                <dt className="text-gray-500">Rows</dt>
                <dd className="text-lg font-semibold">{analysis.rowCount.toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Columns</dt>
                <dd className="text-lg font-semibold">{analysis.columnCount}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Duplicate rows</dt>
                <dd className="text-lg font-semibold">{analysis.duplicateRowCount.toLocaleString()}</dd>
              </div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    {["Column", "Type", "Nulls", "Distinct", "Min", "Max", "Mean", "Median"].map((h) => (
                      <th
                        key={h}
                        className="border-b border-gray-200 px-3 py-2 text-left font-medium dark:border-gray-800"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {analysis.columns.map((col) => (
                    <tr key={col.name}>
                      <td className="border-b border-gray-100 px-3 py-2 dark:border-gray-900">{col.name}</td>
                      <td className="border-b border-gray-100 px-3 py-2 font-mono text-xs dark:border-gray-900">
                        {col.type}
                      </td>
                      <td className="border-b border-gray-100 px-3 py-2 dark:border-gray-900">{col.nullCount}</td>
                      <td className="border-b border-gray-100 px-3 py-2 dark:border-gray-900">{col.distinctCount}</td>
                      <td className="border-b border-gray-100 px-3 py-2 dark:border-gray-900">{col.min ?? "—"}</td>
                      <td className="border-b border-gray-100 px-3 py-2 dark:border-gray-900">{col.max ?? "—"}</td>
                      <td className="border-b border-gray-100 px-3 py-2 dark:border-gray-900">
                        {col.mean !== undefined ? col.mean.toFixed(2) : "—"}
                      </td>
                      <td className="border-b border-gray-100 px-3 py-2 dark:border-gray-900">{col.median ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
          </>
        )}
      </div>
    </AppShell>
  );
}

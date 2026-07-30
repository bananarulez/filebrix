"use client";

import { useState } from "react";
import { FileDropZone } from "@/components/tools/FileDropZone";
import { FileInfo } from "@/components/tools/FileInfo";
import { ProcessingStatus, type ProcessingState } from "@/components/tools/ProcessingStatus";
import { ErrorPanel } from "@/components/tools/ErrorPanel";
import { DownloadResult } from "@/components/tools/DownloadResult";
import { deriveOutputFilename } from "@/lib/format/deriveOutputFilename";
import { ProcessingError, type ProcessingErrorCode } from "@/lib/errors/ProcessingError";
import { parseCsvFile, type NormalizedTable } from "@/engines/spreadsheet";
import {
  buildInsertStatements,
  INSERT_SQL_DIALECTS,
  INSERT_SQL_DIALECT_LABELS,
  type InsertSqlDialect,
} from "@/engines/developer/sql/csvToInsert";

type ToolState =
  | { status: Exclude<ProcessingState, "error"> }
  | { status: "error"; message: string; code?: ProcessingErrorCode };

function errorFrom(cause: unknown, fallbackMessage: string): { message: string; code?: ProcessingErrorCode } {
  if (cause instanceof ProcessingError) return { message: cause.message, code: cause.code };
  return { message: fallbackMessage };
}

function defaultTableName(filename: string): string {
  const base = filename.replace(/\.[^./]+$/, "");
  const cleaned = base.replace(/[^A-Za-z0-9_]/g, "_").replace(/^(\d)/, "_$1");
  return cleaned || "my_table";
}

export function CsvToSqlTool() {
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<ToolState>({ status: "idle" });
  const [table, setTable] = useState<NormalizedTable | null>(null);
  const [tableName, setTableName] = useState("my_table");
  const [dialect, setDialect] = useState<InsertSqlDialect>("standard");
  const [output, setOutput] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isConverting, setIsConverting] = useState(false);

  const isBusy = state.status === "opening-file" || state.status === "reading";

  async function handleFilesSelected(files: File[]) {
    const [selected] = files;
    if (!selected) return;

    setFile(selected);
    setTable(null);
    setOutput(null);
    setWarnings([]);
    setTableName(defaultTableName(selected.name));
    setState({ status: "opening-file" });

    setState({ status: "reading" });
    try {
      const parsed = await parseCsvFile(selected);
      setTable(parsed);
      setState({ status: "ready" });
    } catch (cause) {
      setState({ status: "error", ...errorFrom(cause, "Could not read this CSV file.") });
    }
  }

  function handleConvert() {
    if (!table) return;
    setIsConverting(true);
    try {
      const result = buildInsertStatements(table, { tableName, dialect });
      setOutput(result.output);
      setWarnings(result.warnings);
    } catch (cause) {
      setState({ status: "error", ...errorFrom(cause, "Could not build INSERT statements from this CSV.") });
    } finally {
      setIsConverting(false);
    }
  }

  function handleClear() {
    setFile(null);
    setTable(null);
    setOutput(null);
    setWarnings([]);
    setState({ status: "idle" });
  }

  return (
    <div className="flex flex-col gap-4">
      <FileDropZone
        label={file ? "Drop a different CSV file" : "Drop a .csv file here"}
        hint="Nothing is uploaded — conversion happens entirely on your device."
        accept=".csv"
        onFilesSelected={handleFilesSelected}
        toolSlug="csv-to-sql"
      />

      {file && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <FileInfo file={file} detectedFormat="csv" />
          <button
            type="button"
            onClick={handleClear}
            className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:border-gray-400 hover:text-gray-900 dark:border-gray-700 dark:text-gray-300 dark:hover:text-white"
          >
            Clear file
          </button>
        </div>
      )}

      {isBusy && <ProcessingStatus state={state.status} />}

      {state.status === "error" && <ErrorPanel message={state.message} code={state.code} />}

      {table && (
        <div className="flex flex-col gap-4">
          <fieldset className="flex flex-wrap items-end gap-4 rounded-lg border border-gray-200 p-4 text-sm dark:border-gray-800">
            <legend className="px-1 font-medium">INSERT options</legend>
            <label className="flex flex-col gap-1">
              <span>Table name</span>
              <input
                type="text"
                value={tableName}
                onChange={(event) => setTableName(event.target.value)}
                className="w-48 rounded-md border border-gray-300 px-2 py-1.5 font-mono dark:border-gray-700 dark:bg-gray-900"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span>SQL dialect</span>
              <select
                value={dialect}
                onChange={(event) => setDialect(event.target.value as InsertSqlDialect)}
                className="rounded-md border border-gray-300 px-2 py-1.5 dark:border-gray-700 dark:bg-gray-900"
              >
                {INSERT_SQL_DIALECTS.map((option) => (
                  <option key={option} value={option}>
                    {INSERT_SQL_DIALECT_LABELS[option]}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={handleConvert}
              disabled={!tableName.trim() || isConverting}
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {isConverting ? "Building…" : "Build INSERT statements"}
            </button>
          </fieldset>
        </div>
      )}

      {output !== null && file && (
        <div className="flex flex-col gap-3">
          {warnings.length > 0 && (
            <ul className="flex flex-col gap-1 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          )}
          <textarea
            readOnly
            value={output}
            rows={12}
            spellCheck={false}
            aria-label="Generated SQL INSERT statements"
            className="w-full rounded-lg border border-gray-200 bg-gray-50 p-3 font-mono text-sm dark:border-gray-800 dark:bg-gray-900"
          />
          <DownloadResult
            filename={deriveOutputFilename(file.name, "sql")}
            blob={new Blob([output], { type: "text/plain;charset=utf-8" })}
            label="Download .sql"
          />
        </div>
      )}
    </div>
  );
}

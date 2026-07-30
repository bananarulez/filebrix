"use client";

import { useEffect, useRef, useState } from "react";
import { ErrorPanel } from "@/components/tools/ErrorPanel";
import { DownloadResult } from "@/components/tools/DownloadResult";
import { ProcessingError, type ProcessingErrorCode } from "@/lib/errors/ProcessingError";
import { formatSqlText, SQL_DIALECTS, SQL_DIALECT_LABELS, type SqlDialect } from "@/engines/developer/sql/formatSql";
import { takePendingFile } from "@/lib/fileHandoff";

const TOOL_SLUG = "sql-formatter";

interface ErrorState {
  message: string;
  code?: ProcessingErrorCode;
}

function errorFrom(cause: unknown): ErrorState {
  if (cause instanceof ProcessingError) return { message: cause.message, code: cause.code };
  return { message: "Something went wrong formatting this SQL." };
}

const PLACEHOLDER = "select id,name,email from users where active=1 order by name;";

/**
 * Not built on TextTransformTool: `sql-formatter` is lazy-loaded via a
 * dynamic import (rule 4), so formatting is inherently async, whereas
 * TextTransformTool's `transform` prop is synchronous by design.
 */
export function SqlFormatterTool() {
  const [input, setInput] = useState("");
  const [dialect, setDialect] = useState<SqlDialect>("sql");
  const [openedFileName, setOpenedFileName] = useState<string | null>(null);
  const [output, setOutput] = useState<string | null>(null);
  const [error, setError] = useState<ErrorState | null>(null);
  const [isFormatting, setIsFormatting] = useState(false);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function runFormat(text: string, currentDialect: SqlDialect) {
    setIsFormatting(true);
    setError(null);
    try {
      const result = await formatSqlText(text, currentDialect);
      setOutput(result.output);
    } catch (cause) {
      setError(errorFrom(cause));
      setOutput(null);
    } finally {
      setIsFormatting(false);
    }
  }

  async function loadFile(file: File, currentDialect: SqlDialect) {
    const text = await file.text();
    setOpenedFileName(file.name);
    setInput(text);
    await runFormat(text, currentDialect);
  }

  async function handleFileChange(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    await loadFile(file, dialect);
  }

  useEffect(() => {
    const consumeHandoff = () => {
      const handedOffFile = takePendingFile(TOOL_SLUG);
      if (handedOffFile) void loadFile(handedOffFile, dialect);
    };
    consumeHandoff();
    // Deliberately mount-only, like the other handoff effects in this codebase.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCopy() {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    }
    setTimeout(() => setCopyStatus("idle"), 2000);
  }

  const downloadFilename = openedFileName ? openedFileName.replace(/\.[^./]+$/, "") + ".sql" : "formatted.sql";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="sql-input" className="text-sm font-medium">
          SQL input
        </label>
        <textarea
          id="sql-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={PLACEHOLDER}
          rows={12}
          spellCheck={false}
          className="w-full rounded-lg border border-gray-300 p-3 font-mono text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-gray-700 dark:bg-gray-900"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <span className="font-medium">Dialect</span>
          <select
            value={dialect}
            onChange={(event) => setDialect(event.target.value as SqlDialect)}
            className="rounded-md border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900"
          >
            {SQL_DIALECTS.map((option) => (
              <option key={option} value={option}>
                {SQL_DIALECT_LABELS[option]}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:border-gray-400 hover:text-gray-900 dark:border-gray-700 dark:text-gray-300 dark:hover:text-white"
        >
          Open file
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".sql,.txt"
          className="sr-only"
          onChange={(event) => void handleFileChange(event.target.files)}
        />
        <button
          type="button"
          onClick={() => void runFormat(input, dialect)}
          disabled={isFormatting || !input}
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {isFormatting ? "Formatting…" : "Format"}
        </button>
      </div>

      {error && <ErrorPanel message={error.message} code={error.code} />}

      {output !== null && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="sql-output" className="text-sm font-medium">
              Formatted SQL
            </label>
            <textarea
              id="sql-output"
              value={output}
              readOnly
              rows={12}
              spellCheck={false}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 p-3 font-mono text-sm dark:border-gray-800 dark:bg-gray-900"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:border-gray-400 hover:text-gray-900 dark:border-gray-700 dark:text-gray-300 dark:hover:text-white"
            >
              {copyStatus === "copied" ? "Copied!" : copyStatus === "error" ? "Couldn't copy" : "Copy result"}
            </button>
            <DownloadResult
              filename={downloadFilename}
              blob={new Blob([output], { type: "text/plain;charset=utf-8" })}
              label="Download .sql"
            />
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { ProcessingStatus } from "@/components/tools/ProcessingStatus";
import { ErrorPanel } from "@/components/tools/ErrorPanel";
import { DownloadResult } from "@/components/tools/DownloadResult";
import { usePdfWorkspace } from "./PdfWorkspace";
import { ProcessingError, type ProcessingErrorCode } from "@/lib/errors/ProcessingError";

const NO_TEXT_MESSAGE = "No extractable text was found. This document may be scanned.";

interface ToolError {
  message: string;
  code?: ProcessingErrorCode;
}

function errorFrom(cause: unknown, fallback: string): ToolError {
  if (cause instanceof ProcessingError) return { message: cause.message, code: cause.code };
  return { message: fallback };
}

/**
 * Presentational with respect to the file, and it extracts through the
 * `PdfWorkspace`'s already-open pdf.js session rather than opening and
 * closing one of its own. Keyed on `documentKey` by `PdfStudioApp`, so a new
 * file remounts it with no extracted text.
 */
export function PdfToTextTool() {
  const { documents } = usePdfWorkspace();
  const doc = documents[0] ?? null;
  const session = doc?.session ?? null;

  const [text, setText] = useState<string | null>(null);
  const [noTextFound, setNoTextFound] = useState(false);
  const [error, setError] = useState<ToolError | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    session
      .extractText()
      .then((extraction) => {
        if (cancelled) return;
        if (!extraction.hasExtractableText) setNoTextFound(true);
        else setText(extraction.pages.join("\n\n"));
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(errorFrom(cause, "Could not extract text from this PDF."));
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  // Derived, not stored — see the equivalent note in PdfMetadataTool.
  const isExtracting = Boolean(session) && text === null && !noTextFound && !error;

  async function handleCopy() {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-4">
      {isExtracting && <ProcessingStatus state="processing" />}
      {error && <ErrorPanel message={error.message} code={error.code} />}

      {noTextFound && (
        <div
          role="status"
          className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200"
        >
          {NO_TEXT_MESSAGE}
        </div>
      )}

      {text !== null && (
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Extracted text</span>
            <textarea
              readOnly
              aria-label="Extracted text"
              value={text}
              rows={16}
              className="rounded-lg border border-gray-300 p-3 font-mono text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-gray-700 dark:bg-gray-900"
            />
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCopy}
              className="rounded-md border border-gray-200 px-3 py-1.5 text-sm hover:border-gray-400 dark:border-gray-700"
            >
              {copied ? "Copied!" : "Copy text"}
            </button>
            <DownloadResult
              filename="extracted-text.txt"
              blob={new Blob([text], { type: "text/plain;charset=utf-8" })}
              label="Download .txt"
            />
          </div>
        </div>
      )}
    </div>
  );
}

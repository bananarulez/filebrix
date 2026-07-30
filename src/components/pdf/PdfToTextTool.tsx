"use client";

import { useState } from "react";
import { FileDropZone } from "@/components/tools/FileDropZone";
import { FileInfo } from "@/components/tools/FileInfo";
import { ProcessingStatus, type ProcessingState } from "@/components/tools/ProcessingStatus";
import { ErrorPanel } from "@/components/tools/ErrorPanel";
import { DownloadResult } from "@/components/tools/DownloadResult";
import { openPdfRenderSession } from "@/engines/pdf/render/session";
import { ProcessingError, type ProcessingErrorCode } from "@/lib/errors/ProcessingError";

const NO_TEXT_MESSAGE = "No extractable text was found. This document may be scanned.";

type ToolState =
  | { status: Exclude<ProcessingState, "error"> }
  | { status: "error"; message: string; code?: ProcessingErrorCode };

function errorFrom(cause: unknown, fallback: string): { message: string; code?: ProcessingErrorCode } {
  if (cause instanceof ProcessingError) return { message: cause.message, code: cause.code };
  return { message: fallback };
}

export function PdfToTextTool() {
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<ToolState>({ status: "idle" });
  const [text, setText] = useState<string | null>(null);
  const [noTextFound, setNoTextFound] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleFilesSelected(selected: File[]) {
    const [selectedFile] = selected;
    if (!selectedFile) return;

    setFile(selectedFile);
    setText(null);
    setNoTextFound(false);
    setCopied(false);
    setState({ status: "processing" });

    let session: Awaited<ReturnType<typeof openPdfRenderSession>> | null = null;
    try {
      session = await openPdfRenderSession(selectedFile);
      const extraction = await session.extractText();
      if (!extraction.hasExtractableText) {
        setNoTextFound(true);
      } else {
        setText(extraction.pages.join("\n\n"));
      }
      setState({ status: "done" });
    } catch (cause) {
      setState({ status: "error", ...errorFrom(cause, "Could not extract text from this PDF.") });
    } finally {
      await session?.close().catch(() => {});
    }
  }

  function handleClear() {
    setFile(null);
    setText(null);
    setNoTextFound(false);
    setState({ status: "idle" });
  }

  async function handleCopy() {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const isBusy = state.status === "processing";

  return (
    <div className="flex flex-col gap-4">
      <FileDropZone
        label={file ? "Drop a different PDF file" : "Drop a PDF file here"}
        hint="Nothing is uploaded — text is extracted entirely on your device. No OCR is performed."
        accept=".pdf,application/pdf"
        onFilesSelected={handleFilesSelected}
        toolSlug="pdf-to-txt"
      />

      {file && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <FileInfo file={file} detectedFormat="pdf" />
          <button
            type="button"
            onClick={handleClear}
            className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:border-gray-400 hover:text-gray-900 dark:border-gray-700 dark:text-gray-300 dark:hover:text-white"
          >
            Clear
          </button>
        </div>
      )}

      {isBusy && <ProcessingStatus state="processing" />}
      {state.status === "error" && <ErrorPanel message={state.message} code={state.code} />}

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

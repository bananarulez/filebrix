"use client";

import { useState } from "react";
import { FileDropZone } from "@/components/tools/FileDropZone";
import { FileInfo } from "@/components/tools/FileInfo";
import { ProcessingStatus, type ProcessingState } from "@/components/tools/ProcessingStatus";
import { ErrorPanel } from "@/components/tools/ErrorPanel";
import { DownloadResult } from "@/components/tools/DownloadResult";
import { readPdfMetadataFile, removePdfMetadataFile } from "@/engines/pdf";
import { PdfSignatureWarning } from "./PdfSignatureWarning";
import type { PdfMetadataInfo } from "@/engines/pdf";
import { ProcessingError, type ProcessingErrorCode } from "@/lib/errors/ProcessingError";

type ToolState =
  | { status: Exclude<ProcessingState, "error"> }
  | { status: "error"; message: string; code?: ProcessingErrorCode };

function errorFrom(cause: unknown, fallback: string): { message: string; code?: ProcessingErrorCode } {
  if (cause instanceof ProcessingError) return { message: cause.message, code: cause.code };
  return { message: fallback };
}

const FIELD_LABELS: { key: keyof PdfMetadataInfo; label: string }[] = [
  { key: "title", label: "Title" },
  { key: "author", label: "Author" },
  { key: "subject", label: "Subject" },
  { key: "keywords", label: "Keywords" },
  { key: "creator", label: "Creator" },
  { key: "producer", label: "Producer" },
  { key: "creationDate", label: "Creation date" },
  { key: "modificationDate", label: "Modification date" },
];

export function PdfMetadataTool({ mode }: { mode: "view" | "remove" }) {
  const [file, setFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<PdfMetadataInfo | null>(null);
  const [state, setState] = useState<ToolState>({ status: "idle" });
  const [result, setResult] = useState<{ blob: Blob; filename: string } | null>(null);

  async function handleFilesSelected(selected: File[]) {
    const [selectedFile] = selected;
    if (!selectedFile) return;

    setFile(selectedFile);
    setMetadata(null);
    setResult(null);
    setState({ status: "processing" });

    try {
      const info = await readPdfMetadataFile(selectedFile);
      setMetadata(info);
      setState({ status: "ready" });
    } catch (cause) {
      setState({ status: "error", ...errorFrom(cause, "Could not read this PDF's metadata.") });
    }
  }

  function handleClear() {
    setFile(null);
    setMetadata(null);
    setResult(null);
    setState({ status: "idle" });
  }

  async function handleRemove() {
    if (!file) return;
    setState({ status: "processing" });
    try {
      const blob = await removePdfMetadataFile(file);
      setResult({ blob, filename: "cleaned.pdf" });
      setState({ status: "done" });
    } catch (cause) {
      setState({ status: "error", ...errorFrom(cause, "Could not remove this PDF's metadata.") });
    }
  }

  const isBusy = state.status === "processing";

  return (
    <div className="flex flex-col gap-4">
      <FileDropZone
        label={file ? "Drop a different PDF file" : "Drop a PDF file here"}
        hint="Nothing is uploaded — metadata is read entirely on your device."
        accept=".pdf,application/pdf"
        onFilesSelected={handleFilesSelected}
        toolSlug={mode === "view" ? "metadata-viewer" : "remove-metadata"}
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

      {metadata?.hasSignature && <PdfSignatureWarning />}

      {metadata && (
        <div className="flex flex-col gap-4">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-2 rounded-lg border border-gray-200 p-4 text-sm sm:grid-cols-2 dark:border-gray-800">
            {FIELD_LABELS.map(({ key, label }) => (
              <div key={key}>
                <dt className="text-gray-500">{label}</dt>
                <dd className="font-medium">{(metadata[key] as string | undefined) || "—"}</dd>
              </div>
            ))}
            <div>
              <dt className="text-gray-500">Pages</dt>
              <dd className="font-medium">{metadata.pageCount}</dd>
            </div>
          </dl>

          {mode === "remove" && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={isBusy}
              className="inline-flex w-fit items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Remove metadata & download
            </button>
          )}
        </div>
      )}

      {result && (
        <DownloadResult filename={result.filename} blob={result.blob} label="Download cleaned.pdf" />
      )}
    </div>
  );
}

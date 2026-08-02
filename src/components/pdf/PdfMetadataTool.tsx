"use client";

import { useEffect, useState } from "react";
import { ProcessingStatus } from "@/components/tools/ProcessingStatus";
import { ErrorPanel } from "@/components/tools/ErrorPanel";
import { DownloadResult } from "@/components/tools/DownloadResult";
import { readPdfMetadataFile, removePdfMetadataFile } from "@/engines/pdf";
import { usePdfWorkspace } from "./PdfWorkspace";
import type { PdfMetadataInfo } from "@/engines/pdf";
import { ProcessingError, type ProcessingErrorCode } from "@/lib/errors/ProcessingError";

interface ToolError {
  message: string;
  code?: ProcessingErrorCode;
}

function errorFrom(cause: unknown, fallback: string): ToolError {
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

/**
 * Presentational with respect to the file: the PDF comes from
 * `PdfWorkspace`, so arriving here from the Pages or Convert tab needs no
 * second drop. `PdfStudioApp` keys this component on `documentKey`, so a
 * newly loaded file remounts it rather than needing a reset effect.
 */
export function PdfMetadataTool({ mode }: { mode: "view" | "remove" }) {
  const { documents } = usePdfWorkspace();
  const file = documents[0]?.file ?? null;

  const [metadata, setMetadata] = useState<PdfMetadataInfo | null>(null);
  const [error, setError] = useState<ToolError | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [result, setResult] = useState<{ blob: Blob; filename: string } | null>(null);

  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    readPdfMetadataFile(file)
      .then((info) => {
        if (!cancelled) setMetadata(info);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(errorFrom(cause, "Could not read this PDF's metadata."));
      });
    return () => {
      cancelled = true;
    };
  }, [file]);

  // Derived, not stored — a spinner can never get out of sync with the data.
  const isReading = Boolean(file) && !metadata && !error;

  async function handleRemove() {
    if (!file) return;
    setIsRemoving(true);
    setError(null);
    try {
      const blob = await removePdfMetadataFile(file);
      setResult({ blob, filename: "cleaned.pdf" });
    } catch (cause) {
      setError(errorFrom(cause, "Could not remove this PDF's metadata."));
    } finally {
      setIsRemoving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {(isReading || isRemoving) && <ProcessingStatus state="processing" />}
      {error && <ErrorPanel message={error.message} code={error.code} />}

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
              disabled={isRemoving}
              className="inline-flex w-fit items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Remove metadata &amp; download
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

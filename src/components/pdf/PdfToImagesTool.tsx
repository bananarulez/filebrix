"use client";

import { useState } from "react";
import { ProcessingProgress } from "@/components/tools/ProcessingProgress";
import { ErrorPanel } from "@/components/tools/ErrorPanel";
import { DownloadResult } from "@/components/tools/DownloadResult";
import { usePdfWorkspace } from "./PdfWorkspace";
import type { PdfImageFormat } from "@/engines/pdf";
import { ProcessingError, type ProcessingErrorCode } from "@/lib/errors/ProcessingError";

interface ToolError {
  message: string;
  code?: ProcessingErrorCode;
}

function errorFrom(cause: unknown, fallback: string): ToolError {
  if (cause instanceof ProcessingError) return { message: cause.message, code: cause.code };
  return { message: fallback };
}

/**
 * Presentational with respect to the file, and it no longer opens (or
 * closes) a pdf.js session of its own — it renders through the one
 * `PdfWorkspace` already holds, so converting after viewing or splitting the
 * same PDF doesn't re-parse it.
 */
export function PdfToImagesTool() {
  const { documents, currentLoadToken } = usePdfWorkspace();
  const doc = documents[0] ?? null;

  const [format, setFormat] = useState<PdfImageFormat>("png");
  const [error, setError] = useState<ToolError | null>(null);
  const [progress, setProgress] = useState<{ percent: number; message: string } | null>(null);
  const [result, setResult] = useState<{ blob: Blob; filename: string } | null>(null);

  async function handleConvert() {
    if (!doc) return;
    const session = doc.session;
    const token = currentLoadToken();
    setError(null);
    setResult(null);
    setProgress({ percent: 0, message: "Rendering pages…" });

    try {
      const pageCount = session.pageCount;
      const extension = format === "png" ? "png" : "jpg";

      if (pageCount === 1) {
        const blob = await session.renderPageImage(0, { format, scale: 2 });
        if (currentLoadToken() !== token) return;
        setResult({ blob, filename: `page-1.${extension}` });
      } else {
        const { default: JSZip } = await import("jszip");
        const zip = new JSZip();
        for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
          if (currentLoadToken() !== token) return;
          setProgress({
            percent: Math.round((pageIndex / pageCount) * 100),
            message: `Rendering page ${pageIndex + 1} of ${pageCount}…`,
          });
          // Sequential, not Promise.all — bounds peak memory on many-page PDFs.
          const blob = await session.renderPageImage(pageIndex, { format, scale: 2 });
          zip.file(`page-${pageIndex + 1}.${extension}`, blob);
        }
        setProgress({ percent: 100, message: "Packaging images…" });
        const zipBlob = await zip.generateAsync({ type: "blob" });
        if (currentLoadToken() !== token) return;
        setResult({ blob: zipBlob, filename: "pages.zip" });
      }
    } catch (cause) {
      if (currentLoadToken() !== token) return;
      setError(errorFrom(cause, "Could not render this PDF to images."));
    } finally {
      if (currentLoadToken() === token) setProgress(null);
    }
  }

  const isBusy = progress !== null;

  return (
    <div className="flex flex-col gap-4">
      {doc && (
        <div className="flex items-center gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="pdf-to-images-format"
              checked={format === "png"}
              onChange={() => setFormat("png")}
            />
            PNG (lossless)
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="pdf-to-images-format"
              checked={format === "jpeg"}
              onChange={() => setFormat("jpeg")}
            />
            JPEG (smaller files)
          </label>
          <button
            type="button"
            onClick={handleConvert}
            disabled={isBusy}
            className="ml-auto inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Convert to images
          </button>
        </div>
      )}

      {progress && <ProcessingProgress percent={progress.percent} message={progress.message} />}
      {error && <ErrorPanel message={error.message} code={error.code} />}
      {result && (
        <DownloadResult
          filename={result.filename}
          blob={result.blob}
          label={`Download ${result.filename}`}
          sourceToolSlug="pdf-to-images"
        />
      )}
    </div>
  );
}

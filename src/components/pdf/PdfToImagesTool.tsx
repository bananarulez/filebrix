"use client";

import { useState } from "react";
import { FileDropZone } from "@/components/tools/FileDropZone";
import { FileInfo } from "@/components/tools/FileInfo";
import { ProcessingProgress } from "@/components/tools/ProcessingProgress";
import { ErrorPanel } from "@/components/tools/ErrorPanel";
import { DownloadResult } from "@/components/tools/DownloadResult";
import { openPdfRenderSession } from "@/engines/pdf/render/session";
import type { PdfImageFormat } from "@/engines/pdf";
import { ProcessingError, type ProcessingErrorCode } from "@/lib/errors/ProcessingError";

type ToolState =
  | { status: "idle" | "opening-file" | "converting" | "done" }
  | { status: "error"; message: string; code?: ProcessingErrorCode };

function errorFrom(cause: unknown, fallback: string): { message: string; code?: ProcessingErrorCode } {
  if (cause instanceof ProcessingError) return { message: cause.message, code: cause.code };
  return { message: fallback };
}

export function PdfToImagesTool() {
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<PdfImageFormat>("png");
  const [state, setState] = useState<ToolState>({ status: "idle" });
  const [progress, setProgress] = useState<{ percent: number; message: string } | null>(null);
  const [result, setResult] = useState<{ blob: Blob; filename: string } | null>(null);

  function handleFilesSelected(selected: File[]) {
    const [selectedFile] = selected;
    if (!selectedFile) return;
    setResult(null);
    setFile(selectedFile);
    setState({ status: "idle" });
  }

  function handleClear() {
    setFile(null);
    setResult(null);
    setProgress(null);
    setState({ status: "idle" });
  }

  async function handleConvert() {
    if (!file) return;
    setState({ status: "converting" });
    setProgress({ percent: 0, message: "Opening PDF…" });

    let session: Awaited<ReturnType<typeof openPdfRenderSession>> | null = null;
    try {
      session = await openPdfRenderSession(file);
      const pageCount = session.pageCount;
      const extension = format === "png" ? "png" : "jpg";

      if (pageCount === 1) {
        const blob = await session.renderPageImage(0, { format, scale: 2 });
        setResult({ blob, filename: `page-1.${extension}` });
      } else {
        const { default: JSZip } = await import("jszip");
        const zip = new JSZip();
        for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
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
        setResult({ blob: zipBlob, filename: "pages.zip" });
      }
      setState({ status: "done" });
    } catch (cause) {
      setState({ status: "error", ...errorFrom(cause, "Could not render this PDF to images.") });
    } finally {
      await session?.close().catch(() => {});
      setProgress(null);
    }
  }

  const isBusy = state.status === "converting";

  return (
    <div className="flex flex-col gap-4">
      <FileDropZone
        label={file ? "Drop a different PDF file" : "Drop a PDF file here"}
        hint="Nothing is uploaded — pages are rendered to images entirely on your device."
        accept=".pdf,application/pdf"
        onFilesSelected={handleFilesSelected}
        toolSlug="pdf-to-images"
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

      {file && (
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
      {state.status === "error" && <ErrorPanel message={state.message} code={state.code} />}
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

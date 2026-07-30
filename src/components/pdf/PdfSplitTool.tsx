"use client";

import { useEffect, useRef, useState } from "react";
import { FileDropZone } from "@/components/tools/FileDropZone";
import { FileInfo } from "@/components/tools/FileInfo";
import { ProcessingStatus, type ProcessingState } from "@/components/tools/ProcessingStatus";
import { ProcessingProgress } from "@/components/tools/ProcessingProgress";
import { ErrorPanel } from "@/components/tools/ErrorPanel";
import { DownloadResult } from "@/components/tools/DownloadResult";
import { PdfThumbnail } from "./PdfThumbnail";
import { inspectPdfFile, buildPdfFromSelectionFiles } from "@/engines/pdf";
import { PdfSignatureWarning } from "./PdfSignatureWarning";
import type { PdfPageInfo } from "@/engines/pdf";
import { openPdfRenderSession, type PdfRenderSession } from "@/engines/pdf/render/session";
import type { Progress } from "@/engines/shared/types";
import { ProcessingError, type ProcessingErrorCode } from "@/lib/errors/ProcessingError";

type ToolState =
  | { status: Exclude<ProcessingState, "error"> }
  | { status: "error"; message: string; code?: ProcessingErrorCode };

function errorFrom(cause: unknown, fallback: string): { message: string; code?: ProcessingErrorCode } {
  if (cause instanceof ProcessingError) return { message: cause.message, code: cause.code };
  return { message: fallback };
}

/** Contiguous page ranges from a set of "split after this page" markers —
 * e.g. 5 pages with markers after page 2 and page 3 -> [[0,1],[2],[3,4]]. */
function computeRanges(pageCount: number, splitAfter: ReadonlySet<number>): number[][] {
  const ranges: number[][] = [];
  let current: number[] = [];
  for (let i = 0; i < pageCount; i += 1) {
    current.push(i);
    if (splitAfter.has(i) || i === pageCount - 1) {
      ranges.push(current);
      current = [];
    }
  }
  return ranges;
}

export function PdfSplitTool() {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PdfPageInfo[]>([]);
  const [splitAfter, setSplitAfter] = useState<Set<number>>(new Set());
  const [state, setState] = useState<ToolState>({ status: "idle" });
  const [progress, setProgress] = useState<Progress | null>(null);
  const [result, setResult] = useState<{ blob: Blob; filename: string } | null>(null);
  // Stale-request guard — see the equivalent in PdfPageWorkspaceTool. Drop a
  // second PDF while the first is still opening and the older run's pages,
  // signature flag and render session are discarded rather than racing the
  // newer one's into state.
  const requestRef = useRef(0);

  // `session` (state) is read during render for thumbnails; `sessionRef`
  // mirrors it only so the unmount-cleanup effect can reach the latest
  // session without a stale closure — never read during render itself.
  const [session, setSession] = useState<PdfRenderSession | null>(null);
  const [hasSignature, setHasSignature] = useState(false);
  const sessionRef = useRef<PdfRenderSession | null>(null);

  async function closeSession() {
    const current = sessionRef.current;
    sessionRef.current = null;
    setSession(null);
    if (current) await current.close().catch(() => {});
  }

  useEffect(() => {
    return () => {
      void closeSession();
    };
  }, []);

  async function handleFilesSelected(selected: File[]) {
    const [selectedFile] = selected;
    if (!selectedFile) return;

    const token = ++requestRef.current;

    await closeSession();
    setResult(null);
    setProgress(null);
    setSplitAfter(new Set());
    setState({ status: "opening-file" });

    try {
      const info = await inspectPdfFile(selectedFile);
      if (requestRef.current !== token) return;
      const newSession = await openPdfRenderSession(selectedFile);
      if (requestRef.current !== token) {
        await newSession.close().catch(() => {});
        return;
      }
      sessionRef.current = newSession;
      setSession(newSession);
      setHasSignature(info.hasSignature);
      setFile(selectedFile);
      setPages(info.pages);
      setState({ status: "ready" });
    } catch (cause) {
      if (requestRef.current !== token) return;
      setState({ status: "error", ...errorFrom(cause, "Could not open this PDF.") });
    }
  }

  async function handleClear() {
    requestRef.current += 1;
    await closeSession();
    setFile(null);
    setPages([]);
    setSplitAfter(new Set());
    setResult(null);
    setProgress(null);
    setHasSignature(false);
    setState({ status: "idle" });
  }

  function toggleMarker(pageIndex: number) {
    setSplitAfter((current) => {
      const next = new Set(current);
      if (next.has(pageIndex)) next.delete(pageIndex);
      else next.add(pageIndex);
      return next;
    });
  }

  async function handleSubmit() {
    if (!file) return;
    const ranges = computeRanges(pages.length, splitAfter);

    // Read, not bumped: a split is superseded by the next drop or clear.
    const token = requestRef.current;
    setState({ status: "processing" });
    setProgress({ percent: 0, message: "Preparing…" });

    // Split calls the same per-page-reporting primitive once per part, so
    // each part's own progress is folded into its slice of the overall bar
    // — a 40-part split reads as one continuous run rather than 40 restarts.
    function report(partIndex: number, inner: Progress) {
      if (requestRef.current !== token) return;
      const fraction = (partIndex + (inner.percent ?? 0) / 100) / ranges.length;
      const detail = inner.message ?? "Working…";
      setProgress({
        percent: Math.round(fraction * 100),
        message: ranges.length === 1 ? detail : `Part ${partIndex + 1} of ${ranges.length} — ${detail}`,
      });
    }

    try {
      if (ranges.length === 1) {
        const blob = await buildPdfFromSelectionFiles(
          [file],
          ranges[0]!.map((pageIndex) => ({ sourceIndex: 0, pageIndex })),
          (update) => report(0, update)
        );
        if (requestRef.current !== token) return;
        setResult({ blob, filename: "split-part-1.pdf" });
      } else {
        const { default: JSZip } = await import("jszip");
        const zip = new JSZip();
        for (const [i, range] of ranges.entries()) {
          const blob = await buildPdfFromSelectionFiles(
            [file],
            range.map((pageIndex) => ({ sourceIndex: 0, pageIndex })),
            (update) => report(i, update)
          );
          if (requestRef.current !== token) return;
          zip.file(`split-part-${i + 1}.pdf`, blob);
        }
        setProgress({ percent: 100, message: "Packaging parts…" });
        const zipBlob = await zip.generateAsync({ type: "blob" });
        if (requestRef.current !== token) return;
        setResult({ blob: zipBlob, filename: "split-pages.zip" });
      }
      setState({ status: "done" });
    } catch (cause) {
      if (requestRef.current !== token) return;
      setState({ status: "error", ...errorFrom(cause, "Could not split this PDF.") });
    } finally {
      if (requestRef.current === token) setProgress(null);
    }
  }

  const isBusy = state.status === "opening-file" || state.status === "processing";
  const ranges = computeRanges(pages.length, splitAfter);

  return (
    <div className="flex flex-col gap-4">
      <FileDropZone
        label={file ? "Drop a different PDF file" : "Drop a PDF file here"}
        hint="Nothing is uploaded — every page is read and rebuilt entirely on your device."
        accept=".pdf,application/pdf"
        onFilesSelected={handleFilesSelected}
        toolSlug="split"
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

      {isBusy && <ProcessingStatus state={state.status} />}
      {progress && <ProcessingProgress percent={progress.percent} message={progress.message} />}
      {state.status === "error" && <ErrorPanel message={state.message} code={state.code} />}

      {hasSignature && <PdfSignatureWarning />}

      {pages.length > 0 && session && (
        <>
          <p className="text-sm text-gray-500">
            Click the marker between two pages to split there. Currently {ranges.length}{" "}
            {ranges.length === 1 ? "part" : "parts"} will be produced.
          </p>
          <ul className="flex flex-wrap items-center gap-1" aria-label="Pages">
            {pages.map((page, index) => (
              <li key={page.index} className="flex items-center gap-1">
                <PdfThumbnail
                  pageNumber={page.index + 1}
                  width={page.width}
                  height={page.height}
                  rotation={page.rotation}
                  cacheKey={`page-${page.index}`}
                  render={() => session.renderThumbnail(page.index, 140)}
                />
                {index < pages.length - 1 && (
                  <button
                    type="button"
                    onClick={() => toggleMarker(page.index)}
                    aria-pressed={splitAfter.has(page.index)}
                    aria-label={`Toggle split after page ${page.index + 1}`}
                    className={`h-16 w-6 rounded text-lg ${
                      splitAfter.has(page.index)
                        ? "bg-blue-600 text-white"
                        : "border border-dashed border-gray-300 text-gray-300 hover:border-blue-400 hover:text-blue-400 dark:border-gray-700"
                    }`}
                  >
                    {splitAfter.has(page.index) ? "✂" : "┊"}
                  </button>
                )}
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isBusy}
            className="inline-flex w-fit items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Split PDF
          </button>
        </>
      )}

      {result && <DownloadResult filename={result.filename} blob={result.blob} label={`Download ${result.filename}`} />}
    </div>
  );
}

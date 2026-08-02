"use client";

import { useState } from "react";
import { ProcessingStatus } from "@/components/tools/ProcessingStatus";
import { ProcessingProgress } from "@/components/tools/ProcessingProgress";
import { ErrorPanel } from "@/components/tools/ErrorPanel";
import { DownloadResult } from "@/components/tools/DownloadResult";
import { PdfThumbnail } from "./PdfThumbnail";
import { buildPdfFromSelectionFiles } from "@/engines/pdf";
import { usePdfWorkspace } from "./PdfWorkspace";
import type { Progress } from "@/engines/shared/types";
import { ProcessingError, type ProcessingErrorCode } from "@/lib/errors/ProcessingError";

type ToolState =
  | { status: "idle" | "processing" | "done" }
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

/**
 * Presentational with respect to the file: the document comes from
 * `PdfWorkspace`, and `PdfStudioApp` folds `documentKey` into this
 * component's React `key`, so a newly loaded PDF remounts it with an empty
 * marker set rather than needing a reset effect.
 */
export function PdfSplitTool() {
  const { documents, currentLoadToken } = usePdfWorkspace();
  const [splitAfter, setSplitAfter] = useState<Set<number>>(new Set());
  const [state, setState] = useState<ToolState>({ status: "idle" });
  const [progress, setProgress] = useState<Progress | null>(null);
  const [result, setResult] = useState<{ blob: Blob; filename: string } | null>(null);

  const doc = documents[0] ?? null;
  const pages = doc?.info.pages ?? [];

  function toggleMarker(pageIndex: number) {
    setSplitAfter((current) => {
      const next = new Set(current);
      if (next.has(pageIndex)) next.delete(pageIndex);
      else next.add(pageIndex);
      return next;
    });
  }

  async function handleSubmit() {
    if (!doc) return;
    const file = doc.file;
    const ranges = computeRanges(pages.length, splitAfter);

    // Read, not bumped: a split is superseded by the next load or clear.
    const token = currentLoadToken();
    setState({ status: "processing" });
    setProgress({ percent: 0, message: "Preparing…" });

    // Split calls the same per-page-reporting primitive once per part, so
    // each part's own progress is folded into its slice of the overall bar
    // — a 40-part split reads as one continuous run rather than 40 restarts.
    function report(partIndex: number, inner: Progress) {
      if (currentLoadToken() !== token) return;
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
        if (currentLoadToken() !== token) return;
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
          if (currentLoadToken() !== token) return;
          zip.file(`split-part-${i + 1}.pdf`, blob);
        }
        setProgress({ percent: 100, message: "Packaging parts…" });
        const zipBlob = await zip.generateAsync({ type: "blob" });
        if (currentLoadToken() !== token) return;
        setResult({ blob: zipBlob, filename: "split-pages.zip" });
      }
      setState({ status: "done" });
    } catch (cause) {
      if (currentLoadToken() !== token) return;
      setState({ status: "error", ...errorFrom(cause, "Could not split this PDF.") });
    } finally {
      if (currentLoadToken() === token) setProgress(null);
    }
  }

  const isBusy = state.status === "processing";
  const ranges = computeRanges(pages.length, splitAfter);

  return (
    <div className="flex flex-col gap-4">
      {isBusy && <ProcessingStatus state="processing" />}
      {progress && <ProcessingProgress percent={progress.percent} message={progress.message} />}
      {state.status === "error" && <ErrorPanel message={state.message} code={state.code} />}

      {doc && pages.length > 0 && (
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
                  render={() => doc.session.renderThumbnail(page.index, 140)}
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

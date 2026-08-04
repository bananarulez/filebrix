"use client";

import { useState } from "react";
import { ProcessingStatus } from "@/components/tools/ProcessingStatus";
import { ProcessingProgress } from "@/components/tools/ProcessingProgress";
import { ErrorPanel } from "@/components/tools/ErrorPanel";
import { DownloadResult } from "@/components/tools/DownloadResult";
import { PdfThumbnail } from "./PdfThumbnail";
import { Lightbox } from "@/components/tools/Lightbox";
import { buildPdfFromSelectionFiles, type PageRef } from "@/engines/pdf";
import { usePdfWorkspace, type PdfWorkspaceDocument } from "./PdfWorkspace";
import type { Progress } from "@/engines/shared/types";
import { ProcessingError, type ProcessingErrorCode } from "@/lib/errors/ProcessingError";

export type WorkspaceMode = "merge" | "extract" | "delete" | "reorder" | "rotate";

/** This mode's own registry slug — not always `mode` itself (e.g. "extract" -> "extract-pages"), so the Universal File Drop's handoff can address the right tool. */
export const TOOL_SLUG_BY_MODE: Record<WorkspaceMode, string> = {
  merge: "merge",
  extract: "extract-pages",
  delete: "delete-pages",
  reorder: "reorder-pages",
  rotate: "rotate",
};

interface ModeConfig {
  multiFile: boolean;
  showCheckbox: boolean;
  checkboxLabel?: string;
  showMove: boolean;
  showRemove: boolean;
  showRotate: boolean;
  actionLabel: string;
  outputName: string;
  emptySelectionMessage?: string;
}

export const MODE_CONFIG: Record<WorkspaceMode, ModeConfig> = {
  merge: {
    multiFile: true,
    showCheckbox: false,
    showMove: true,
    showRemove: true,
    showRotate: false,
    actionLabel: "Merge & download",
    outputName: "merged.pdf",
  },
  extract: {
    multiFile: false,
    showCheckbox: true,
    checkboxLabel: "Keep",
    showMove: false,
    showRemove: false,
    showRotate: false,
    actionLabel: "Extract selected pages",
    outputName: "extracted.pdf",
    emptySelectionMessage: "Select at least one page to extract.",
  },
  delete: {
    multiFile: false,
    showCheckbox: true,
    checkboxLabel: "Delete",
    showMove: false,
    showRemove: false,
    showRotate: false,
    actionLabel: "Delete selected pages",
    outputName: "edited.pdf",
    emptySelectionMessage: "You can't delete every page — leave at least one page unchecked.",
  },
  reorder: {
    multiFile: false,
    showCheckbox: false,
    showMove: true,
    showRemove: false,
    showRotate: false,
    actionLabel: "Save reordered PDF",
    outputName: "reordered.pdf",
  },
  rotate: {
    multiFile: false,
    showCheckbox: false,
    showMove: false,
    showRemove: false,
    showRotate: true,
    actionLabel: "Apply rotation & download",
    outputName: "rotated.pdf",
  },
};

interface PageEntry {
  key: string;
  sourceIndex: number;
  pageIndex: number;
  pageNumber: number;
  width: number;
  height: number;
  baseRotation: number;
  rotationDelta: number;
  /** Meaning depends on mode: "keep" flag for extract, "delete" flag for delete. Unused otherwise. */
  marked: boolean;
}

type ToolState =
  | { status: "idle" | "processing" | "done" }
  | { status: "error"; message: string; code?: ProcessingErrorCode };

function errorFrom(cause: unknown, fallback: string): { message: string; code?: ProcessingErrorCode } {
  if (cause instanceof ProcessingError) return { message: cause.message, code: cause.code };
  return { message: fallback };
}

let entryKeyCounter = 0;
function nextEntryKey(): string {
  entryKeyCounter += 1;
  return `entry-${entryKeyCounter}`;
}

/** One `PageEntry` per page of every document from `startIndex` onward. */
function buildEntries(documents: PdfWorkspaceDocument[], startIndex: number): PageEntry[] {
  return documents.slice(startIndex).flatMap((doc, offset) =>
    doc.info.pages.map((page) => ({
      key: nextEntryKey(),
      sourceIndex: startIndex + offset,
      pageIndex: page.index,
      pageNumber: page.index + 1,
      width: page.width,
      height: page.height,
      baseRotation: page.rotation,
      rotationDelta: 0,
      marked: false,
    }))
  );
}

/** True when `next` is `previous` with more documents added at the end — merge's case. */
function isAppendOf(next: PdfWorkspaceDocument[], previous: PdfWorkspaceDocument[]): boolean {
  return next.length > previous.length && previous.every((doc, i) => next[i] === doc);
}

/**
 * Merge/extract/delete/reorder/rotate, all built on the one
 * `buildPdfFromSelection()` primitive. Presentational with respect to the
 * file: the document set comes from `PdfWorkspace`, so switching to another
 * Pages action (or another tab) keeps it loaded.
 */
export function PdfPageWorkspaceTool({ mode }: { mode: WorkspaceMode }) {
  const config = MODE_CONFIG[mode];
  const { documents, currentLoadToken } = usePdfWorkspace();

  const [entries, setEntries] = useState<PageEntry[]>(() => buildEntries(documents, 0));
  const [state, setState] = useState<ToolState>({ status: "idle" });
  const [progress, setProgress] = useState<Progress | null>(null);
  const [result, setResult] = useState<{ blob: Blob; filename: string } | null>(null);

  /**
   * Rebuild the page list when the workspace's documents change — adjusting
   * state during render, React's documented alternative to an effect for
   * "state derived from a changed prop." An *append* (merge adding another
   * file) keeps the entries already on screen, including any reordering or
   * rotation the user has applied, and only appends the new document's
   * pages; anything else is a replacement and starts over.
   */
  const [seenDocuments, setSeenDocuments] = useState(documents);
  if (documents !== seenDocuments) {
    const appended = isAppendOf(documents, seenDocuments);
    setSeenDocuments(documents);
    if (appended) {
      setEntries((current) => [...current, ...buildEntries(documents, seenDocuments.length)]);
    } else {
      setEntries(buildEntries(documents, 0));
      setState({ status: "idle" });
      setProgress(null);
      setResult(null);
    }
  }

  function moveEntry(index: number, direction: -1 | 1) {
    setEntries((current) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= current.length) return current;
      const next = [...current];
      const [moved] = next.splice(index, 1);
      next.splice(targetIndex, 0, moved!);
      return next;
    });
  }

  function removeEntry(index: number) {
    setEntries((current) => current.filter((_, i) => i !== index));
  }

  function toggleMark(index: number) {
    setEntries((current) =>
      current.map((entry, i) => (i === index ? { ...entry, marked: !entry.marked } : entry))
    );
  }

  function rotateEntry(index: number, delta: number) {
    setEntries((current) =>
      current.map((entry, i) =>
        i === index ? { ...entry, rotationDelta: (((entry.rotationDelta + delta) % 360) + 360) % 360 } : entry
      )
    );
  }

  /**
   * The page currently open full size, if any.
   *
   * A 140px thumbnail is enough to count pages and not enough to tell which
   * one is which — so choosing *which* page to delete meant downloading the
   * PDF and opening it elsewhere, which is the opposite of what this tool is
   * for. `null` while the high-resolution render is still in flight, so the
   * dialog opens immediately rather than after a pause.
   */
  const [enlarged, setEnlarged] = useState<{ pageNumber: number; src: string | null } | null>(null);

  async function openPage(entry: PageEntry) {
    const doc = documents[entry.sourceIndex];
    if (!doc) return;
    setEnlarged({ pageNumber: entry.pageNumber, src: null });
    // Re-rendered rather than scaled up: the grid's copy is rasterised at
    // 140px, so enlarging that would just be a blurry 140px image.
    const rotation = (((entry.baseRotation + entry.rotationDelta) % 360) + 360) % 360;
    const src = await doc.session.renderThumbnail(entry.pageIndex, 1400, rotation);
    setEnlarged((current) =>
      current && current.pageNumber === entry.pageNumber ? { ...current, src } : current
    );
  }

  /**
   * Whether this page ends up in the output.
   *
   * The checkbox means opposite things in the two modes that have one —
   * "Delete" marks pages to drop, "Keep" marks pages to retain — so reading a
   * page's fate off `marked` alone is wrong half the time. Both the selection
   * that gets processed and the greyed-out rendering below go through this one
   * predicate, so what you see can't drift from what you get.
   */
  function willBeInOutput(entry: PageEntry): boolean {
    if (mode === "delete") return !entry.marked;
    if (mode === "extract") return entry.marked;
    return true;
  }

  function computeSelection(): PageRef[] {
    const source = entries.filter(willBeInOutput);
    return source.map((entry) => ({
      sourceIndex: entry.sourceIndex,
      pageIndex: entry.pageIndex,
      rotationDelta: entry.rotationDelta || undefined,
    }));
  }

  async function handleSubmit() {
    const selection = computeSelection();
    if (selection.length === 0) {
      setState({
        status: "error",
        message: config.emptySelectionMessage ?? "No pages selected. Choose at least one page to continue.",
      });
      return;
    }
    if (mode === "merge" && documents.length < 2) {
      setState({ status: "error", message: "Add at least two PDF files to merge." });
      return;
    }

    const files = documents.map((doc) => doc.file);
    // A build is superseded by the next load or clear, never by itself — see
    // `currentLoadToken`'s doc comment in PdfWorkspace.
    const token = currentLoadToken();
    setState({ status: "processing" });
    setProgress({ percent: 0, message: "Preparing…" });
    try {
      const blob = await buildPdfFromSelectionFiles(files, selection, (update) => {
        if (currentLoadToken() !== token) return;
        setProgress(update);
      });
      if (currentLoadToken() !== token) return;
      setResult({ blob, filename: config.outputName });
      setState({ status: "done" });
    } catch (cause) {
      if (currentLoadToken() !== token) return;
      setState({ status: "error", ...errorFrom(cause, "Could not process this PDF.") });
    } finally {
      if (currentLoadToken() === token) setProgress(null);
    }
  }

  const isBusy = state.status === "processing";

  return (
    <div className="flex flex-col gap-4">
      {isBusy && <ProcessingStatus state="processing" />}
      {progress && <ProcessingProgress percent={progress.percent} message={progress.message} />}
      {state.status === "error" && <ErrorPanel message={state.message} code={state.code} />}

      {entries.length > 0 && (
        <>
          <Lightbox
            src={enlarged?.src ?? null}
            open={enlarged !== null}
            alt={enlarged ? `Page ${enlarged.pageNumber}` : ""}
            caption={enlarged ? `Page ${enlarged.pageNumber}` : undefined}
            onClose={() => setEnlarged(null)}
          />

          <ul className="flex flex-wrap gap-3" aria-label="Pages">
            {entries.map((entry, index) => {
              const doc = documents[entry.sourceIndex];
              const totalRotation = (((entry.baseRotation + entry.rotationDelta) % 360) + 360) % 360;
              // Moving and rotating already show their effect immediately;
              // dropping a page didn't, so a delete or extract selection was
              // invisible until after you'd committed to it and downloaded.
              const dropped = !willBeInOutput(entry);
              return (
                <li key={entry.key} className="flex flex-col items-center gap-1">
                  {doc && (
                    <button
                      type="button"
                      onClick={() => void openPage(entry)}
                      title={`View page ${entry.pageNumber} full size`}
                      aria-label={`View page ${entry.pageNumber} full size`}
                      className={`cursor-zoom-in rounded-md transition-opacity hover:opacity-80 ${
                        dropped ? "opacity-30 grayscale" : ""
                      }`}
                    >
                      <PdfThumbnail
                        pageNumber={entry.pageNumber}
                        width={entry.width}
                        height={entry.height}
                        rotation={totalRotation}
                        cacheKey={`${entry.key}-${totalRotation}`}
                        render={() => doc.session.renderThumbnail(entry.pageIndex, 140, totalRotation)}
                      />
                    </button>
                  )}
                  <div className="flex flex-wrap items-center justify-center gap-1">
                    {config.showCheckbox && (
                      <label className="flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={entry.marked}
                          onChange={() => toggleMark(index)}
                          aria-label={`${config.checkboxLabel} page ${entry.pageNumber}`}
                        />
                        {config.checkboxLabel}
                      </label>
                    )}
                    {config.showMove && (
                      <>
                        <button
                          type="button"
                          onClick={() => moveEntry(index, -1)}
                          disabled={index === 0}
                          aria-label={`Move page ${entry.pageNumber} earlier`}
                          className="rounded border border-gray-200 px-1.5 py-0.5 text-xs disabled:opacity-30 dark:border-gray-700"
                        >
                          ←
                        </button>
                        <button
                          type="button"
                          onClick={() => moveEntry(index, 1)}
                          disabled={index === entries.length - 1}
                          aria-label={`Move page ${entry.pageNumber} later`}
                          className="rounded border border-gray-200 px-1.5 py-0.5 text-xs disabled:opacity-30 dark:border-gray-700"
                        >
                          →
                        </button>
                      </>
                    )}
                    {config.showRemove && (
                      <button
                        type="button"
                        onClick={() => removeEntry(index)}
                        aria-label={`Remove page ${entry.pageNumber}`}
                        className="rounded border border-gray-200 px-1.5 py-0.5 text-xs text-red-600 dark:border-gray-700"
                      >
                        Remove
                      </button>
                    )}
                    {config.showRotate && (
                      <>
                        <button
                          type="button"
                          onClick={() => rotateEntry(index, -90)}
                          aria-label={`Rotate page ${entry.pageNumber} left`}
                          className="rounded border border-gray-200 px-1.5 py-0.5 text-xs dark:border-gray-700"
                        >
                          ⟲
                        </button>
                        <button
                          type="button"
                          onClick={() => rotateEntry(index, 90)}
                          aria-label={`Rotate page ${entry.pageNumber} right`}
                          className="rounded border border-gray-200 px-1.5 py-0.5 text-xs dark:border-gray-700"
                        >
                          ⟳
                        </button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isBusy}
            className="inline-flex w-fit items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {config.actionLabel}
          </button>
        </>
      )}

      {result && <DownloadResult filename={result.filename} blob={result.blob} label={`Download ${result.filename}`} />}
    </div>
  );
}

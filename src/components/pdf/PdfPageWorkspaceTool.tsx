"use client";

import { useEffect, useRef, useState } from "react";
import { FileDropZone } from "@/components/tools/FileDropZone";
import { FileInfo } from "@/components/tools/FileInfo";
import { ProcessingStatus, type ProcessingState } from "@/components/tools/ProcessingStatus";
import { ProcessingProgress } from "@/components/tools/ProcessingProgress";
import { ErrorPanel } from "@/components/tools/ErrorPanel";
import { DownloadResult } from "@/components/tools/DownloadResult";
import { PdfThumbnail } from "./PdfThumbnail";
import { inspectPdfFile, buildPdfFromSelectionFiles, type PageRef } from "@/engines/pdf";
import { PdfSignatureWarning } from "./PdfSignatureWarning";
import { openPdfRenderSession, type PdfRenderSession } from "@/engines/pdf/render/session";
import type { Progress } from "@/engines/shared/types";
import { ProcessingError, type ProcessingErrorCode } from "@/lib/errors/ProcessingError";

export type WorkspaceMode = "merge" | "extract" | "delete" | "reorder" | "rotate";

/** This mode's own registry slug — not always `mode` itself (e.g. "extract" -> "extract-pages"), so the Universal File Drop's handoff can address the right tool. */
const TOOL_SLUG_BY_MODE: Record<WorkspaceMode, string> = {
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
  dropLabel: string;
  emptySelectionMessage?: string;
}

const MODE_CONFIG: Record<WorkspaceMode, ModeConfig> = {
  merge: {
    multiFile: true,
    showCheckbox: false,
    showMove: true,
    showRemove: true,
    showRotate: false,
    actionLabel: "Merge & download",
    outputName: "merged.pdf",
    dropLabel: "Drop two or more PDF files here",
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
    dropLabel: "Drop a PDF file here",
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
    dropLabel: "Drop a PDF file here",
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
    dropLabel: "Drop a PDF file here",
  },
  rotate: {
    multiFile: false,
    showCheckbox: false,
    showMove: false,
    showRemove: false,
    showRotate: true,
    actionLabel: "Apply rotation & download",
    outputName: "rotated.pdf",
    dropLabel: "Drop a PDF file here",
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
  | { status: Exclude<ProcessingState, "error"> }
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

export function PdfPageWorkspaceTool({ mode }: { mode: WorkspaceMode }) {
  const config = MODE_CONFIG[mode];

  const [files, setFiles] = useState<File[]>([]);
  const [entries, setEntries] = useState<PageEntry[]>([]);
  const [state, setState] = useState<ToolState>({ status: "idle" });
  const [progress, setProgress] = useState<Progress | null>(null);
  const [result, setResult] = useState<{ blob: Blob; filename: string } | null>(null);
  // Stale-request guard, same intent as ParquetViewerTool's `cancelled` flag
  // — a ref rather than an effect-local variable because the work starts in
  // an event handler, not an effect. Every drop bumps it; anything opened or
  // built under an older token is discarded instead of being applied on top
  // of newer state. Without it, dropping a second file before the first
  // finished opening let the loser's `setEntries`/`setFiles` land last (page
  // list from one file, render sessions from another) and leaked the
  // superseded file's sessions entirely.
  const requestRef = useRef(0);
  // Sessions are read during render (thumbnails need them), so they're
  // state, not a ref — but the unmount-cleanup effect below needs a
  // non-stale reference to whatever is currently open, hence the mirrored
  // ref, written only from event handlers, never read during render.
  const [sessions, setSessions] = useState<PdfRenderSession[]>([]);
  // Merge takes several files: warn if *any* source is signed.
  const [hasSignature, setHasSignature] = useState(false);
  const sessionsRef = useRef<PdfRenderSession[]>([]);

  async function closeSessions() {
    const current = sessionsRef.current;
    sessionsRef.current = [];
    setSessions([]);
    await Promise.all(current.map((session) => session.close().catch(() => {})));
  }

  useEffect(() => {
    return () => {
      void closeSessions();
    };
  }, []);

  async function discardSessions(sessions: PdfRenderSession[]) {
    await Promise.all(sessions.map((session) => session.close().catch(() => {})));
  }

  async function handleFilesSelected(selected: File[]) {
    if (selected.length === 0) return;

    // Supersede anything still in flight before touching any state.
    const token = ++requestRef.current;

    // Single-file modes replace whatever was open (and must close its
    // render session first); merge appends, so existing sessions/entries
    // stay alive and only need extending.
    if (!config.multiFile) {
      await closeSessions();
      // A replacing file re-decides the signature warning on its own; merge
      // deliberately keeps it, since an earlier signed source is still in
      // the output.
      setHasSignature(false);
    }
    setResult(null);
    setProgress(null);
    setState({ status: "opening-file" });

    const nextFiles = config.multiFile ? [...files, ...selected] : [selected[0]!];
    const startIndex = config.multiFile ? files.length : 0;

    const newSessions: PdfRenderSession[] = [];
    try {
      const newEntries: PageEntry[] = config.multiFile ? [...entries] : [];
      // Held locally rather than written straight to state: a run that gets
      // superseded mid-loop must not leave its warning behind.
      let sawSignature = false;

      for (const [offset, file] of selected.entries()) {
        const sourceIndex = startIndex + offset;
        const info = await inspectPdfFile(file);
        if (requestRef.current !== token) return await discardSessions(newSessions);
        if (info.hasSignature) sawSignature = true;
        const session = await openPdfRenderSession(file);
        newSessions.push(session);
        if (requestRef.current !== token) return await discardSessions(newSessions);
        for (const page of info.pages) {
          newEntries.push({
            key: nextEntryKey(),
            sourceIndex,
            pageIndex: page.index,
            pageNumber: page.index + 1,
            width: page.width,
            height: page.height,
            baseRotation: page.rotation,
            rotationDelta: 0,
            marked: false,
          });
        }
      }

      const nextSessions = config.multiFile ? [...sessionsRef.current, ...newSessions] : newSessions;
      sessionsRef.current = nextSessions;
      setSessions(nextSessions);
      setFiles(nextFiles);
      setEntries(newEntries);
      if (sawSignature) setHasSignature(true);
      setState({ status: "ready" });
    } catch (cause) {
      if (requestRef.current !== token) return await discardSessions(newSessions);
      setState({ status: "error", ...errorFrom(cause, "Could not open this PDF.") });
    }
  }

  async function handleClear() {
    requestRef.current += 1;
    await closeSessions();
    setFiles([]);
    setEntries([]);
    setResult(null);
    setProgress(null);
    setHasSignature(false);
    setState({ status: "idle" });
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

  function computeSelection(): PageRef[] {
    const source =
      mode === "delete" ? entries.filter((e) => !e.marked) : mode === "extract" ? entries.filter((e) => e.marked) : entries;
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
    if (mode === "merge" && files.length < 2) {
      setState({ status: "error", message: "Add at least two PDF files to merge." });
      return;
    }

    // Read, not bumped: a build is superseded by the *next* drop or clear,
    // not by itself.
    const token = requestRef.current;
    setState({ status: "processing" });
    setProgress({ percent: 0, message: "Preparing…" });
    try {
      const blob = await buildPdfFromSelectionFiles(files, selection, (update) => {
        if (requestRef.current !== token) return;
        setProgress(update);
      });
      if (requestRef.current !== token) return;
      setResult({ blob, filename: config.outputName });
      setState({ status: "done" });
    } catch (cause) {
      if (requestRef.current !== token) return;
      setState({ status: "error", ...errorFrom(cause, "Could not process this PDF.") });
    } finally {
      if (requestRef.current === token) setProgress(null);
    }
  }

  const isBusy = state.status === "opening-file" || state.status === "processing";
  const hasFiles = files.length > 0;

  return (
    <div className="flex flex-col gap-4">
      <FileDropZone
        label={hasFiles ? (config.multiFile ? "Drop more PDF files" : "Drop a different PDF file") : config.dropLabel}
        hint="Nothing is uploaded — every page is read and rebuilt entirely on your device."
        accept=".pdf,application/pdf"
        multiple={config.multiFile}
        onFilesSelected={handleFilesSelected}
        toolSlug={TOOL_SLUG_BY_MODE[mode]}
      />

      {hasFiles && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {files.map((file, i) => (
              <FileInfo key={`${file.name}-${i}`} file={file} detectedFormat="pdf" />
            ))}
          </div>
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

      {entries.length > 0 && (
        <>
          <ul className="flex flex-wrap gap-3" aria-label="Pages">
            {entries.map((entry, index) => {
              const session = sessions[entry.sourceIndex];
              const totalRotation = (((entry.baseRotation + entry.rotationDelta) % 360) + 360) % 360;
              return (
                <li key={entry.key} className="flex flex-col items-center gap-1">
                  {session && (
                    <PdfThumbnail
                      pageNumber={entry.pageNumber}
                      width={entry.width}
                      height={entry.height}
                      rotation={totalRotation}
                      cacheKey={`${entry.key}-${totalRotation}`}
                      render={() => session.renderThumbnail(entry.pageIndex, 140)}
                    />
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

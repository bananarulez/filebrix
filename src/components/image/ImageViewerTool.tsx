"use client";

import { useEffect, useMemo, useState } from "react";
import { FileDropZone } from "@/components/tools/FileDropZone";

const ZOOM_MIN = 25;
const ZOOM_MAX = 400;
const ZOOM_STEP = 25;

interface ImageViewerToolProps {
  /** Lifted from Image Studio's Edit tab (see ImageStudioApp) — the result
   * of the most recent single-file Edit action, if any. When the currently
   * active viewed file matches it, a "Compare with edited version" toggle
   * becomes available. */
  editedResult: { sourceFile: File; blob: Blob } | null;
}

/** Image Studio's View tab: a plain zoomable viewer for PNG/JPG/WebP/SVG
 * (SVG renders natively via a plain <img> — the browser rasterizes it for
 * display, no engine call needed) with an optional original-vs-edited
 * compare pane. Not a processing tool, so it doesn't reuse ImageBatchList —
 * there's nothing to download here. */
export function ImageViewerTool({ editedResult }: ImageViewerToolProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoomPct, setZoomPct] = useState(100);
  const [showCompare, setShowCompare] = useState(false);

  const urls = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);
  useEffect(() => {
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [urls]);

  const editedUrl = useMemo(() => (editedResult ? URL.createObjectURL(editedResult.blob) : null), [editedResult]);
  useEffect(() => {
    return () => {
      if (editedUrl) URL.revokeObjectURL(editedUrl);
    };
  }, [editedUrl]);

  // Auto-load a just-completed Edit result so the compare toggle is reachable
  // without the user re-dropping the exact same file (a fresh File object
  // from a new drop/dialog would never === editedResult.sourceFile, so
  // without this the toggle could never actually appear). Adjusting state
  // during render in response to a changed prop, React's documented
  // alternative to an effect for this exact case ("Adjusting state when a
  // prop changes") — avoids the extra effect-triggered render pass.
  //
  // Initialized to `null`, not to `editedResult` — this component only
  // mounts when the View tab is active (see ImageStudioApp), so it can
  // mount *after* an edit already completed on the Edit tab, with
  // `editedResult` already non-null on its very first render. Seeding the
  // "seen" tracker with the actual initial prop value would make that first
  // render look like "nothing changed" and skip the auto-load entirely.
  const [seenEditedResult, setSeenEditedResult] = useState<typeof editedResult>(null);
  if (editedResult !== seenEditedResult) {
    setSeenEditedResult(editedResult);
    if (editedResult) {
      setFiles((current) =>
        current.includes(editedResult.sourceFile) ? current : [editedResult.sourceFile, ...current]
      );
      setActiveIndex(0);
      setZoomPct(100);
    }
  }

  const activeFile = files[activeIndex] ?? null;
  const activeUrl = urls[activeIndex] ?? null;
  const hasEditedMatch = Boolean(activeFile && editedResult && editedResult.sourceFile === activeFile);
  // Derived, not stored — avoids a setState-in-effect just to reset the
  // toggle whenever the active file stops matching the edited result.
  const effectiveShowCompare = showCompare && hasEditedMatch;

  function handleFilesSelected(selected: File[]) {
    setFiles(selected);
    setActiveIndex(0);
    setZoomPct(100);
  }

  const imgStyle = { transform: `scale(${zoomPct / 100})`, transformOrigin: "top left" } as const;

  return (
    <div className="flex flex-col gap-4">
      <FileDropZone
        label={files.length > 0 ? "Drop different images" : "Drop PNG, JPEG, WebP or SVG images here"}
        hint="Nothing is uploaded — images are viewed entirely on your device."
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        multiple
        onFilesSelected={handleFilesSelected}
      />

      {files.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {files.map((file, index) => (
            <button
              key={`${file.name}-${index}`}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`overflow-hidden rounded-md border-2 ${
                index === activeIndex ? "border-blue-500" : "border-transparent"
              }`}
              aria-label={`View ${file.name}`}
              aria-current={index === activeIndex}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- object URL, not a static asset */}
              <img src={urls[index]} alt="" className="h-14 w-14 object-cover" />
            </button>
          ))}
        </div>
      )}

      {activeUrl && activeFile && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setZoomPct((z) => Math.max(ZOOM_MIN, z - ZOOM_STEP))}
                disabled={zoomPct <= ZOOM_MIN}
                className="rounded border border-gray-200 px-2 py-1 disabled:opacity-50 dark:border-gray-700"
                aria-label="Zoom out"
              >
                −
              </button>
              <span className="w-12 text-center tabular-nums">{zoomPct}%</span>
              <button
                type="button"
                onClick={() => setZoomPct((z) => Math.min(ZOOM_MAX, z + ZOOM_STEP))}
                disabled={zoomPct >= ZOOM_MAX}
                className="rounded border border-gray-200 px-2 py-1 disabled:opacity-50 dark:border-gray-700"
                aria-label="Zoom in"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => setZoomPct(100)}
                className="rounded border border-gray-200 px-2 py-1 text-xs dark:border-gray-700"
              >
                Reset
              </button>
            </div>

            {hasEditedMatch && (
              <button
                type="button"
                onClick={() => setShowCompare((value) => !value)}
                className={`rounded-md border px-3 py-1.5 ${
                  effectiveShowCompare
                    ? "border-blue-200 bg-blue-100 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/40"
                    : "border-gray-200 text-gray-600 hover:border-gray-400 dark:border-gray-700 dark:text-gray-300"
                }`}
              >
                Compare with edited version
              </button>
            )}
          </div>

          {effectiveShowCompare && editedUrl ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Original</span>
                <div className="max-h-[32rem] overflow-auto rounded-lg border border-gray-200 dark:border-gray-800">
                  {/* eslint-disable-next-line @next/next/no-img-element -- object URL, not a static asset */}
                  <img src={activeUrl} alt={activeFile.name} style={imgStyle} className="block max-w-none" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Edited</span>
                <div className="max-h-[32rem] overflow-auto rounded-lg border border-gray-200 dark:border-gray-800">
                  {/* eslint-disable-next-line @next/next/no-img-element -- object URL, not a static asset */}
                  <img src={editedUrl} alt={`${activeFile.name} (edited)`} style={imgStyle} className="block max-w-none" />
                </div>
              </div>
            </div>
          ) : (
            <div className="max-h-[32rem] overflow-auto rounded-lg border border-gray-200 dark:border-gray-800">
              {/* eslint-disable-next-line @next/next/no-img-element -- object URL, not a static asset */}
              <img src={activeUrl} alt={activeFile.name} style={imgStyle} className="block max-w-none" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

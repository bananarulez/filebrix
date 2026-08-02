"use client";

import { useEffect, useMemo, useState } from "react";
import { useImageWorkspace } from "./ImageWorkspace";

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
 * there's nothing to download here.
 *
 * Presentational with respect to the files: they come from
 * `ImageWorkspace`. That's also what retired this component's old
 * "auto-load the just-edited file so the compare toggle is reachable"
 * dance — the Edit tab now operates on the *same* shared file objects, so
 * the edited source is already in this list by identity; all that's left is
 * opening on it. */
export function ImageViewerTool({ editedResult }: ImageViewerToolProps) {
  const { files } = useImageWorkspace();
  // Opens on the most recently edited image when there is one, so switching
  // Edit -> View lands on the file the compare toggle applies to. A lazy
  // initializer, not a render-time adjustment: this component only mounts
  // when the View tab is active, so `editedResult` is already final here.
  const [activeIndex, setActiveIndex] = useState(() => {
    const index = editedResult ? files.indexOf(editedResult.sourceFile) : -1;
    return index === -1 ? 0 : index;
  });
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

  const activeFile = files[activeIndex] ?? null;
  const activeUrl = urls[activeIndex] ?? null;
  const hasEditedMatch = Boolean(activeFile && editedResult && editedResult.sourceFile === activeFile);
  // Derived, not stored — avoids a setState-in-effect just to reset the
  // toggle whenever the active file stops matching the edited result.
  const effectiveShowCompare = showCompare && hasEditedMatch;

  const imgStyle = { transform: `scale(${zoomPct / 100})`, transformOrigin: "top left" } as const;

  return (
    <div className="flex flex-col gap-4">
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

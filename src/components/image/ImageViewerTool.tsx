"use client";

import { useEffect, useMemo, useState } from "react";
import { useImageWorkspace } from "./ImageWorkspace";

const ZOOM_MIN = 25;
const ZOOM_MAX = 400;
const ZOOM_STEP = 25;

interface Size {
  w: number;
  h: number;
}

/**
 * `"fit"` is a *mode*, not a percentage: the image scaled down to fit its
 * frame, never scaled up past 1:1. Every other value is a real zoom
 * percentage where 100 still means one image pixel per CSS pixel.
 *
 * Keeping those two things distinct is the point. Redefining "100%" as
 * "whatever fits" would make the readout lie about what you're looking at —
 * the same class of bug as a rotate control that only resized its preview.
 */
type Zoom = number | "fit";

interface ImageViewerToolProps {
  /** Lifted from Image Studio's Edit tab (see ImageStudioApp) — the result
   * of the most recent single-file Edit action, if any. When the currently
   * active viewed file matches it, a "Compare with edited version" toggle
   * becomes available. */
  editedResult: { sourceFile: File; blob: Blob } | null;
}

/** Image Studio's View tab: a zoomable viewer for PNG/JPG/WebP/SVG (SVG
 * renders natively via a plain <img> — the browser rasterizes it for
 * display, no engine call needed) with an optional original-vs-edited
 * compare pane. Not a processing tool, so it doesn't reuse ImageBatchList —
 * there's nothing to download here.
 *
 * Presentational with respect to the files: they come from
 * `ImageWorkspace`. That's also what retired this component's old
 * "auto-load the just-edited file so the compare toggle is reachable"
 * dance — the Edit tab now operates on the *same* shared file objects, so
 * the edited source is already in this list by identity; all that's left is
 * opening on it.
 *
 * **Two things here are deliberate and easy to undo by accident.**
 *
 * The frame has a *fixed* height rather than a `max-height`. Fit is derived
 * from the frame's measured size, so a frame that shrink-wraps its content
 * would size itself from the image whose size depends on the frame — a
 * circular measurement that settles at the wrong scale or oscillates.
 *
 * The image is sized with real `width`/`height` in pixels, not a CSS
 * `transform: scale()`. A transform doesn't affect layout, so the scroll
 * area stayed at the image's natural size no matter the zoom — meaning a
 * zoomed-*out* image had scrollbars over blank space. Explicit dimensions
 * keep the scroll area and the picture describing the same rectangle.
 */
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
  const [zoom, setZoom] = useState<Zoom>("fit");
  const [showCompare, setShowCompare] = useState(false);

  // A callback ref rather than useRef + an effect: the frame element is a
  // different DOM node in compare mode, and this re-runs the observer setup
  // on the swap without a dependency that has to name every branch.
  const [frameEl, setFrameEl] = useState<HTMLDivElement | null>(null);
  const [frame, setFrame] = useState<Size | null>(null);
  const [natural, setNatural] = useState<Record<string, Size>>({});

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

  // No synchronous first measurement here on purpose: ResizeObserver
  // delivers one as soon as it starts observing, so setting state in the
  // effect body (which `react-hooks/set-state-in-effect` rightly rejects)
  // isn't needed to get the initial size.
  useEffect(() => {
    if (!frameEl || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      if (box) setFrame({ w: box.width, h: box.height });
    });
    observer.observe(frameEl);
    return () => observer.disconnect();
  }, [frameEl]);

  const activeFile = files[activeIndex] ?? null;
  const activeUrl = urls[activeIndex] ?? null;
  const hasEditedMatch = Boolean(activeFile && editedResult && editedResult.sourceFile === activeFile);
  // Derived, not stored — avoids a setState-in-effect just to reset the
  // toggle whenever the active file stops matching the edited result.
  const effectiveShowCompare = showCompare && hasEditedMatch;

  // Both panes share one scale so a compare stays a fair comparison: an edit
  // that halved the image should *look* half the size, not be silently
  // re-fitted to match. Fit therefore has to accommodate the larger of the
  // two, which is why this maxes over every visible image rather than
  // fitting each pane independently.
  const visibleSizes = [activeUrl, effectiveShowCompare ? editedUrl : null]
    .map((url) => (url ? natural[url] : undefined))
    .filter((size): size is Size => Boolean(size));

  const fitScale =
    frame && visibleSizes.length > 0
      ? Math.min(
          1,
          frame.w / Math.max(...visibleSizes.map((size) => size.w)),
          frame.h / Math.max(...visibleSizes.map((size) => size.h))
        )
      : 1;

  const scale = zoom === "fit" ? fitScale : zoom / 100;
  const displayPct = Math.max(1, Math.round(scale * 100));

  // Stepping out of Fit lands on the neighbouring multiple of the step, so
  // "+" from a 43% fit goes to 50% rather than jumping to a fixed 100%.
  function step(direction: 1 | -1): void {
    const next =
      direction === 1
        ? Math.floor(displayPct / ZOOM_STEP) * ZOOM_STEP + ZOOM_STEP
        : Math.ceil(displayPct / ZOOM_STEP) * ZOOM_STEP - ZOOM_STEP;
    setZoom(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, next)));
  }

  function recordNaturalSize(url: string, image: HTMLImageElement): void {
    const { naturalWidth: w, naturalHeight: h } = image;
    if (!w || !h) return;
    setNatural((prev) => (prev[url]?.w === w && prev[url]?.h === h ? prev : { ...prev, [url]: { w, h } }));
  }

  function pane(url: string, alt: string, label: string | null, isFrame: boolean) {
    const size = natural[url];
    const body = (
      <div
        ref={isFrame ? setFrameEl : undefined}
        className="h-[24rem] overflow-auto rounded-lg border border-gray-200 dark:border-gray-800 sm:h-[32rem]"
      >
        {/* w-max + min-w-full: full width so a fitted image centres, but grown
            to the content once zoom pushes it past the frame, which is what
            gives the scroll area something real to scroll. */}
        <div className="flex min-h-full w-max min-w-full items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- object URL, not a static asset */}
          <img
            src={url}
            alt={alt}
            onLoad={(event) => recordNaturalSize(url, event.currentTarget)}
            // Before the first load there's no natural size to scale, so the
            // fallback constrains rather than magnifies — otherwise a large
            // image flashes at full size for a frame.
            className={size ? "block max-w-none" : "block max-h-full max-w-full"}
            style={size ? { width: Math.round(size.w * scale), height: Math.round(size.h * scale) } : undefined}
          />
        </div>
      </div>
    );

    if (!label) return body;
    return (
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</span>
        {body}
      </div>
    );
  }

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
                onClick={() => step(-1)}
                disabled={displayPct <= ZOOM_MIN}
                className="rounded border border-gray-200 px-2 py-1 disabled:opacity-50 dark:border-gray-700"
                aria-label="Zoom out"
              >
                −
              </button>
              <span className="w-24 text-center tabular-nums" aria-live="polite">
                {zoom === "fit" ? `Fit · ${displayPct}%` : `${displayPct}%`}
              </span>
              <button
                type="button"
                onClick={() => step(1)}
                disabled={displayPct >= ZOOM_MAX}
                className="rounded border border-gray-200 px-2 py-1 disabled:opacity-50 dark:border-gray-700"
                aria-label="Zoom in"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => setZoom("fit")}
                className="rounded border border-gray-200 px-2 py-1 text-xs dark:border-gray-700"
                title="Fit the whole image in the window"
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
              {pane(activeUrl, activeFile.name, "Original", true)}
              {pane(editedUrl, `${activeFile.name} (edited)`, "Edited", false)}
            </div>
          ) : (
            pane(activeUrl, activeFile.name, null, true)
          )}
        </div>
      )}
    </div>
  );
}

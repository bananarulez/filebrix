"use client";

import { useEffect, useRef, useState } from "react";
import { FileDropZone } from "@/components/tools/FileDropZone";
import { ImageBatchList, batchKey } from "./ImageBatchList";
import { processImageFile } from "@/engines/image";
import type { RasterFormat } from "@/engines/image";
import { detectFileType } from "@/lib/detect/detectFile";

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

type Corner = "nw" | "ne" | "sw" | "se";

interface DragState {
  mode: "move" | "resize";
  corner?: Corner;
  startPointerX: number;
  startPointerY: number;
  startRect: Rect;
}

const MIN_SIZE = 20;

function formatOf(detected: string): RasterFormat {
  return detected === "webp" ? "webp" : detected === "png" ? "png" : "jpg";
}

function clampRect(rect: Rect, bounds: { width: number; height: number }): Rect {
  const width = Math.min(rect.width, bounds.width);
  const height = Math.min(rect.height, bounds.height);
  const x = Math.min(Math.max(rect.x, 0), bounds.width - width);
  const y = Math.min(Math.max(rect.y, 0), bounds.height - height);
  return { x, y, width, height };
}

/** Image Studio's Crop Edit action — the one genuinely interactive Edit tool
 * (every other transform works off numeric inputs with no need to see the
 * image first). Single-file only: a shared crop rectangle across an
 * arbitrary batch of unrelated images wouldn't make sense the way a shared
 * resize/rotate setting does. Delivers its result through the same
 * ImageBatchList every other edit tool uses, keyed to a single file. */
export function ImageCropTool({ onResult }: { onResult?: (file: File, blob: Blob) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [displaySize, setDisplaySize] = useState<{ width: number; height: number } | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const [job, setJob] = useState<{ file: File; crop: Rect } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);

  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  function handleFilesSelected(selected: File[]) {
    const [selectedFile] = selected;
    if (!selectedFile) return;
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setFile(selectedFile);
    setImageUrl(URL.createObjectURL(selectedFile));
    setNaturalSize(null);
    setDisplaySize(null);
    setRect(null);
    setJob(null);
  }

  function handleImageLoad(event: React.SyntheticEvent<HTMLImageElement>) {
    const img = event.currentTarget;
    const natural = { width: img.naturalWidth, height: img.naturalHeight };
    const display = { width: img.clientWidth, height: img.clientHeight };
    setNaturalSize(natural);
    setDisplaySize(display);
    // Default to a centered 80% selection, in display-space pixels.
    const width = Math.round(display.width * 0.8);
    const height = Math.round(display.height * 0.8);
    setRect({ x: Math.round((display.width - width) / 2), y: Math.round((display.height - height) / 2), width, height });
  }

  function beginDrag(mode: "move" | "resize", corner: Corner | undefined, event: React.PointerEvent) {
    if (!rect) return;
    event.preventDefault();
    dragRef.current = { mode, corner, startPointerX: event.clientX, startPointerY: event.clientY, startRect: rect };

    function handleMove(moveEvent: PointerEvent) {
      const drag = dragRef.current;
      if (!drag || !displaySize) return;
      const dx = moveEvent.clientX - drag.startPointerX;
      const dy = moveEvent.clientY - drag.startPointerY;
      const start = drag.startRect;

      if (drag.mode === "move") {
        setRect(clampRect({ ...start, x: start.x + dx, y: start.y + dy }, displaySize));
        return;
      }

      let { x, y, width, height } = start;
      const right = start.x + start.width;
      const bottom = start.y + start.height;
      if (drag.corner === "nw") {
        x = Math.min(start.x + dx, right - MIN_SIZE);
        y = Math.min(start.y + dy, bottom - MIN_SIZE);
        width = right - x;
        height = bottom - y;
      } else if (drag.corner === "ne") {
        y = Math.min(start.y + dy, bottom - MIN_SIZE);
        width = Math.max(start.width + dx, MIN_SIZE);
        height = bottom - y;
      } else if (drag.corner === "sw") {
        x = Math.min(start.x + dx, right - MIN_SIZE);
        width = right - x;
        height = Math.max(start.height + dy, MIN_SIZE);
      } else if (drag.corner === "se") {
        width = Math.max(start.width + dx, MIN_SIZE);
        height = Math.max(start.height + dy, MIN_SIZE);
      }
      setRect(clampRect({ x: Math.max(x, 0), y: Math.max(y, 0), width, height }, displaySize));
    }

    function handleUp() {
      dragRef.current = null;
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    }

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  }

  function handleApplyCrop() {
    if (!file || !rect || !naturalSize || !displaySize) return;
    const scaleX = naturalSize.width / displaySize.width;
    const scaleY = naturalSize.height / displaySize.height;
    const crop: Rect = {
      x: Math.round(rect.x * scaleX),
      y: Math.round(rect.y * scaleY),
      width: Math.round(rect.width * scaleX),
      height: Math.round(rect.height * scaleY),
    };
    setJob({ file, crop });
  }

  function handleClear() {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setFile(null);
    setImageUrl(null);
    setNaturalSize(null);
    setDisplaySize(null);
    setRect(null);
    setJob(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <FileDropZone
        label={file ? "Drop a different image" : "Drop a PNG, JPEG or WebP image here"}
        hint="Nothing is uploaded — every image is processed entirely on your device."
        accept="image/png,image/jpeg,image/webp"
        onFilesSelected={handleFilesSelected}
        toolSlug="crop-image"
      />

      {imageUrl && (
        <div className="flex flex-col gap-3">
          <div ref={containerRef} className="relative inline-block max-w-full select-none">
            {/* eslint-disable-next-line @next/next/no-img-element -- object URL, not a static asset */}
            <img
              src={imageUrl}
              alt="Image to crop"
              onLoad={handleImageLoad}
              className="block max-w-full"
              draggable={false}
            />
            {rect && (
              <div
                role="group"
                aria-label="Crop selection"
                className="absolute border-2 border-blue-500 bg-blue-500/10"
                style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height, cursor: "move" }}
                onPointerDown={(event) => beginDrag("move", undefined, event)}
              >
                {(["nw", "ne", "sw", "se"] as const).map((corner) => (
                  <div
                    key={corner}
                    role="button"
                    aria-label={`Resize crop selection from the ${corner} corner`}
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      beginDrag("resize", corner, event);
                    }}
                    className="absolute h-3 w-3 rounded-full border-2 border-white bg-blue-500"
                    style={{
                      cursor: corner === "nw" || corner === "se" ? "nwse-resize" : "nesw-resize",
                      left: corner.includes("w") ? -6 : undefined,
                      right: corner.includes("e") ? -6 : undefined,
                      top: corner.includes("n") ? -6 : undefined,
                      bottom: corner.includes("s") ? -6 : undefined,
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleApplyCrop}
              disabled={!rect}
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Apply Crop
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="rounded-md border border-gray-200 px-3 py-1.5 text-gray-600 hover:border-gray-400 hover:text-gray-900 dark:border-gray-700 dark:text-gray-300 dark:hover:text-white"
            >
              Clear
            </button>
            {rect && naturalSize && displaySize && (
              <span className="text-xs text-gray-500">
                Selection: {Math.round(rect.width * (naturalSize.width / displaySize.width))} ×{" "}
                {Math.round(rect.height * (naturalSize.height / displaySize.height))} px
              </span>
            )}
          </div>
        </div>
      )}

      {job && (
        <ImageBatchList
          sourceToolSlug="crop-image"
          key={`${batchKey([job.file])}-crop-${job.crop.x}-${job.crop.y}-${job.crop.width}-${job.crop.height}`}
          files={[job.file]}
          processFile={async (imageFile) => {
            const detected = await detectFileType(imageFile);
            const format = formatOf(detected.format);
            const blob = await processImageFile(imageFile, { outputFormat: format, crop: job.crop });
            onResult?.(imageFile, blob);
            return blob;
          }}
          deriveFilename={(imageFile) => imageFile.name}
          zipFilename="cropped-image.zip"
        />
      )}
    </div>
  );
}

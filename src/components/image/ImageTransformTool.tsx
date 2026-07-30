"use client";

import { useState } from "react";
import { FileDropZone } from "@/components/tools/FileDropZone";
import { ImageBatchList, batchKey } from "./ImageBatchList";
import { processImageFile } from "@/engines/image";
import type { FlipAxis, RasterFormat } from "@/engines/image";
import { detectFileType } from "@/lib/detect/detectFile";
import { ProcessingError } from "@/lib/errors/ProcessingError";

export type TransformMode = "resize" | "compress" | "rotate" | "flip" | "brightness" | "contrast" | "grayscale";

interface Job {
  files: File[];
  width: number;
  height?: number;
  lockAspectRatio: boolean;
  quality: number;
  rotateDegrees: 0 | 90 | 180 | 270;
  flipAxis: FlipAxis;
  brightness: number;
  contrast: number;
}

const DEFAULT_QUALITY = 0.85;

function formatOf(detected: string): RasterFormat {
  return detected === "webp" ? "webp" : detected === "png" ? "png" : "jpg";
}

/** Resize mode probes the source's real dimensions (to compute an
 * aspect-locked target) before handing off to the worker pipeline — this
 * needs its own error mapping since a `createImageBitmap` failure here
 * would otherwise surface as ImageBatchList's generic fallback message
 * instead of the same clear "not a valid image" the pipeline itself gives
 * for the exact same kind of failure. */
async function probeDimensions(file: File): Promise<{ width: number; height: number }> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new ProcessingError("MALFORMED_FILE", "This file doesn't look like a valid image, or it may be corrupted.");
  }
  const dimensions = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return dimensions;
}

async function processJobFile(mode: TransformMode, job: Job, file: File): Promise<Blob> {
  const detected = await detectFileType(file);
  const format = formatOf(detected.format);

  if (mode === "resize") {
    const original = await probeDimensions(file);
    const target = job.lockAspectRatio
      ? job.width
        ? { width: job.width, height: Math.round(job.width * (original.height / original.width)) }
        : {
            width: Math.round((job.height ?? original.height) * (original.width / original.height)),
            height: job.height ?? original.height,
          }
      : { width: job.width || original.width, height: job.height ?? original.height };
    return processImageFile(file, { outputFormat: format, resize: target });
  }
  if (mode === "compress") {
    return processImageFile(file, { outputFormat: format, quality: format === "png" ? undefined : job.quality });
  }
  if (mode === "rotate") {
    return processImageFile(file, { outputFormat: format, rotateDegrees: job.rotateDegrees });
  }
  if (mode === "flip") {
    return processImageFile(file, { outputFormat: format, flip: job.flipAxis });
  }
  if (mode === "brightness") {
    return processImageFile(file, { outputFormat: format, brightness: job.brightness });
  }
  if (mode === "contrast") {
    return processImageFile(file, { outputFormat: format, contrast: job.contrast });
  }
  return processImageFile(file, { outputFormat: format, grayscale: true });
}

/** Powers Resize/Compress/Rotate/Flip, plus Image Studio's Brightness/
 * Contrast/Grayscale Edit actions — same input/output format (none of these
 * change the file type), parameterized by `mode`. A single setting applies
 * to the whole batch; per-file individual settings would need processing
 * one file at a time, which the tool already supports by simply dropping
 * one file. Processing only starts on an explicit action click, with the
 * settings snapshotted into a `Job` — same reasoning as ImageConvertTool. */
interface ImageTransformToolProps {
  mode: TransformMode;
  /** Fired with the processed result once a single-file job completes —
   * lets a parent (e.g. Image Studio's Viewer tab) offer an original-vs-
   * edited comparison. Not called for multi-file batches. */
  onResult?: (file: File, blob: Blob) => void;
}

export function ImageTransformTool({ mode, onResult }: ImageTransformToolProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [width, setWidth] = useState(800);
  const [height, setHeight] = useState<number | undefined>(undefined);
  const [lockAspectRatio, setLockAspectRatio] = useState(true);
  const [quality, setQuality] = useState(DEFAULT_QUALITY);
  const [rotateDegrees, setRotateDegrees] = useState<0 | 90 | 180 | 270>(0);
  const [flipAxis, setFlipAxis] = useState<FlipAxis>("horizontal");
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [job, setJob] = useState<Job | null>(null);

  const hasPngInBatch = mode === "compress" && files.some((f) => f.name.toLowerCase().endsWith(".png"));

  const actionLabel: Record<TransformMode, string> = {
    resize: "Resize",
    compress: "Compress",
    rotate: "Rotate",
    flip: "Flip",
    brightness: "Apply brightness",
    contrast: "Apply contrast",
    grayscale: "Convert to grayscale",
  };

  return (
    <div className="flex flex-col gap-4">
      <FileDropZone
        label={files.length > 0 ? "Drop more images" : "Drop PNG, JPEG or WebP images here"}
        hint="Nothing is uploaded — every image is processed entirely on your device."
        accept="image/png,image/jpeg,image/webp"
        multiple
        onFilesSelected={(selected) => {
          setFiles(selected);
          setJob(null);
        }}
        toolSlug={`${mode}-image`}
      />

      {files.length > 0 && (
        <div className="flex flex-wrap items-center gap-6 text-sm">
          {mode === "resize" && (
            <>
              <label className="flex items-center gap-2">
                <span>Width (px)</span>
                <input
                  type="number"
                  min={1}
                  value={width}
                  onChange={(event) => setWidth(Number(event.target.value))}
                  className="w-24 rounded-md border border-gray-300 px-2 py-1 dark:border-gray-700 dark:bg-gray-900"
                />
              </label>
              <label className="flex items-center gap-2">
                <span>Height (px)</span>
                <input
                  type="number"
                  min={1}
                  value={height ?? ""}
                  disabled={lockAspectRatio}
                  placeholder="auto"
                  onChange={(event) => setHeight(event.target.value ? Number(event.target.value) : undefined)}
                  className="w-24 rounded-md border border-gray-300 px-2 py-1 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900"
                />
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={lockAspectRatio}
                  onChange={(event) => setLockAspectRatio(event.target.checked)}
                />
                Lock aspect ratio
              </label>
            </>
          )}

          {mode === "compress" && (
            <label className="flex items-center gap-2">
              <span>Quality ({Math.round(quality * 100)}%)</span>
              <input
                type="range"
                min={0.1}
                max={1}
                step={0.05}
                value={quality}
                onChange={(event) => setQuality(Number(event.target.value))}
                aria-label="Quality"
              />
            </label>
          )}

          {mode === "rotate" && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRotateDegrees((current) => ((current + 270) % 360) as 0 | 90 | 180 | 270)}
                className="rounded border border-gray-200 px-2 py-1 dark:border-gray-700"
              >
                Rotate left
              </button>
              <button
                type="button"
                onClick={() => setRotateDegrees((current) => ((current + 90) % 360) as 0 | 90 | 180 | 270)}
                className="rounded border border-gray-200 px-2 py-1 dark:border-gray-700"
              >
                Rotate right
              </button>
              <span className="text-gray-500">{rotateDegrees}°</span>
            </div>
          )}

          {mode === "flip" && (
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="flip-axis"
                  checked={flipAxis === "horizontal"}
                  onChange={() => setFlipAxis("horizontal")}
                />
                Horizontal (mirror)
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="flip-axis"
                  checked={flipAxis === "vertical"}
                  onChange={() => setFlipAxis("vertical")}
                />
                Vertical (upside down)
              </label>
            </div>
          )}

          {mode === "brightness" && (
            <label className="flex items-center gap-2">
              <span>Brightness ({brightness > 0 ? "+" : ""}{brightness})</span>
              <input
                type="range"
                min={-100}
                max={100}
                step={5}
                value={brightness}
                onChange={(event) => setBrightness(Number(event.target.value))}
                aria-label="Brightness"
              />
            </label>
          )}

          {mode === "contrast" && (
            <label className="flex items-center gap-2">
              <span>Contrast ({contrast > 0 ? "+" : ""}{contrast})</span>
              <input
                type="range"
                min={-100}
                max={100}
                step={5}
                value={contrast}
                onChange={(event) => setContrast(Number(event.target.value))}
                aria-label="Contrast"
              />
            </label>
          )}

          <button
            type="button"
            onClick={() =>
              setJob({ files, width, height, lockAspectRatio, quality, rotateDegrees, flipAxis, brightness, contrast })
            }
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
          >
            {actionLabel[mode]}
          </button>
          <button
            type="button"
            onClick={() => {
              setFiles([]);
              setJob(null);
            }}
            className="rounded-md border border-gray-200 px-3 py-1.5 text-gray-600 hover:border-gray-400 hover:text-gray-900 dark:border-gray-700 dark:text-gray-300 dark:hover:text-white"
          >
            Clear
          </button>
        </div>
      )}

      {hasPngInBatch && (
        <p className="text-xs text-gray-500">
          PNG is a lossless format, so compressing a PNG here won&apos;t shrink it much. For a real size
          reduction, convert it to WebP first.
        </p>
      )}

      {job && (
        <ImageBatchList
          sourceToolSlug={`${mode}-image`}
          key={`${batchKey(job.files)}-${mode}-${job.rotateDegrees}-${job.flipAxis}-${job.width}-${job.height}-${job.lockAspectRatio}-${job.quality}-${job.brightness}-${job.contrast}`}
          files={job.files}
          processFile={(file) =>
            processJobFile(mode, job, file).then((blob) => {
              if (job.files.length === 1) onResult?.(file, blob);
              return blob;
            })
          }
          deriveFilename={(file) => file.name}
          zipFilename={`${mode}-images.zip`}
        />
      )}
    </div>
  );
}

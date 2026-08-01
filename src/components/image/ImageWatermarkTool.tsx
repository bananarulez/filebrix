"use client";

import { useState } from "react";
import { ImageBatchList, batchKey } from "./ImageBatchList";
import { useImageWorkspace } from "./ImageWorkspace";
import { processImageFile } from "@/engines/image";
import type { RasterFormat, WatermarkOptions, WatermarkPosition } from "@/engines/image";
import { detectFileType } from "@/lib/detect/detectFile";

const POSITIONS: { id: WatermarkPosition; label: string }[] = [
  { id: "top-left", label: "Top left" },
  { id: "top-right", label: "Top right" },
  { id: "center", label: "Center" },
  { id: "bottom-left", label: "Bottom left" },
  { id: "bottom-right", label: "Bottom right" },
];

function formatOf(detected: string): RasterFormat {
  return detected === "webp" ? "webp" : detected === "png" ? "png" : "jpg";
}

/**
 * Image Studio's Watermark Edit action — text over the finished image, using
 * the same additive-option pipeline every other Edit action already uses
 * (`ImageProcessOptions.watermark`), so it needed no parallel code path.
 *
 * This replaced a "Watermarking isn't available yet" placeholder. Unlike PDF
 * Studio's Security tab, nothing technical ever blocked it: the pipeline
 * already composited (crop/rotate/filter passes), and `fillText` in a real
 * Worker's OffscreenCanvas was verified before building on it.
 *
 * Same shape as `ImageTransformTool`: settings are snapshotted into a job on
 * an explicit click, so editing the text afterwards doesn't silently
 * reprocess a finished batch.
 */
export function ImageWatermarkTool({ onResult }: { onResult?: (file: File, blob: Blob) => void }) {
  const { files } = useImageWorkspace();
  const [text, setText] = useState("© My Watermark");
  const [position, setPosition] = useState<WatermarkPosition>("bottom-right");
  const [opacity, setOpacity] = useState(0.5);
  const [fontScale, setFontScale] = useState(0.06);
  const [color, setColor] = useState("#ffffff");
  const [job, setJob] = useState<{ files: File[]; watermark: WatermarkOptions } | null>(null);

  const canApply = files.length > 0 && text.trim() !== "";

  return (
    <div className="flex flex-col gap-4">
      {files.length > 0 && (
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Watermark text</span>
            <input
              type="text"
              value={text}
              onChange={(event) => setText(event.target.value)}
              className="w-full max-w-md rounded-md border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900"
            />
          </label>

          <div className="flex flex-wrap items-center gap-6 text-sm">
            <label className="flex items-center gap-2">
              <span>Position</span>
              <select
                value={position}
                onChange={(event) => setPosition(event.target.value as WatermarkPosition)}
                className="rounded-md border border-gray-300 px-2 py-1 dark:border-gray-700 dark:bg-gray-900"
              >
                {POSITIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2">
              <span>Opacity ({Math.round(opacity * 100)}%)</span>
              <input
                type="range"
                min={0.1}
                max={1}
                step={0.05}
                value={opacity}
                onChange={(event) => setOpacity(Number(event.target.value))}
                aria-label="Opacity"
              />
            </label>

            <label className="flex items-center gap-2">
              <span>Size ({Math.round(fontScale * 100)}%)</span>
              <input
                type="range"
                min={0.02}
                max={0.2}
                step={0.01}
                value={fontScale}
                onChange={(event) => setFontScale(Number(event.target.value))}
                aria-label="Size"
              />
            </label>

            <label className="flex items-center gap-2">
              <span>Color</span>
              <input
                type="color"
                value={color}
                onChange={(event) => setColor(event.target.value)}
                aria-label="Watermark color"
              />
            </label>

            <button
              type="button"
              disabled={!canApply}
              onClick={() => setJob({ files, watermark: { text, position, opacity, fontScale, color } })}
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Apply watermark
            </button>
          </div>

          <p className="text-xs text-gray-500">
            Size is a share of the image&rsquo;s shorter side, so one setting looks the same across a batch of
            differently-sized images.
          </p>
        </div>
      )}

      {job && (
        <ImageBatchList
          sourceToolSlug="watermark-image"
          key={`${batchKey(job.files)}-watermark-${job.watermark.text}-${job.watermark.position}-${job.watermark.opacity}-${job.watermark.fontScale}-${job.watermark.color}`}
          files={job.files}
          processFile={async (file) => {
            const detected = await detectFileType(file);
            const blob = await processImageFile(file, {
              outputFormat: formatOf(detected.format),
              watermark: job.watermark,
            });
            if (job.files.length === 1) onResult?.(file, blob);
            return blob;
          }}
          deriveFilename={(file) => file.name}
          zipFilename="watermarked-images.zip"
        />
      )}
    </div>
  );
}

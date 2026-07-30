"use client";

import { useState } from "react";
import { FileDropZone } from "@/components/tools/FileDropZone";
import { ImageBatchList, batchKey } from "./ImageBatchList";
import { processImageFile, EXTENSION_BY_FORMAT, MIME_BY_FORMAT, formatIsLossy, formatSupportsTransparency } from "@/engines/image";
import type { RasterFormat } from "@/engines/image";
import { deriveOutputFilename } from "@/lib/format/deriveOutputFilename";

interface ImageConvertToolProps {
  sourceFormat: RasterFormat;
  targetFormat: RasterFormat;
}

interface Job {
  files: File[];
  quality?: number;
  backgroundColor?: string;
}

const DEFAULT_QUALITY = 0.85;

/** Powers all 6 raster-to-raster conversions (png/jpg/webp in every
 * direction) — one component, parameterized by format pair, same pattern
 * as SpreadsheetConverterTool/PdfPageWorkspaceTool. Conversion only starts
 * on an explicit "Convert" click (not live on every slider drag) — options
 * are snapshotted into a `Job` at that point, which is what `ImageBatchList`
 * is keyed by, so adjusting quality afterward doesn't silently reprocess a
 * batch that already finished. */
export function ImageConvertTool({ sourceFormat, targetFormat }: ImageConvertToolProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [quality, setQuality] = useState(DEFAULT_QUALITY);
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const [job, setJob] = useState<Job | null>(null);

  const needsBackground = formatSupportsTransparency(sourceFormat) && !formatSupportsTransparency(targetFormat);
  const showQuality = formatIsLossy(targetFormat);

  function handleClear() {
    setFiles([]);
    setJob(null);
  }

  function handleConvert() {
    setJob({
      files,
      quality: showQuality ? quality : undefined,
      backgroundColor: needsBackground ? backgroundColor : undefined,
    });
  }

  const extension = EXTENSION_BY_FORMAT[targetFormat];

  return (
    <div className="flex flex-col gap-4">
      <FileDropZone
        label={files.length > 0 ? "Drop more images" : `Drop ${sourceFormat.toUpperCase()} images here`}
        hint="Nothing is uploaded — every image is converted entirely on your device."
        accept={MIME_BY_FORMAT[sourceFormat]}
        multiple
        onFilesSelected={(selected) => {
          setFiles(selected);
          setJob(null);
        }}
        toolSlug={`${sourceFormat}-to-${targetFormat}`}
      />

      {files.length > 0 && (
        <div className="flex flex-wrap items-center gap-6 text-sm">
          {needsBackground && (
            <label className="flex items-center gap-2">
              <span>Background color (for transparent areas)</span>
              <input
                type="color"
                value={backgroundColor}
                onChange={(event) => setBackgroundColor(event.target.value)}
                aria-label="Background color"
              />
            </label>
          )}
          {showQuality && (
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
          <button
            type="button"
            onClick={handleConvert}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
          >
            Convert
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="rounded-md border border-gray-200 px-3 py-1.5 text-gray-600 hover:border-gray-400 hover:text-gray-900 dark:border-gray-700 dark:text-gray-300 dark:hover:text-white"
          >
            Clear
          </button>
        </div>
      )}

      {showQuality && (
        <p className="text-xs text-gray-500">
          Higher quality means a larger file. {targetFormat.toUpperCase()} is a lossy format — some detail is
          discarded to reduce file size, more so at lower quality settings.
        </p>
      )}

      {job && (
        <ImageBatchList
          sourceToolSlug={`${sourceFormat}-to-${targetFormat}`}
          key={`${batchKey(job.files)}-${targetFormat}-${job.quality}-${job.backgroundColor}`}
          files={job.files}
          processFile={(file) =>
            processImageFile(file, {
              outputFormat: targetFormat,
              quality: job.quality,
              backgroundColor: job.backgroundColor,
            })
          }
          deriveFilename={(file) => deriveOutputFilename(file.name, extension)}
          zipFilename={`converted-${extension}.zip`}
        />
      )}
    </div>
  );
}

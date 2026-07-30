"use client";

import { useState } from "react";
import { FileDropZone } from "@/components/tools/FileDropZone";
import { ImageBatchList, batchKey } from "./ImageBatchList";
import { renderSvgToPng } from "@/engines/image/render/svgToPng";
import { deriveOutputFilename } from "@/lib/format/deriveOutputFilename";

interface Job {
  files: File[];
  backgroundColor?: string;
}

/** SVG→PNG stays main-thread (see engines/image/render/svgToPng.ts) and is
 * kept as its own component rather than folded into ImageConvertTool since
 * its decode path, sanitization step, and transparent-by-default output are
 * all genuinely different from the raster-to-raster conversions. Rendering
 * only starts on an explicit "Convert" click, same reasoning as
 * ImageConvertTool — see its comment for why. */
export function SvgToPngTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [backgroundColor, setBackgroundColor] = useState<string | null>(null);
  const [job, setJob] = useState<Job | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <FileDropZone
        label={files.length > 0 ? "Drop more SVG files" : "Drop SVG files here"}
        hint="Nothing is uploaded — SVGs are sanitized and rendered entirely on your device."
        accept="image/svg+xml"
        multiple
        onFilesSelected={(selected) => {
          setFiles(selected);
          setJob(null);
        }}
        toolSlug="svg-to-png"
      />

      {files.length > 0 && (
        <div className="flex flex-wrap items-center gap-6 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={backgroundColor !== null}
              onChange={(event) => setBackgroundColor(event.target.checked ? "#ffffff" : null)}
            />
            Fill background (PNG output is transparent by default)
          </label>
          {backgroundColor !== null && (
            <input
              type="color"
              value={backgroundColor}
              onChange={(event) => setBackgroundColor(event.target.value)}
              aria-label="Background color"
            />
          )}
          <button
            type="button"
            onClick={() => setJob({ files, backgroundColor: backgroundColor ?? undefined })}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
          >
            Convert
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

      {job && (
        <ImageBatchList
          sourceToolSlug="svg-to-png"
          key={`${batchKey(job.files)}-${job.backgroundColor}`}
          files={job.files}
          processFile={(file) => renderSvgToPng(file, { backgroundColor: job.backgroundColor })}
          deriveFilename={(file) => deriveOutputFilename(file.name, "png")}
          zipFilename="converted-png.zip"
        />
      )}
    </div>
  );
}

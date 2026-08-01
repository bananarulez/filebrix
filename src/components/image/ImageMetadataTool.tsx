"use client";

import { useEffect, useState } from "react";
import { ProcessingStatus } from "@/components/tools/ProcessingStatus";
import { ErrorPanel } from "@/components/tools/ErrorPanel";
import { ImageBatchList } from "./ImageBatchList";
import { useImageWorkspace } from "./ImageWorkspace";
import { readImageMetadata, type ImageMetadataInfo } from "@/engines/image/render/metadata";
import { processImageFile } from "@/engines/image";
import { detectFileType } from "@/lib/detect/detectFile";
import { ProcessingError, type ProcessingErrorCode } from "@/lib/errors/ProcessingError";

interface ToolError {
  message: string;
  code?: ProcessingErrorCode;
}

function errorFrom(cause: unknown, fallback: string): ToolError {
  if (cause instanceof ProcessingError) return { message: cause.message, code: cause.code };
  return { message: fallback };
}

/**
 * Presentational with respect to the files: they come from
 * `ImageWorkspace`, so an image inspected here is the same one the Edit and
 * Convert tabs already have. View reads the first image; Remove strips
 * metadata from the whole batch, the same split the two modes always had.
 */
export function ImageMetadataTool({ mode }: { mode: "view" | "remove" }) {
  const { files } = useImageWorkspace();
  const file = files[0] ?? null;

  const [metadata, setMetadata] = useState<ImageMetadataInfo | null>(null);
  const [error, setError] = useState<ToolError | null>(null);

  useEffect(() => {
    if (mode !== "view" || !file) return;
    let cancelled = false;
    readImageMetadata(file)
      .then((info) => {
        if (!cancelled) setMetadata(info);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(errorFrom(cause, "Could not read this image's metadata."));
      });
    return () => {
      cancelled = true;
    };
  }, [mode, file]);

  // Derived, not stored — a spinner can never get out of sync with the data.
  const isReading = mode === "view" && Boolean(file) && !metadata && !error;

  return (
    <div className="flex flex-col gap-4">
      {isReading && <ProcessingStatus state="processing" />}
      {error && <ErrorPanel message={error.message} code={error.code} />}

      {mode === "view" && metadata && (
        <div className="flex flex-col gap-3">
          {metadata.hasGpsData && (
            <div
              role="status"
              className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200"
            >
              This image contains GPS location data.
            </div>
          )}
          {metadata.fields.length === 0 ? (
            <p className="text-sm text-gray-500">No EXIF/TIFF metadata was found in this image.</p>
          ) : (
            <dl className="grid grid-cols-1 gap-x-4 gap-y-2 rounded-lg border border-gray-200 p-4 text-sm sm:grid-cols-2 dark:border-gray-800">
              {metadata.fields.map((field) => (
                <div key={field.label}>
                  <dt className="text-gray-500">{field.label}</dt>
                  <dd className="font-medium">{field.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      )}

      {mode === "remove" && files.length > 0 && (
        <ImageBatchList
          sourceToolSlug="remove-image-metadata"
          files={files}
          processFile={async (imageFile) => {
            const detected = await detectFileType(imageFile);
            const format = detected.format === "webp" ? "webp" : detected.format === "png" ? "png" : "jpg";
            return processImageFile(imageFile, { outputFormat: format });
          }}
          deriveFilename={(imageFile) => imageFile.name}
          zipFilename="cleaned-images.zip"
        />
      )}
    </div>
  );
}

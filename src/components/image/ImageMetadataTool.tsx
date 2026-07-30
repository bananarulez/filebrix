"use client";

import { useState } from "react";
import { FileDropZone } from "@/components/tools/FileDropZone";
import { FileInfo } from "@/components/tools/FileInfo";
import { ProcessingStatus, type ProcessingState } from "@/components/tools/ProcessingStatus";
import { ErrorPanel } from "@/components/tools/ErrorPanel";
import { ImageBatchList } from "./ImageBatchList";
import { readImageMetadata, type ImageMetadataInfo } from "@/engines/image/render/metadata";
import { processImageFile } from "@/engines/image";
import { detectFileType } from "@/lib/detect/detectFile";
import { ProcessingError, type ProcessingErrorCode } from "@/lib/errors/ProcessingError";

type ViewState =
  | { status: Exclude<ProcessingState, "error"> }
  | { status: "error"; message: string; code?: ProcessingErrorCode };

function errorFrom(cause: unknown, fallback: string): { message: string; code?: ProcessingErrorCode } {
  if (cause instanceof ProcessingError) return { message: cause.message, code: cause.code };
  return { message: fallback };
}

export function ImageMetadataTool({ mode }: { mode: "view" | "remove" }) {
  const [file, setFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<ImageMetadataInfo | null>(null);
  const [state, setState] = useState<ViewState>({ status: "idle" });
  const [batchFiles, setBatchFiles] = useState<File[]>([]);

  async function handleFilesSelected(selected: File[]) {
    if (mode === "remove") {
      setBatchFiles(selected);
      return;
    }
    const [selectedFile] = selected;
    if (!selectedFile) return;

    setFile(selectedFile);
    setMetadata(null);
    setState({ status: "processing" });
    try {
      const info = await readImageMetadata(selectedFile);
      setMetadata(info);
      setState({ status: "ready" });
    } catch (cause) {
      setState({ status: "error", ...errorFrom(cause, "Could not read this image's metadata.") });
    }
  }

  function handleClear() {
    setFile(null);
    setMetadata(null);
    setBatchFiles([]);
    setState({ status: "idle" });
  }

  const isBusy = state.status === "processing";

  return (
    <div className="flex flex-col gap-4">
      <FileDropZone
        label={
          (mode === "view" ? file : batchFiles.length > 0)
            ? "Drop a different image"
            : "Drop PNG, JPEG or WebP images here"
        }
        hint="Nothing is uploaded — metadata is read entirely on your device."
        accept="image/png,image/jpeg,image/webp"
        multiple={mode === "remove"}
        toolSlug={mode === "view" ? "image-metadata-viewer" : "remove-image-metadata"}
        onFilesSelected={handleFilesSelected}
      />

      {mode === "view" && file && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <FileInfo file={file} />
          <button
            type="button"
            onClick={handleClear}
            className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:border-gray-400 hover:text-gray-900 dark:border-gray-700 dark:text-gray-300 dark:hover:text-white"
          >
            Clear
          </button>
        </div>
      )}

      {isBusy && <ProcessingStatus state="processing" />}
      {state.status === "error" && <ErrorPanel message={state.message} code={state.code} />}

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

      {mode === "remove" && batchFiles.length > 0 && (
        <ImageBatchList
          sourceToolSlug="remove-image-metadata"
          files={batchFiles}
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

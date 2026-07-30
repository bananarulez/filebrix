"use client";

import { useEffect, useMemo, useState } from "react";
import { FileDropZone } from "@/components/tools/FileDropZone";
import { ProcessingStatus, type ProcessingState } from "@/components/tools/ProcessingStatus";
import { ErrorPanel } from "@/components/tools/ErrorPanel";
import { DownloadResult } from "@/components/tools/DownloadResult";
import { buildPdfFromImageFiles } from "@/engines/pdf";
import { ProcessingError, type ProcessingErrorCode } from "@/lib/errors/ProcessingError";

type ToolState =
  | { status: Exclude<ProcessingState, "error"> }
  | { status: "error"; message: string; code?: ProcessingErrorCode };

function errorFrom(cause: unknown, fallback: string): { message: string; code?: ProcessingErrorCode } {
  if (cause instanceof ProcessingError) return { message: cause.message, code: cause.code };
  return { message: fallback };
}

interface ImageEntry {
  key: string;
  file: File;
  previewUrl: string;
}

let keyCounter = 0;

export function ImagesToPdfTool() {
  const [images, setImages] = useState<ImageEntry[]>([]);
  const [state, setState] = useState<ToolState>({ status: "idle" });
  const [result, setResult] = useState<{ blob: Blob; filename: string } | null>(null);

  // Revoke every preview URL when the entry list changes or on unmount —
  // object URLs otherwise leak for the life of the page.
  useEffect(() => {
    return () => {
      for (const image of images) URL.revokeObjectURL(image.previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleFilesSelected(selected: File[]) {
    setResult(null);
    setState({ status: "ready" });
    const entries = selected.map((file) => {
      keyCounter += 1;
      return { key: `image-${keyCounter}`, file, previewUrl: URL.createObjectURL(file) };
    });
    setImages((current) => [...current, ...entries]);
  }

  function moveImage(index: number, direction: -1 | 1) {
    setImages((current) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= current.length) return current;
      const next = [...current];
      const [moved] = next.splice(index, 1);
      next.splice(targetIndex, 0, moved!);
      return next;
    });
  }

  function removeImage(index: number) {
    setImages((current) => {
      const removed = current[index];
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return current.filter((_, i) => i !== index);
    });
  }

  function handleClear() {
    for (const image of images) URL.revokeObjectURL(image.previewUrl);
    setImages([]);
    setResult(null);
    setState({ status: "idle" });
  }

  async function handleSubmit() {
    if (images.length === 0) return;
    setState({ status: "processing" });
    try {
      const blob = await buildPdfFromImageFiles(images.map((image) => image.file));
      setResult({ blob, filename: "images.pdf" });
      setState({ status: "done" });
    } catch (cause) {
      setState({ status: "error", ...errorFrom(cause, "Could not build a PDF from these images.") });
    }
  }

  const isBusy = state.status === "processing";
  const orderLabel = useMemo(() => images.map((image) => image.file.name).join(", "), [images]);

  return (
    <div className="flex flex-col gap-4">
      <FileDropZone
        label={images.length > 0 ? "Add more images" : "Drop PNG or JPEG images here"}
        hint="Nothing is uploaded — the PDF is built entirely on your device, one page per image."
        accept="image/png,image/jpeg"
        multiple
        onFilesSelected={handleFilesSelected}
        toolSlug="images-to-pdf"
      />

      {images.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500" aria-label="Current page order">
              Page order: {orderLabel}
            </p>
            <button
              type="button"
              onClick={handleClear}
              className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:border-gray-400 hover:text-gray-900 dark:border-gray-700 dark:text-gray-300 dark:hover:text-white"
            >
              Clear
            </button>
          </div>

          <ul className="flex flex-wrap gap-3" aria-label="Images">
            {images.map((image, index) => (
              <li key={image.key} className="flex flex-col items-center gap-1" style={{ width: 140 }}>
                <div className="flex h-32 w-full items-center justify-center overflow-hidden rounded-md border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.previewUrl} alt={image.file.name} className="h-full w-full object-contain" />
                </div>
                <span className="w-full truncate text-center text-xs text-gray-500">{image.file.name}</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveImage(index, -1)}
                    disabled={index === 0}
                    aria-label={`Move ${image.file.name} earlier`}
                    className="rounded border border-gray-200 px-1.5 py-0.5 text-xs disabled:opacity-30 dark:border-gray-700"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() => moveImage(index, 1)}
                    disabled={index === images.length - 1}
                    aria-label={`Move ${image.file.name} later`}
                    className="rounded border border-gray-200 px-1.5 py-0.5 text-xs disabled:opacity-30 dark:border-gray-700"
                  >
                    →
                  </button>
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    aria-label={`Remove ${image.file.name}`}
                    className="rounded border border-gray-200 px-1.5 py-0.5 text-xs text-red-600 dark:border-gray-700"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isBusy}
            className="inline-flex w-fit items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Build PDF
          </button>
        </>
      )}

      {isBusy && <ProcessingStatus state={state.status} />}
      {state.status === "error" && <ErrorPanel message={state.message} code={state.code} />}
      {result && <DownloadResult filename={result.filename} blob={result.blob} label="Download images.pdf" />}
    </div>
  );
}

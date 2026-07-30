"use client";

import { useEffect, useState } from "react";
import { ProcessingError } from "@/lib/errors/ProcessingError";
import { sanitizeFilename } from "@/lib/security/filenames";

interface BatchEntry {
  key: string;
  file: File;
  previewUrl: string;
  status: "pending" | "processing" | "done" | "error";
  blob?: Blob;
  outputFilename?: string;
  errorMessage?: string;
}

interface ImageBatchListProps {
  files: File[];
  /** Runs once per file, in order — sequential, not parallel, to keep peak
   * memory bounded on a large batch (same reasoning as PdfToImagesTool). */
  processFile: (file: File) => Promise<Blob>;
  deriveFilename: (file: File) => string;
  zipFilename?: string;
}

let keyCounter = 0;

function createEntries(files: File[]): BatchEntry[] {
  return files.map((file) => {
    keyCounter += 1;
    return { key: `batch-${keyCounter}`, file, previewUrl: URL.createObjectURL(file), status: "pending" };
  });
}

/** A stable-per-batch key for the `key` prop callers must pass — see the
 * component doc comment below for why. */
export function batchKey(files: File[]): string {
  return files.map((file) => `${file.name}-${file.size}-${file.lastModified}`).join("|");
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = sanitizeFilename(filename);
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * `outputFilename` is derived from the dropped `File`'s own `.name` — a
 * string fully controlled by whoever handed us the file (drag-and-drop,
 * the File System Access API, or a scripted DataTransfer all let arbitrary
 * content set it, unlike a name a user typed through an OS save dialog).
 * Used directly as a JSZip entry name, a value like `../../evil.jpg` would
 * write outside the intended folder when a victim later extracts the zip
 * with a naive tool ("Zip Slip"). `sanitizeFilename` strips path separators
 * down to a bare basename, which is what actually closes that off; the
 * dedup below only exists because stripping paths makes basename
 * collisions between different batch entries more likely than before.
 */
function uniqueZipEntryName(rawName: string, usedNames: Set<string>): string {
  const sanitized = sanitizeFilename(rawName);
  if (!usedNames.has(sanitized)) {
    usedNames.add(sanitized);
    return sanitized;
  }
  const dotIndex = sanitized.lastIndexOf(".");
  const base = dotIndex > 0 ? sanitized.slice(0, dotIndex) : sanitized;
  const ext = dotIndex > 0 ? sanitized.slice(dotIndex) : "";
  let counter = 2;
  let candidate = `${base} (${counter})${ext}`;
  while (usedNames.has(candidate)) {
    counter += 1;
    candidate = `${base} (${counter})${ext}`;
  }
  usedNames.add(candidate);
  return candidate;
}

/**
 * Shared batch-processing UI: per-item thumbnail/status/download, plus a
 * "Download all as .zip" once more than one file has succeeded. Powers the
 * batch-capable paths of ImageConvertTool, SvgToPngTool, ImageTransformTool,
 * and ImageMetadataTool's remove mode.
 *
 * Callers must give this component a `key` that changes whenever `files`
 * (or any processing option) changes to a new batch — e.g. `key={files.map(f
 * => f.name + f.size).join("|")}`. That makes React mount a fresh instance
 * per batch instead of this component reacting to prop changes internally,
 * which is what lets initialization + the one processing effect both run
 * exactly once per batch, with no risk of re-running mid-batch or fighting
 * a dependency array over a new `processFile` closure identity.
 */
export function ImageBatchList({ files, processFile, deriveFilename, zipFilename = "images.zip" }: ImageBatchListProps) {
  const [entries, setEntries] = useState<BatchEntry[]>(() => createEntries(files));
  const [zipping, setZipping] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      for (const entry of entries) {
        if (cancelled) return;
        setEntries((current) => current.map((e) => (e.key === entry.key ? { ...e, status: "processing" } : e)));

        try {
          const blob = await processFile(entry.file);
          if (cancelled) return;
          setEntries((current) =>
            current.map((e) =>
              e.key === entry.key ? { ...e, status: "done", blob, outputFilename: deriveFilename(entry.file) } : e
            )
          );
        } catch (cause) {
          if (cancelled) return;
          const message = cause instanceof ProcessingError ? cause.message : "Could not process this image.";
          setEntries((current) => current.map((e) => (e.key === entry.key ? { ...e, status: "error", errorMessage: message } : e)));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // Deliberately runs once per mount (i.e. once per batch, since the
    // caller keys this component by batch identity) — not re-run on
    // `entries`/`processFile`/`deriveFilename` changes, which would either
    // loop (entries is mutated by this same effect) or re-fire mid-batch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      for (const entry of entries) URL.revokeObjectURL(entry.previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDownloadAll() {
    const succeeded = entries.filter((e) => e.status === "done" && e.blob && e.outputFilename);
    if (succeeded.length === 0) return;
    setZipping(true);
    try {
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      const usedNames = new Set<string>();
      for (const entry of succeeded) {
        zip.file(uniqueZipEntryName(entry.outputFilename!, usedNames), entry.blob!);
      }
      const zipBlob = await zip.generateAsync({ type: "blob" });
      downloadBlob(zipFilename, zipBlob);
    } finally {
      setZipping(false);
    }
  }

  const doneCount = entries.filter((e) => e.status === "done").length;

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-wrap gap-3" aria-label="Images">
        {entries.map((entry) => (
          <li key={entry.key} className="flex flex-col items-center gap-1" style={{ width: 140 }}>
            <div className="flex h-28 w-full items-center justify-center overflow-hidden rounded-md border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={entry.previewUrl} alt={entry.file.name} className="h-full w-full object-contain" />
            </div>
            <span className="w-full truncate text-center text-xs text-gray-500">{entry.file.name}</span>
            {entry.status === "pending" && <span className="text-xs text-gray-400">Waiting…</span>}
            {entry.status === "processing" && (
              <span className="text-xs text-gray-500" role="status">
                Processing…
              </span>
            )}
            {entry.status === "error" && (
              <span className="text-xs text-red-600">{entry.errorMessage ?? "Failed"}</span>
            )}
            {entry.status === "done" && entry.blob && entry.outputFilename && (
              <button
                type="button"
                onClick={() => downloadBlob(entry.outputFilename!, entry.blob!)}
                className="rounded border border-gray-200 px-2 py-1 text-xs hover:border-gray-400 dark:border-gray-700"
              >
                Download
              </button>
            )}
          </li>
        ))}
      </ul>

      {doneCount > 1 && (
        <button
          type="button"
          onClick={handleDownloadAll}
          disabled={zipping}
          className="inline-flex w-fit items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {zipping ? "Packaging…" : `Download all ${doneCount} as .zip`}
        </button>
      )}
    </div>
  );
}

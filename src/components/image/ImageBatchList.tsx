"use client";

import { useEffect, useRef, useState } from "react";
import { ProcessingError } from "@/lib/errors/ProcessingError";
import { sanitizeFilename } from "@/lib/security/filenames";
import { formatBytes } from "@/lib/format/bytes";
import { LazySendToToolLinks } from "@/components/tools/LazySendToToolLinks";
import { ImageLightbox } from "./ImageLightbox";

interface BatchEntry {
  key: string;
  file: File;
  /** The source image, kept after processing so "Compare with original" works. */
  previewUrl: string;
  status: "pending" | "processing" | "done" | "error";
  blob?: Blob;
  /**
   * The *processed* image. Until this existed the thumbnail kept showing the
   * input, so the only way to see what an edit had actually done was to
   * download the file and open it — which makes nudging brightness by a few
   * percent and looking at the result, the whole point of that tool,
   * impossible without leaving the page.
   */
  resultUrl?: string;
  outputFilename?: string;
  errorMessage?: string;
}

/**
 * "1.4 MB → 380 KB (−73%)".
 *
 * Shown for every operation, not just Compress. It is the headline number
 * there — the entire question that tool answers — but a resize that barely
 * shrinks the file, or a "remove metadata" that takes 200 KB off, are both
 * things worth seeing without opening a file manager.
 */
function describeSizeChange(before: number, after: number): string {
  const percent = before === 0 ? 0 : Math.round(((after - before) / before) * 100);
  const sign = percent > 0 ? "+" : percent < 0 ? "−" : "";
  return `${formatBytes(before)} → ${formatBytes(after)} (${sign}${Math.abs(percent)}%)`;
}

interface ImageBatchListProps {
  files: File[];
  /** Runs once per file, in order — sequential, not parallel, to keep peak
   * memory bounded on a large batch (same reasoning as PdfToImagesTool). */
  processFile: (file: File) => Promise<Blob>;
  deriveFilename: (file: File) => string;
  zipFilename?: string;
  /** Enables the single-result "Send to another tool" panel, and keeps it from offering the producing tool itself. */
  sourceToolSlug?: string;
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
export function ImageBatchList({
  files,
  processFile,
  deriveFilename,
  zipFilename = "images.zip",
  sourceToolSlug,
}: ImageBatchListProps) {
  const [entries, setEntries] = useState<BatchEntry[]>(() => createEntries(files));
  const [zipping, setZipping] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  /** The image currently open full size, or null. */
  const [enlarged, setEnlarged] = useState<{ src: string; alt: string; caption: string } | null>(null);

  /**
   * Result object URLs, which are created while processing rather than at
   * mount — so the `pagehide` effect below cannot capture them in its closure
   * the way it does the previews. It reads this ref at revoke time instead.
   */
  const resultUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      for (const entry of entries) {
        if (cancelled) return;
        setEntries((current) => current.map((e) => (e.key === entry.key ? { ...e, status: "processing" } : e)));

        try {
          const blob = await processFile(entry.file);
          if (cancelled) return;
          const resultUrl = URL.createObjectURL(blob);
          resultUrlsRef.current.push(resultUrl);
          setEntries((current) =>
            current.map((e) =>
              e.key === entry.key
                ? { ...e, status: "done", blob, resultUrl, outputFilename: deriveFilename(entry.file) }
                : e
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

  // Revoke each preview URL when the *page* goes away, not on React unmount.
  //
  // This used to revoke on unmount with an empty dep array, which is wrong
  // under React Strict Mode: dev double-invokes effects (mount → cleanup →
  // mount) while `entries` — and therefore the object URLs created in its
  // `useState` initializer — survive, so the second mount rendered URLs the
  // first cleanup had already revoked. Every result thumbnail showed as a
  // broken image in `npm run dev`, on every image tool.
  //
  // Invisible to `npx playwright test`, which runs a production build where
  // Strict Mode doesn't double-invoke — the same dev-only blind spot
  // documented for `GeoMap.tsx`'s `relative` class. Found by looking at the
  // dev server in a browser.
  //
  // `pagehide` is the honest scope: these URLs live exactly as long as the
  // document does. Object URLs are reclaimed with the document anyway, so
  // the listener is tidiness rather than a leak fix, and it can never revoke
  // a URL the component is still rendering.
  useEffect(() => {
    const previewUrls = entries.map((entry) => entry.previewUrl);
    const revokeAll = () => {
      // Result URLs are read from the ref rather than captured: they are
      // created later, as each file finishes, so a closure taken at mount
      // would miss every one of them.
      for (const url of [...previewUrls, ...resultUrlsRef.current]) URL.revokeObjectURL(url);
    };
    window.addEventListener("pagehide", revokeAll);
    return () => window.removeEventListener("pagehide", revokeAll);
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

  /*
   * One image gets a big preview; a batch keeps the thumbnail grid.
   *
   * A 140px thumbnail is fine for confirming "that's the right file", and
   * useless for judging a 5% brightness change — which is exactly what the
   * single-image case is usually for. Widening the grid instead would make a
   * 20-file batch scroll for pages.
   */
  const single = entries.length === 1;

  return (
    <div className="flex flex-col gap-4">
      <ImageLightbox
        src={enlarged?.src ?? null}
        alt={enlarged?.alt ?? ""}
        caption={enlarged?.caption}
        onClose={() => setEnlarged(null)}
      />

      {doneCount > 0 && (
        <button
          type="button"
          onClick={() => setShowOriginal((value) => !value)}
          aria-pressed={showOriginal}
          className="inline-flex w-fit items-center rounded-md border border-gray-200 px-3 py-1.5 text-sm hover:border-gray-400 dark:border-gray-700"
        >
          {showOriginal ? "Show result" : "Compare with original"}
        </button>
      )}

      <ul className={single ? "flex" : "flex flex-wrap gap-3"} aria-label="Images">
        {entries.map((entry) => {
          // Falls back to the source while a file is still processing, so the
          // slot never flashes empty mid-batch.
          const shown = showOriginal ? entry.previewUrl : (entry.resultUrl ?? entry.previewUrl);
          const isResult = Boolean(entry.resultUrl) && !showOriginal;

          return (
            <li
              key={entry.key}
              className="flex flex-col items-center gap-1"
              style={single ? { width: "100%", maxWidth: 520 } : { width: 140 }}
            >
              <button
                type="button"
                onClick={() =>
                  setEnlarged({
                    src: shown,
                    alt: isResult ? `Result for ${entry.file.name}` : `Original ${entry.file.name}`,
                    caption:
                      entry.status === "done" && entry.blob
                        ? `${entry.file.name} — ${describeSizeChange(entry.file.size, entry.blob.size)}`
                        : entry.file.name,
                  })
                }
                title="Click to view full size"
                className={`flex w-full cursor-zoom-in items-center justify-center overflow-hidden rounded-md border border-gray-200 bg-gray-50 hover:border-gray-400 dark:border-gray-800 dark:bg-gray-900 ${
                  single ? "h-80" : "h-28"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={shown}
                  alt={
                    isResult
                      ? `Result for ${entry.file.name}`
                      : `Original ${entry.file.name}`
                  }
                  className="h-full w-full object-contain"
                />
              </button>
              <span className="w-full truncate text-center text-xs text-gray-500">{entry.file.name}</span>
              {entry.status === "done" && entry.blob && (
                <span className="text-xs text-gray-500" title="Original size → result size">
                  {describeSizeChange(entry.file.size, entry.blob.size)}
                </span>
              )}
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
          );
        })}
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

      {/*
        Chaining is offered for a single result only, and that is a deliberate
        limit rather than an oversight. `lib/fileHandoff.ts` holds exactly one
        `{ toolSlug, file }` pair, so handing off a batch would either send
        just the first item — silently losing the rest, the worst outcome —
        or require the handoff itself to become a list, which then needs every
        consuming `FileDropZone`/`toolSlug` claim site to accept multiple
        files and decide what a multi-file arrival means for tools that take
        exactly one. That is a real feature, not a tweak; until then, a batch
        of N keeps its per-file Download buttons and the .zip.
      */}
      {doneCount === 1 &&
        (() => {
          const only = entries.find((e) => e.status === "done" && e.blob && e.outputFilename);
          if (!only) return null;
          return (
            <LazySendToToolLinks
              filename={only.outputFilename!}
              blob={only.blob!}
              excludeToolSlug={sourceToolSlug}
            />
          );
        })()}
    </div>
  );
}

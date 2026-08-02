"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { FileDropZone } from "@/components/tools/FileDropZone";
import { FileInfo } from "@/components/tools/FileInfo";
import { ProcessingStatus } from "@/components/tools/ProcessingStatus";
import { ErrorPanel } from "@/components/tools/ErrorPanel";
import { detectFileType } from "@/lib/detect/detectFile";
import { ProcessingError, type ProcessingErrorCode } from "@/lib/errors/ProcessingError";

/** Every format Image Studio's single drop zone accepts. */
export type ImageWorkspaceFormat = "png" | "jpg" | "webp" | "svg";

export const IMAGE_WORKSPACE_ACCEPT = "image/png,image/jpeg,image/webp,image/svg+xml";

export const IMAGE_FORMAT_LABEL: Record<ImageWorkspaceFormat, string> = {
  png: "PNG",
  jpg: "JPEG",
  webp: "WebP",
  svg: "SVG",
};

export interface ImageWorkspaceEntry {
  /** Monotonic, assigned once per load — a stable React key that doesn't depend on the (attacker-controlled, non-unique) filename. */
  id: number;
  file: File;
  /** Detected from the bytes, not the extension where possible; null when unrecognized. */
  format: ImageWorkspaceFormat | null;
}

interface WorkspaceError {
  message: string;
  code?: ProcessingErrorCode;
}

export interface ImageWorkspaceValue {
  entries: ImageWorkspaceEntry[];
  files: File[];
  /**
   * The one format every loaded image shares, or null when nothing is loaded
   * or the batch is mixed. This is what gates the Convert actions — a
   * "PNG to JPG" action can't run on a WebP file.
   */
  commonFormat: ImageWorkspaceFormat | null;
  status: "idle" | "reading" | "ready" | "error";
  error: WorkspaceError | null;
  /** Bumped on every load and clear; `ImageStudioApp` folds it into each tool's React `key`. */
  documentKey: number;
  loadFiles(files: File[]): void;
  clear(): void;
}

/** Exported so a component test can mount one tool with images already loaded. */
export const ImageWorkspaceContext = createContext<ImageWorkspaceValue | null>(null);

export function useImageWorkspace(): ImageWorkspaceValue {
  const value = useContext(ImageWorkspaceContext);
  if (!value) throw new Error("useImageWorkspace must be used inside an <ImageWorkspace>.");
  return value;
}

function errorFrom(cause: unknown, fallbackMessage: string): WorkspaceError {
  if (cause instanceof ProcessingError) return { message: cause.message, code: cause.code };
  return { message: fallbackMessage };
}

function asWorkspaceFormat(detected: string): ImageWorkspaceFormat | null {
  if (detected === "png" || detected === "jpg" || detected === "webp" || detected === "svg") return detected;
  return null;
}

let entryIdCounter = 0;
function nextEntryId(): number {
  entryIdCounter += 1;
  return entryIdCounter;
}

/**
 * Owns the image(s) Image Studio is working on, plus the single drop zone
 * that loads them.
 *
 * **Why the files live here and not in each tool.** Every image tool used to
 * own its own `files` state and its own `FileDropZone`, so switching tabs —
 * or even switching Edit actions, e.g. Resize to Rotate — unmounted the tool
 * and silently discarded the user's images; they had to re-drop them for
 * every operation. Same fix, same reasoning as `GeoWorkspace` and
 * `PdfWorkspace`.
 *
 * **Formats are detected once, here**, because they're what gate the
 * actions: a "WebP to JPG" conversion needs a WebP, SVG to PNG needs an SVG,
 * and none of the pixel-level Edit actions can run on an SVG. Each tool used
 * to encode that implicitly in its own drop zone's `accept` attribute, which
 * stops working once there's one shared drop zone — see `actionFormats.ts`.
 *
 * **The provider renders no UI of its own** — `ImageFilePanel` below is
 * placed by the Studio inside its shell (tabs → action picker → drop zone →
 * tool), matching the other three Studios.
 */
export function ImageWorkspace({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<ImageWorkspaceEntry[]>([]);
  const [status, setStatus] = useState<ImageWorkspaceValue["status"]>("idle");
  const [error, setError] = useState<WorkspaceError | null>(null);
  const [documentKey, setDocumentKey] = useState(0);

  const clear = useCallback(() => {
    setDocumentKey((key) => key + 1);
    setEntries([]);
    setStatus("idle");
    setError(null);
  }, []);

  const loadFiles = useCallback(async (selected: File[]) => {
    if (selected.length === 0) return;
    setDocumentKey((key) => key + 1);
    setEntries([]);
    setError(null);
    setStatus("reading");

    try {
      const detected = await Promise.all(
        selected.map(async (file) => ({
          id: nextEntryId(),
          file,
          format: asWorkspaceFormat((await detectFileType(file)).format),
        }))
      );
      setEntries(detected);
      setStatus("ready");
    } catch (cause) {
      setError(errorFrom(cause, "Could not read these images."));
      setStatus("error");
    }
  }, []);

  const value = useMemo<ImageWorkspaceValue>(() => {
    const formats = new Set(entries.map((entry) => entry.format));
    const [only] = [...formats];
    return {
      entries,
      files: entries.map((entry) => entry.file),
      commonFormat: formats.size === 1 && only ? only : null,
      status,
      error,
      documentKey,
      clear,
      loadFiles: (files: File[]) => void loadFiles(files),
    };
  }, [entries, status, error, documentKey, clear, loadFiles]);

  return <ImageWorkspaceContext.Provider value={value}>{children}</ImageWorkspaceContext.Provider>;
}

interface ImageFilePanelProps {
  /** The active tool's registry slug, so the homepage's Universal File Drop can hand a file straight to it (CLAUDE.md rule 9). */
  toolSlug?: string;
  /** False for the two single-image actions (Crop, Metadata → View). */
  multiple?: boolean;
  /** Narrows the file picker's filter to what the active action can actually process. */
  accept?: string;
  /** Overrides the drop-zone label where a generic one would be misleading (e.g. SVG to PNG). */
  label?: string;
}

/**
 * Image Studio's single drop zone, plus what's loaded and how to clear it.
 * Rendered by `ImageStudioApp` inside its shell rather than by the provider,
 * so it sits below the tabs like every other Studio's.
 */
export function ImageFilePanel({ toolSlug, multiple = true, accept, label }: ImageFilePanelProps) {
  const { entries, status, error, clear, loadFiles } = useImageWorkspace();
  const hasFiles = entries.length > 0;

  return (
    <div className="flex flex-col gap-4">
      <FileDropZone
        label={
          hasFiles
            ? multiple
              ? "Drop different images"
              : "Drop a different image"
            : (label ?? (multiple ? "Drop PNG, JPEG, WebP or SVG images here" : "Drop an image here"))
        }
        hint="Nothing is uploaded — every image is processed entirely on your device."
        accept={accept ?? IMAGE_WORKSPACE_ACCEPT}
        multiple={multiple}
        onFilesSelected={loadFiles}
        toolSlug={toolSlug}
      />

      {hasFiles && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {entries.map((entry) => (
              <FileInfo key={entry.id} file={entry.file} detectedFormat={entry.format ?? undefined} />
            ))}
          </div>
          <button
            type="button"
            onClick={clear}
            className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:border-gray-400 hover:text-gray-900 dark:border-gray-700 dark:text-gray-300 dark:hover:text-white"
          >
            Clear
          </button>
        </div>
      )}

      {status === "reading" && <ProcessingStatus state="reading" />}
      {status === "error" && error && <ErrorPanel message={error.message} code={error.code} />}
    </div>
  );
}

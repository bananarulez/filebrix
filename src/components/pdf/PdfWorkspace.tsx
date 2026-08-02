"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { FileDropZone } from "@/components/tools/FileDropZone";
import { FileInfo } from "@/components/tools/FileInfo";
import { ProcessingStatus } from "@/components/tools/ProcessingStatus";
import { ErrorPanel } from "@/components/tools/ErrorPanel";
import { ProcessingError, type ProcessingErrorCode } from "@/lib/errors/ProcessingError";
import { inspectPdfFile, type PdfDocumentInfo } from "@/engines/pdf";
import { openPdfRenderSession, type PdfRenderSession } from "@/engines/pdf/render/session";
import { PdfSignatureWarning } from "./PdfSignatureWarning";

/**
 * One opened PDF: the file itself, its structural page list (pdf-lib, via
 * the worker) and its pdf.js render session (main thread), opened together
 * once and shared by every tab that needs either half.
 */
export interface PdfWorkspaceDocument {
  /**
   * Monotonic, assigned once per successful open. Tools use it to tell an
   * *appended* document set (merge adding a second file) apart from a
   * replaced one, which the array identity alone can't express.
   */
  id: number;
  file: File;
  info: PdfDocumentInfo;
  session: PdfRenderSession;
}

interface WorkspaceError {
  message: string;
  code?: ProcessingErrorCode;
}

export interface PdfWorkspaceValue {
  documents: PdfWorkspaceDocument[];
  /** True when *any* loaded document is signed — merge can mix signed and unsigned sources. */
  hasSignature: boolean;
  status: "idle" | "opening-file" | "ready" | "error";
  error: WorkspaceError | null;
  /**
   * Bumped on every load and clear. `PdfStudioApp` folds it into each tool's
   * React `key`, so a new file remounts the active tool with fresh state
   * rather than each tool needing a reset-setState prologue (which
   * `react-hooks/set-state-in-effect` forbids anyway).
   */
  documentKey: number;
  /** `append` is merge's mode — every other tool replaces whatever was open. */
  loadFiles(files: File[], options?: { append?: boolean }): void;
  clear(): void;
  /**
   * The current load generation, bumped by every load and clear. A tool that
   * starts long work reads it before awaiting and again afterwards, and
   * discards its result if the two differ — the stale-request guard each PDF
   * tool used to own privately, now shared because the load itself moved
   * here. It's a function, not a value, precisely so the second read sees
   * the live number rather than the one captured at render time.
   */
  currentLoadToken(): number;
}

/** Exported so a component test can mount one tool with a document already loaded. */
export const PdfWorkspaceContext = createContext<PdfWorkspaceValue | null>(null);

export function usePdfWorkspace(): PdfWorkspaceValue {
  const value = useContext(PdfWorkspaceContext);
  if (!value) throw new Error("usePdfWorkspace must be used inside a <PdfWorkspace>.");
  return value;
}

function errorFrom(cause: unknown, fallbackMessage: string): WorkspaceError {
  if (cause instanceof ProcessingError) return { message: cause.message, code: cause.code };
  return { message: fallbackMessage };
}

let documentIdCounter = 0;
function nextDocumentId(): number {
  documentIdCounter += 1;
  return documentIdCounter;
}

async function closeAll(documents: PdfWorkspaceDocument[]): Promise<void> {
  await Promise.all(documents.map((doc) => doc.session.close().catch(() => {})));
}

/**
 * Owns the PDF(s) PDF Studio is working on, plus the single drop zone that
 * loads them.
 *
 * **Why the file lives here and not in each tool.** Every PDF tool used to
 * own its own `file` state, its own render session and its own
 * `FileDropZone`, so switching tabs — or even switching Pages actions, e.g.
 * Merge to Split — unmounted the tool and silently discarded the loaded
 * document; the user had to drop the same PDF again for every operation.
 * This is the same fix `GeoWorkspace` already applied to the Geospatial
 * engine, and it gives PDF Studio what `SpreadsheetDataApp` gets for free by
 * being one component that owns the file centrally.
 *
 * **The pdf.js render session is opened once, here.** It used to be opened
 * per tool (and, for PDF→Images and PDF→Text, re-opened per run and closed
 * again), so the same document was parsed two or three times in one session.
 * Sharing it is what makes the new Viewer tab essentially free, and it's why
 * tools must never `close()` a session they didn't open — the workspace
 * closes them on replace, clear and unmount.
 *
 * **The provider renders no UI of its own** — `PdfFilePanel` below is placed
 * by the Studio inside its shell (tabs → action picker → drop zone → tool),
 * matching the other three Studios.
 */
export function PdfWorkspace({ children }: { children: ReactNode }) {
  const [documents, setDocuments] = useState<PdfWorkspaceDocument[]>([]);
  const [status, setStatus] = useState<PdfWorkspaceValue["status"]>("idle");
  const [error, setError] = useState<WorkspaceError | null>(null);
  const [documentKey, setDocumentKey] = useState(0);

  // Stale-request guard, previously duplicated in PdfPageWorkspaceTool and
  // PdfSplitTool: every load bumps it, and anything opened under a
  // superseded token is closed and dropped instead of racing newer state in.
  const requestRef = useRef(0);
  // Mirrors `documents` for the event handlers and the unmount cleanup, both
  // of which need whatever is open *now* rather than a render-time snapshot.
  const documentsRef = useRef<PdfWorkspaceDocument[]>([]);

  useEffect(() => {
    return () => {
      const open = documentsRef.current;
      documentsRef.current = [];
      void closeAll(open);
    };
  }, []);

  const clear = useCallback(() => {
    requestRef.current += 1;
    const open = documentsRef.current;
    documentsRef.current = [];
    setDocuments([]);
    setDocumentKey((key) => key + 1);
    setStatus("idle");
    setError(null);
    void closeAll(open);
  }, []);

  const loadFiles = useCallback(async (selected: File[], options?: { append?: boolean }) => {
    if (selected.length === 0) return;
    const append = options?.append ?? false;

    // Supersede anything still in flight before touching any state.
    const token = ++requestRef.current;

    if (!append) {
      const open = documentsRef.current;
      documentsRef.current = [];
      setDocuments([]);
      void closeAll(open);
    }
    setDocumentKey((key) => key + 1);
    setError(null);
    setStatus("opening-file");

    const opened: PdfWorkspaceDocument[] = [];
    try {
      for (const file of selected) {
        const info = await inspectPdfFile(file);
        if (requestRef.current !== token) return await closeAll(opened);
        const session = await openPdfRenderSession(file);
        opened.push({ id: nextDocumentId(), file, info, session });
        if (requestRef.current !== token) return await closeAll(opened);
      }

      const next = append ? [...documentsRef.current, ...opened] : opened;
      documentsRef.current = next;
      setDocuments(next);
      setStatus("ready");
    } catch (cause) {
      if (requestRef.current !== token) return await closeAll(opened);
      setError(errorFrom(cause, "Could not open this PDF."));
      setStatus("error");
    }
  }, []);

  const currentLoadToken = useCallback(() => requestRef.current, []);

  const value = useMemo<PdfWorkspaceValue>(
    () => ({
      documents,
      hasSignature: documents.some((doc) => doc.info.hasSignature),
      status,
      error,
      documentKey,
      clear,
      loadFiles: (files: File[], options?: { append?: boolean }) => void loadFiles(files, options),
      currentLoadToken,
    }),
    [documents, status, error, documentKey, clear, loadFiles, currentLoadToken]
  );

  return <PdfWorkspaceContext.Provider value={value}>{children}</PdfWorkspaceContext.Provider>;
}

interface PdfFilePanelProps {
  /** The active tool's registry slug, so the homepage's Universal File Drop can hand a file straight to it (CLAUDE.md rule 9). */
  toolSlug?: string;
  /** Merge only: accepts several PDFs and appends rather than replacing. */
  multiple?: boolean;
}

/**
 * PDF Studio's single drop zone, plus what's loaded and how to clear it.
 * Rendered by `PdfStudioApp` inside its shell rather than by the provider,
 * so the drop zone sits below the tabs like every other Studio's.
 */
export function PdfFilePanel({ toolSlug, multiple = false }: PdfFilePanelProps) {
  const { documents, status, error, hasSignature, clear, loadFiles } = usePdfWorkspace();
  const hasFiles = documents.length > 0;

  return (
    <div className="flex flex-col gap-4">
      <FileDropZone
        label={
          hasFiles
            ? multiple
              ? "Drop more PDF files"
              : "Drop a different PDF file"
            : multiple
              ? "Drop two or more PDF files here"
              : "Drop a PDF file here"
        }
        hint="Nothing is uploaded — every page is read and rebuilt entirely on your device."
        accept=".pdf,application/pdf"
        multiple={multiple}
        onFilesSelected={(files) => loadFiles(files, { append: multiple })}
        toolSlug={toolSlug}
      />

      {hasFiles && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {documents.map((doc) => (
              <FileInfo key={doc.id} file={doc.file} detectedFormat="pdf" />
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

      {status === "opening-file" && <ProcessingStatus state="opening-file" />}
      {status === "error" && error && <ErrorPanel message={error.message} code={error.code} />}
      {hasSignature && <PdfSignatureWarning />}
    </div>
  );
}

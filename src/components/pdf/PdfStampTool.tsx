"use client";

import { useState } from "react";
import { usePdfWorkspace } from "./PdfWorkspace";
import { ErrorPanel } from "@/components/tools/ErrorPanel";
import { DownloadResult } from "@/components/tools/DownloadResult";
import { ProcessingStatus } from "@/components/tools/ProcessingStatus";
import { PdfSignatureWarning } from "./PdfSignatureWarning";
import { ProcessingError, type ProcessingErrorCode } from "@/lib/errors/ProcessingError";
import { deriveOutputFilename } from "@/lib/format/deriveOutputFilename";
import { addPageNumbersToFile, watermarkPdfFile, type StampPosition } from "@/engines/pdf";

export type StampMode = "watermark" | "page-numbers";

interface ErrorState {
  message: string;
  code?: ProcessingErrorCode;
}

const POSITIONS: { id: StampPosition; label: string }[] = [
  { id: "top-left", label: "Top left" },
  { id: "top-center", label: "Top centre" },
  { id: "top-right", label: "Top right" },
  { id: "center", label: "Centre" },
  { id: "bottom-left", label: "Bottom left" },
  { id: "bottom-center", label: "Bottom centre" },
  { id: "bottom-right", label: "Bottom right" },
];

const FORMATS = [
  { value: "{n}", label: "1" },
  { value: "Page {n}", label: "Page 1" },
  { value: "{n} / {total}", label: "1 / 10" },
  { value: "Page {n} of {total}", label: "Page 1 of 10" },
];

function errorFrom(cause: unknown, fallback: string): ErrorState {
  if (cause instanceof ProcessingError) return { message: cause.message, code: cause.code };
  return { message: fallback };
}

/**
 * PDF Studio's two Edit actions — a text watermark and page numbering.
 *
 * One component with a `mode` prop rather than two files, the same shape as
 * `PdfPageWorkspaceTool` and `DiffTool`: both actions draw text on every page
 * through one engine mechanism (`structural/stamp.ts`), and everything around
 * the small options panel — the workspace document, the busy state, the
 * signature warning, the download — is identical.
 *
 * Text only, and Latin-1 only, because the output uses one of the 14 standard
 * PDF fonts that need no embedded font file. The engine rejects text it can't
 * encode with a message naming the reason rather than stamping mangled
 * glyphs.
 */
export function PdfStampTool({ mode }: { mode: StampMode }) {
  const { documents, hasSignature } = usePdfWorkspace();
  const document = documents[0] ?? null;

  const [text, setText] = useState("CONFIDENTIAL");
  const [position, setPosition] = useState<StampPosition>(mode === "watermark" ? "center" : "bottom-center");
  const [opacity, setOpacity] = useState(0.25);
  const [fontSize, setFontSize] = useState(mode === "watermark" ? 48 : 11);
  const [diagonal, setDiagonal] = useState(mode === "watermark");
  const [format, setFormat] = useState("Page {n} of {total}");
  const [startPage, setStartPage] = useState(1);
  const [startNumber, setStartNumber] = useState(1);

  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Blob | null>(null);
  const [error, setError] = useState<ErrorState | null>(null);

  const pageCount = document?.info.pageCount ?? 0;

  async function handleApply() {
    if (!document) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const blob =
        mode === "watermark"
          ? await watermarkPdfFile(document.file, {
              text,
              position,
              opacity,
              fontSize,
              rotationDegrees: diagonal ? 45 : 0,
              color: { r: 0.5, g: 0.5, b: 0.5 },
            })
          : await addPageNumbersToFile(document.file, {
              position,
              fontSize,
              format,
              startPage,
              startNumber,
            });
      setResult(blob);
    } catch (cause) {
      setError(errorFrom(cause, mode === "watermark" ? "Could not watermark this PDF." : "Could not number these pages."));
    } finally {
      setBusy(false);
    }
  }

  if (!document) return null;

  return (
    <div className="flex flex-col gap-4">
      {hasSignature && <PdfSignatureWarning />}

      <fieldset className="flex flex-col gap-4 rounded-lg border border-gray-200 p-4 text-sm dark:border-gray-800">
        <legend className="px-1 font-medium">{mode === "watermark" ? "Watermark" : "Page numbers"}</legend>

        {mode === "watermark" ? (
          <label className="flex flex-col gap-1">
            <span>Watermark text</span>
            <input
              type="text"
              value={text}
              onChange={(event) => setText(event.target.value)}
              className="w-full max-w-sm rounded-md border border-gray-300 px-2 py-1.5 dark:border-gray-700 dark:bg-gray-900"
            />
          </label>
        ) : (
          <label className="flex flex-col gap-1">
            <span>Format</span>
            <select
              value={format}
              onChange={(event) => setFormat(event.target.value)}
              className="w-full max-w-sm rounded-md border border-gray-300 px-2 py-1.5 dark:border-gray-700 dark:bg-gray-900"
            >
              {FORMATS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="flex flex-wrap gap-4">
          <label className="flex flex-col gap-1">
            <span>Position</span>
            <select
              value={position}
              onChange={(event) => setPosition(event.target.value as StampPosition)}
              className="rounded-md border border-gray-300 px-2 py-1.5 dark:border-gray-700 dark:bg-gray-900"
            >
              {POSITIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span>Text size</span>
            <input
              type="number"
              min={6}
              max={144}
              value={fontSize}
              onChange={(event) => setFontSize(Number(event.target.value))}
              className="w-24 rounded-md border border-gray-300 px-2 py-1.5 dark:border-gray-700 dark:bg-gray-900"
            />
          </label>

          {mode === "watermark" ? (
            <>
              <label className="flex flex-col gap-1">
                <span>Opacity ({Math.round(opacity * 100)}%)</span>
                <input
                  type="range"
                  min={5}
                  max={100}
                  step={5}
                  value={Math.round(opacity * 100)}
                  onChange={(event) => setOpacity(Number(event.target.value) / 100)}
                  className="w-40"
                  aria-label="Opacity"
                />
              </label>
              <label className="flex items-center gap-2 self-end pb-1">
                <input type="checkbox" checked={diagonal} onChange={() => setDiagonal((value) => !value)} />
                <span>Diagonal</span>
              </label>
            </>
          ) : (
            <>
              <label className="flex flex-col gap-1">
                <span>Start on page</span>
                <input
                  type="number"
                  min={1}
                  max={Math.max(1, pageCount)}
                  value={startPage}
                  onChange={(event) => setStartPage(Number(event.target.value))}
                  className="w-24 rounded-md border border-gray-300 px-2 py-1.5 dark:border-gray-700 dark:bg-gray-900"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span>First number</span>
                <input
                  type="number"
                  min={0}
                  value={startNumber}
                  onChange={(event) => setStartNumber(Number(event.target.value))}
                  className="w-24 rounded-md border border-gray-300 px-2 py-1.5 dark:border-gray-700 dark:bg-gray-900"
                />
              </label>
            </>
          )}
        </div>

        <div>
          <button
            type="button"
            onClick={() => void handleApply()}
            disabled={busy || (mode === "watermark" && text.trim() === "")}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {busy
              ? "Working…"
              : mode === "watermark"
                ? "Add watermark"
                : `Number ${Math.max(0, pageCount - startPage + 1)} page${pageCount - startPage === 0 ? "" : "s"}`}
          </button>
        </div>
      </fieldset>

      {busy && <ProcessingStatus state="converting" />}
      {error && <ErrorPanel message={error.message} code={error.code} />}

      {result && (
        <DownloadResult
          filename={deriveOutputFilename(
            `${document.file.name.replace(/\.[^./]+$/, "")}-${mode === "watermark" ? "watermarked" : "numbered"}`,
            "pdf"
          )}
          blob={result}
          sourceToolSlug={mode === "watermark" ? "watermark" : "page-numbers"}
        />
      )}
    </div>
  );
}

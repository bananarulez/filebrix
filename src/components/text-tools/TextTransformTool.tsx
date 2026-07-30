"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ErrorPanel } from "@/components/tools/ErrorPanel";
import { DownloadResult } from "@/components/tools/DownloadResult";
import { deriveOutputFilename } from "@/lib/format/deriveOutputFilename";
import { ProcessingError, type ProcessingErrorCode } from "@/lib/errors/ProcessingError";
import { takePendingFile } from "@/lib/fileHandoff";

export interface TransformResult {
  output: string;
  warnings?: string[];
}

interface ErrorState {
  message: string;
  code?: ProcessingErrorCode;
}

function errorFrom(cause: unknown): ErrorState {
  if (cause instanceof ProcessingError) return { message: cause.message, code: cause.code };
  return { message: "Something went wrong processing this input." };
}

interface TextTransformToolProps {
  inputLabel: string;
  outputLabel: string;
  /** e.g. ".json" — used for the optional "Open file" picker's accept attribute. */
  acceptFileExtension: string;
  /** e.g. "json" — combined with the opened file's name, or a generic default, for the download button. */
  downloadFileExtension: string;
  downloadMimeType: string;
  placeholder?: string;
  /** Button label for the primary action, e.g. "Format", "Validate", "Convert". */
  actionLabel?: string;
  /** May throw a ProcessingError — surfaced via ErrorPanel automatically. */
  transform: (input: string) => TransformResult;
  /** Format-specific options (e.g. an indent-size picker), rendered between the input and the action button. */
  extraControls?: ReactNode;
  /** This tool's registry slug — when set, a file already dropped on the homepage's Universal File Drop is claimed and run automatically on mount. See lib/fileHandoff.ts. */
  toolSlug?: string;
}

/**
 * Paste-first (not drop-first like FileDropZone-based tools): a textarea is
 * the primary input, with a compact "Open file" button as the secondary
 * affordance. Powers every JSON/XML/YAML formatter/validator/converter tool.
 * Output is always rendered as plain text (textarea/text nodes) — never
 * dangerouslySetInnerHTML — so there's no unsafe-HTML-rendering surface here.
 */
export function TextTransformTool({
  inputLabel,
  outputLabel,
  acceptFileExtension,
  downloadFileExtension,
  downloadMimeType,
  placeholder,
  actionLabel = "Process",
  transform,
  extraControls,
  toolSlug,
}: TextTransformToolProps) {
  const [input, setInput] = useState("");
  const [openedFileName, setOpenedFileName] = useState<string | null>(null);
  const [result, setResult] = useState<TransformResult | null>(null);
  const [error, setError] = useState<ErrorState | null>(null);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function runTransform(text: string) {
    try {
      const transformResult = transform(text);
      setResult(transformResult);
      setError(null);
    } catch (cause) {
      setError(errorFrom(cause));
      setResult(null);
    }
  }

  function handleProcessClick() {
    runTransform(input);
  }

  async function loadFile(file: File) {
    const text = await file.text();
    setOpenedFileName(file.name);
    setInput(text);
    runTransform(text);
  }

  async function handleFileChange(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    await loadFile(file);
  }

  useEffect(() => {
    if (!toolSlug) return;
    const consumeHandoff = () => {
      const handedOffFile = takePendingFile(toolSlug);
      if (handedOffFile) void loadFile(handedOffFile);
    };
    consumeHandoff();
    // Only ever meant to run once, right after mount — loadFile/runTransform
    // close over the latest `transform` prop already, and takePendingFile is
    // single-use, so re-running this on other dependency changes would do nothing anyway.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toolSlug]);

  async function handleCopy() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.output);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    }
    setTimeout(() => setCopyStatus("idle"), 2000);
  }

  const downloadFilename = openedFileName
    ? deriveOutputFilename(openedFileName, downloadFileExtension)
    : `result.${downloadFileExtension}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="text-transform-input" className="text-sm font-medium">
          {inputLabel}
        </label>
        <textarea
          id="text-transform-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={placeholder}
          rows={12}
          spellCheck={false}
          className="w-full rounded-lg border border-gray-300 p-3 font-mono text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-gray-700 dark:bg-gray-900"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:border-gray-400 hover:text-gray-900 dark:border-gray-700 dark:text-gray-300 dark:hover:text-white"
        >
          Open file
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptFileExtension}
          className="sr-only"
          onChange={(event) => void handleFileChange(event.target.files)}
        />
        <button
          type="button"
          onClick={handleProcessClick}
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
        >
          {actionLabel}
        </button>
      </div>

      {extraControls}

      {error && <ErrorPanel message={error.message} code={error.code} />}

      {result && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="text-transform-output" className="text-sm font-medium">
              {outputLabel}
            </label>
            <textarea
              id="text-transform-output"
              value={result.output}
              readOnly
              rows={12}
              spellCheck={false}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 p-3 font-mono text-sm dark:border-gray-800 dark:bg-gray-900"
            />
          </div>

          {result.warnings && result.warnings.length > 0 && (
            <ul className="flex flex-col gap-1 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
              {result.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:border-gray-400 hover:text-gray-900 dark:border-gray-700 dark:text-gray-300 dark:hover:text-white"
            >
              {copyStatus === "copied" ? "Copied!" : copyStatus === "error" ? "Couldn't copy" : "Copy result"}
            </button>
            <DownloadResult
              filename={downloadFilename}
              blob={new Blob([result.output], { type: downloadMimeType })}
              label={`Download .${downloadFileExtension}`}
            />
          </div>
        </div>
      )}
    </div>
  );
}

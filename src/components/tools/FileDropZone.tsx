"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { takePendingFile } from "@/lib/fileHandoff";

interface FileDropZoneProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  label?: string;
  hint?: string;
  /**
   * This tool's registry slug. When set, and the user just arrived here via
   * the homepage's "Drop any file" action list, the file they already
   * dropped there is claimed automatically on mount and run through
   * `onFilesSelected` — exactly as if they'd dropped it here themselves —
   * so they're never asked to re-select a file they already picked. See
   * `lib/fileHandoff.ts`. Omit this prop for tools not reachable that way.
   */
  toolSlug?: string;
}

/**
 * Drag-and-drop with a real <input type="file"> as the accessible fallback
 * (README.txt §41 — drag-and-drop must always have a picker alternative).
 * Never uploads: files only ever get handed to `onFilesSelected` as local
 * File objects.
 */
export function FileDropZone({
  onFilesSelected,
  accept,
  multiple = false,
  label = "Drop a file here",
  hint,
  toolSlug,
}: FileDropZoneProps) {
  const inputId = useId();
  const hintId = `${inputId}-hint`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      onFilesSelected(Array.from(fileList));
    },
    [onFilesSelected]
  );

  useEffect(() => {
    if (!toolSlug) return;
    // `takePendingFile` is single-use, so a changing `onFilesSelected`
    // identity re-running this effect harmlessly finds nothing the second time.
    const handedOffFile = takePendingFile(toolSlug);
    if (handedOffFile) onFilesSelected([handedOffFile]);
  }, [toolSlug, onFilesSelected]);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-describedby={hint ? hintId : undefined}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragActive(true);
      }}
      onDragLeave={() => setIsDragActive(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragActive(false);
        handleFiles(event.dataTransfer.files);
      }}
      className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-10 text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
        isDragActive
          ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
          : "border-gray-300 dark:border-gray-700"
      }`}
    >
      <span className="text-base font-medium">{label}</span>
      <span className="text-sm text-gray-500">or click to choose a file from your device</span>
      {hint && (
        <span id={hintId} className="text-xs text-gray-400">
          {hint}
        </span>
      )}
      <input
        ref={inputRef}
        type="file"
        id={inputId}
        className="sr-only"
        accept={accept}
        multiple={multiple}
        onChange={(event) => handleFiles(event.target.files)}
      />
    </div>
  );
}

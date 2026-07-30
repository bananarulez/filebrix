"use client";

import { sanitizeFilename } from "@/lib/security/filenames";
import { LazySendToToolLinks } from "./LazySendToToolLinks";

interface DownloadResultProps {
  filename: string;
  blob: Blob;
  label?: string;
  /**
   * The slug of the tool producing this result. Enables the secondary
   * "Send to another tool" chaining panel and keeps it from offering to send
   * the output back into the tool it just came from. Optional: a caller that
   * doesn't pass it keeps exactly the previous download-only behavior.
   */
  sourceToolSlug?: string;
}

export function DownloadResult({
  filename,
  blob,
  label = "Download result",
  sourceToolSlug,
}: DownloadResultProps) {
  function handleDownload() {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = sanitizeFilename(filename);
    link.click();
    URL.revokeObjectURL(url);
  }

  // Download stays the primary action: a filled button, first in the DOM and
  // first in tab order. Chaining is a quieter, bordered panel underneath —
  // an alternative next step, not a competing call to action.
  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={handleDownload}
        className="inline-flex w-fit items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
      >
        {label}
      </button>
      {sourceToolSlug && (
        <LazySendToToolLinks filename={filename} blob={blob} excludeToolSlug={sourceToolSlug} />
      )}
    </div>
  );
}

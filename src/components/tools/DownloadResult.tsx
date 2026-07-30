"use client";

import { sanitizeFilename } from "@/lib/security/filenames";

interface DownloadResultProps {
  filename: string;
  blob: Blob;
  label?: string;
}

export function DownloadResult({ filename, blob, label = "Download result" }: DownloadResultProps) {
  function handleDownload() {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = sanitizeFilename(filename);
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
    >
      {label}
    </button>
  );
}

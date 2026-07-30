"use client";

import { useEffect, useState } from "react";
import { DownloadResult } from "@/components/tools/DownloadResult";
import { generateUuids } from "@/engines/developer/uuid";

const DEFAULT_COUNT = 5;
const MAX_COUNT = 1000;

export function UuidGeneratorTool() {
  const [count, setCount] = useState(DEFAULT_COUNT);
  const [uuids, setUuids] = useState<string[]>([]);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");

  // Generated client-side on mount only — crypto.randomUUID() would produce
  // different values during server-side rendering vs. client hydration,
  // which would otherwise cause a hydration mismatch.
  useEffect(() => {
    const generate = () => setUuids(generateUuids(DEFAULT_COUNT));
    generate();
  }, []);

  function handleGenerate() {
    setUuids(generateUuids(count));
    setCopyStatus("idle");
  }

  async function handleCopyAll() {
    try {
      await navigator.clipboard.writeText(uuids.join("\n"));
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    }
    setTimeout(() => setCopyStatus("idle"), 2000);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">How many?</span>
          <input
            type="number"
            min={1}
            max={MAX_COUNT}
            value={count}
            onChange={(event) => setCount(Math.max(1, Math.min(MAX_COUNT, Number(event.target.value) || 1)))}
            className="w-24 rounded-md border border-gray-300 px-2 py-1.5 dark:border-gray-700 dark:bg-gray-900"
          />
        </label>
        <button
          type="button"
          onClick={handleGenerate}
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Generate
        </button>
      </div>

      <textarea
        readOnly
        value={uuids.join("\n")}
        rows={Math.max(1, Math.min(uuids.length, 16))}
        spellCheck={false}
        aria-label="Generated UUIDs"
        className="w-full rounded-lg border border-gray-200 bg-gray-50 p-3 font-mono text-sm dark:border-gray-800 dark:bg-gray-900"
      />

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void handleCopyAll()}
          className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:border-gray-400 hover:text-gray-900 dark:border-gray-700 dark:text-gray-300 dark:hover:text-white"
        >
          {copyStatus === "copied" ? "Copied!" : copyStatus === "error" ? "Couldn't copy" : "Copy all"}
        </button>
        <DownloadResult
          filename="uuids.txt"
          blob={new Blob([uuids.join("\n")], { type: "text/plain;charset=utf-8" })}
          label="Download .txt"
        />
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { ErrorPanel } from "@/components/tools/ErrorPanel";
import { DownloadResult } from "@/components/tools/DownloadResult";
import type { CoordinateFormat, CoordinateLineResult } from "@/engines/geospatial/convert/coordinates";

const FORMAT_OPTIONS: Array<{ value: CoordinateFormat; label: string }> = [
  { value: "dd", label: "Decimal degrees (40.7128, -74.0060)" },
  { value: "dms", label: `Degrees, minutes, seconds (40°42'46.1"N 74°0'21.6"W)` },
  { value: "ddm", label: "Degrees, decimal minutes (40°42.768'N 74°0.360'W)" },
  { value: "utm", label: "UTM (18T 583960 4507523)" },
];

const PLACEHOLDER = "40.7128, -74.0060\n51.5074, -0.1278\n18T 583960 4507523";

/**
 * Paste-first, like the JSON/XML/YAML text tools, but with per-line results
 * (a coordinate list mixes cleanly, one bad line shouldn't block the rest)
 * and an async transform (the `utm` conversion module is dynamically
 * imported on first use), so this doesn't reuse TextTransformTool's
 * synchronous `transform` contract directly.
 */
export function CoordinateConverterTool() {
  const [input, setInput] = useState("");
  const [outputFormat, setOutputFormat] = useState<CoordinateFormat>("dd");
  const [results, setResults] = useState<CoordinateLineResult[] | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  async function handleConvert() {
    setIsConverting(true);
    setLoadError(null);
    try {
      const { convertCoordinateLines } = await import("@/engines/geospatial/convert/coordinates");
      setResults(convertCoordinateLines(input, outputFormat));
    } catch {
      setLoadError("Something went wrong converting these coordinates.");
      setResults(null);
    } finally {
      setIsConverting(false);
    }
  }

  const successfulOutput = results
    ?.filter((r): r is CoordinateLineResult & { output: string } => r.output !== null)
    .map((r) => r.output)
    .join("\n");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="coordinate-input" className="text-sm font-medium">
          Coordinates (one per line — format is auto-detected per line)
        </label>
        <textarea
          id="coordinate-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={PLACEHOLDER}
          rows={8}
          spellCheck={false}
          className="w-full rounded-lg border border-gray-300 p-3 font-mono text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-gray-700 dark:bg-gray-900"
        />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Convert to</span>
          <select
            value={outputFormat}
            onChange={(event) => setOutputFormat(event.target.value as CoordinateFormat)}
            className="rounded-md border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900"
          >
            {FORMAT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => void handleConvert()}
          disabled={isConverting || !input.trim()}
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {isConverting ? "Converting…" : "Convert"}
        </button>
      </div>

      {loadError && <ErrorPanel message={loadError} />}

      {results && (
        <div className="flex flex-col gap-3">
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="border-b border-gray-200 px-3 py-2 text-left font-medium dark:border-gray-800">Input</th>
                  <th className="border-b border-gray-200 px-3 py-2 text-left font-medium dark:border-gray-800">Result</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, index) => (
                  <tr key={index}>
                    <td className="border-b border-gray-100 px-3 py-2 font-mono text-xs dark:border-gray-900">
                      {result.input}
                    </td>
                    <td
                      className={`border-b border-gray-100 px-3 py-2 font-mono text-xs dark:border-gray-900 ${
                        result.error ? "text-red-600 dark:text-red-400" : ""
                      }`}
                    >
                      {result.output ?? result.error}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {successfulOutput && (
            <DownloadResult
              filename="coordinates.txt"
              blob={new Blob([successfulOutput], { type: "text/plain;charset=utf-8" })}
              label="Download converted coordinates"
            />
          )}
        </div>
      )}
    </div>
  );
}

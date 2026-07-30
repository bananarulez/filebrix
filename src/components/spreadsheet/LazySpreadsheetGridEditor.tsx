"use client";

import dynamic from "next/dynamic";

/**
 * The single dynamic-import boundary for jspreadsheet-ce: every mode of the
 * Spreadsheet & Data app other than Editor renders VirtualizedTable instead,
 * so jspreadsheet-ce (JS + CSS, ~630 KB raw combined with its jsuites
 * dependency) only ever loads for someone actually opening Editor mode,
 * never for View/Convert/Analyze (CLAUDE.md rule 4), mirroring
 * components/geo/LazyGeoMap.tsx's relationship to maplibre-gl.
 */
export const LazySpreadsheetGridEditor = dynamic(
  () => import("./SpreadsheetGridEditor").then((mod) => mod.SpreadsheetGridEditor),
  {
    ssr: false,
    loading: () => (
      <div
        style={{ height: 480 }}
        className="flex w-full items-center justify-center rounded-lg border border-gray-200 text-sm text-gray-400 dark:border-gray-800"
      >
        Loading editor…
      </div>
    ),
  }
);

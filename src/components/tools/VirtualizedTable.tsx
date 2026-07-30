"use client";

import { useMemo, useState } from "react";

interface VirtualizedTableProps {
  columns: string[];
  rows: (string | number | null)[][];
  rowHeight?: number;
  height?: number;
  /** When provided, column headers become clickable sort buttons — callers own the
   * actual sort/filter of `rows` (this component only renders the current state and
   * reports clicks), so it stays a pure, dumb windowed table either way. */
  sortColumn?: string;
  sortDirection?: "asc" | "desc";
  onSortColumn?: (column: string) => void;
  /** When provided, each row becomes clickable and reports its absolute index into `rows` (not the windowed/visible-slice index). */
  onRowClick?: (index: number) => void;
  /** Absolute index (into `rows`) of the row to visually highlight, e.g. to reflect a selection driven from elsewhere. */
  selectedRowIndex?: number | null;
}

const OVERSCAN = 6;

/**
 * Minimal hand-rolled windowing (no external dependency) so large previews
 * (a CSV/Parquet/Excel viewer, say) don't render every row into the DOM.
 * Real tools reuse this rather than building their own virtualization.
 */
export function VirtualizedTable({
  columns,
  rows,
  rowHeight = 32,
  height = 400,
  sortColumn,
  sortDirection,
  onSortColumn,
  onRowClick,
  selectedRowIndex = null,
}: VirtualizedTableProps) {
  const [scrollTop, setScrollTop] = useState(0);

  const totalHeight = rows.length * rowHeight;
  const visibleCount = Math.ceil(height / rowHeight) + OVERSCAN * 2;
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - OVERSCAN);
  const endIndex = Math.min(rows.length, startIndex + visibleCount);
  const visibleRows = useMemo(
    () => rows.slice(startIndex, endIndex),
    [rows, startIndex, endIndex]
  );

  return (
    <div
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
      style={{ height }}
      className="overflow-auto rounded-lg border border-gray-200 dark:border-gray-800"
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        <table
          className="w-full border-collapse text-sm"
          style={{ position: "absolute", top: startIndex * rowHeight, left: 0, right: 0 }}
        >
          <thead className="sticky top-0 bg-gray-50 dark:bg-gray-900">
            <tr>
              {columns.map((col) =>
                onSortColumn ? (
                  <th
                    key={col}
                    className="border-b border-gray-200 p-0 text-left font-medium dark:border-gray-800"
                    style={{ height: rowHeight }}
                  >
                    <button
                      type="button"
                      onClick={() => onSortColumn(col)}
                      className="flex w-full items-center gap-1 px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      <span>{col}</span>
                      {sortColumn === col && <span aria-hidden>{sortDirection === "desc" ? "▼" : "▲"}</span>}
                    </button>
                  </th>
                ) : (
                  <th
                    key={col}
                    className="border-b border-gray-200 px-3 py-2 text-left font-medium dark:border-gray-800"
                    style={{ height: rowHeight }}
                  >
                    {col}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, rowIndex) => {
              const absoluteIndex = startIndex + rowIndex;
              const isSelected = selectedRowIndex === absoluteIndex;
              return (
                <tr
                  key={absoluteIndex}
                  onClick={onRowClick ? () => onRowClick(absoluteIndex) : undefined}
                  aria-selected={onRowClick ? isSelected : undefined}
                  className={
                    onRowClick
                      ? `cursor-pointer ${isSelected ? "bg-blue-50 dark:bg-blue-950/40" : "hover:bg-gray-50 dark:hover:bg-gray-900"}`
                      : undefined
                  }
                >
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className="border-b border-gray-100 px-3 py-2 dark:border-gray-900"
                      style={{ height: rowHeight }}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

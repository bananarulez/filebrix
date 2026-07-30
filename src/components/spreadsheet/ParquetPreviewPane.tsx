"use client";

import { useEffect, useState } from "react";
import { ErrorPanel } from "@/components/tools/ErrorPanel";
import { ProcessingError, type ProcessingErrorCode } from "@/lib/errors/ProcessingError";
import type { ParquetSession, PreviewPage, SortDirection } from "@/engines/parquet/types";

const PAGE_SIZE = 100;
const SEARCH_DEBOUNCE_MS = 300;

function errorFrom(cause: unknown, fallbackMessage: string): { message: string; code?: ProcessingErrorCode } {
  if (cause instanceof ProcessingError) return { message: cause.message, code: cause.code };
  return { message: fallbackMessage };
}

function CellValue({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <span className="italic text-gray-400 dark:text-gray-600">NULL</span>;
  }
  if (typeof value === "boolean") return <>{value ? "true" : "false"}</>;
  if (typeof value === "bigint") return <>{value.toString()}</>;
  if (typeof value === "object") {
    return <span className="font-mono text-xs">{JSON.stringify(value)}</span>;
  }
  return <>{String(value)}</>;
}

interface ParquetPreviewPaneProps {
  session: ParquetSession;
}

/**
 * Parquet's View pane — paginated, SQL-backed search & sort (via
 * `session.getPage`), extracted from the former standalone Parquet Viewer tool so
 * this same behavior (300ms search debounce, tri-state column sort, "search checks
 * only the first 30 columns" on wide tables via `MAX_SEARCH_COLUMNS`, the "Rows X–Y
 * of Z" footer copy) is preserved rather than reimplemented. Never materializes the
 * whole dataset — this is what keeps Parquet's View tab scalable regardless of file
 * size, unlike Editor mode (see `engines/parquet/tableBridge.ts`).
 */
export function ParquetPreviewPane({ session }: ParquetPreviewPaneProps) {
  const [pageData, setPageData] = useState<PreviewPage | null>(null);
  const [error, setError] = useState<{ message: string; code?: ProcessingErrorCode } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [page, setPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<string | undefined>(undefined);
  const [sortDirection, setSortDirection] = useState<SortDirection | undefined>(undefined);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Debounce the search box so every keystroke doesn't fire a query.
  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearchTerm(searchInput);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  // Fetch (or re-fetch) the current page whenever the session or any
  // pagination/sort/search parameter changes. Keeps the existing table visible
  // (dimmed) on subsequent fetches rather than tearing down the UI.
  useEffect(() => {
    let cancelled = false;
    const isInitialLoad = pageData === null;

    (async () => {
      if (!isInitialLoad) setIsRefreshing(true);
      try {
        const result = await session.getPage({ page, pageSize: PAGE_SIZE, sortColumn, sortDirection, searchTerm });
        if (cancelled) return;
        setPageData(result);
        setError(null);
      } catch (cause) {
        if (cancelled) return;
        setError(errorFrom(cause, "Could not read this page of data."));
      } finally {
        if (!cancelled) setIsRefreshing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // pageData is intentionally excluded: it's only read to distinguish the first
    // load and is itself set by this effect, so including it would create a
    // feedback loop rather than reacting to a new user action.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, page, sortColumn, sortDirection, searchTerm]);

  function handleSortClick(columnName: string) {
    if (sortColumn !== columnName) {
      setSortColumn(columnName);
      setSortDirection("ASC");
    } else if (sortDirection === "ASC") {
      setSortDirection("DESC");
    } else {
      setSortColumn(undefined);
      setSortDirection(undefined);
    }
    setPage(1);
  }

  if (error) return <ErrorPanel message={error.message} code={error.code} />;
  // Parent (SpreadsheetDataApp) already shows a busy indicator while the session
  // itself opens; this is just the brief window before the first page arrives.
  if (!pageData) return null;

  const totalPages = pageData.pageSize > 0 ? Math.ceil(pageData.totalRows / pageData.pageSize) : 0;

  return (
    <div className="flex flex-col gap-4">
      <section aria-label="Schema">
        <h2 className="mb-2 text-sm font-semibold text-gray-500">Schema</h2>
        <div className="flex flex-wrap gap-2">
          {session.summary.columns.map((column) => (
            <span key={column.name} className="rounded-md bg-gray-100 px-2 py-1 font-mono text-xs dark:bg-gray-800">
              {column.name} <span className="text-gray-500">{column.type}</span>
            </span>
          ))}
        </div>
      </section>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Search</span>
        <input
          type="search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Filter rows…"
          className="rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-gray-700 dark:bg-gray-900"
        />
      </label>

      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
        <table className="w-full min-w-max border-collapse text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              {session.summary.columns.map((column) => (
                <th key={column.name} className="border-b border-gray-200 dark:border-gray-800">
                  <button
                    type="button"
                    onClick={() => handleSortClick(column.name)}
                    className="flex w-full items-center gap-1 whitespace-nowrap px-3 py-2 text-left font-medium hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <span>{column.name}</span>
                    <span className="text-xs font-normal text-gray-400">{column.type}</span>
                    {sortColumn === column.name && <span aria-hidden>{sortDirection === "DESC" ? "▼" : "▲"}</span>}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={isRefreshing ? "opacity-50 transition-opacity" : "transition-opacity"}>
            {pageData.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {session.summary.columns.map((column) => (
                  <td
                    key={column.name}
                    className="whitespace-nowrap border-b border-gray-100 px-3 py-2 dark:border-gray-900"
                  >
                    <CellValue value={row[column.name]} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <span className="text-gray-500">
          {pageData.totalRows === 0
            ? "No rows to display"
            : `Rows ${(page - 1) * pageData.pageSize + 1}–${Math.min(
                page * pageData.pageSize,
                pageData.totalRows
              )} of ${pageData.totalRows.toLocaleString()}`}
        </span>
        {totalPages > 1 && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1}
              className="rounded-md border border-gray-200 px-3 py-1.5 disabled:opacity-40 dark:border-gray-700"
            >
              Previous
            </button>
            <span className="text-gray-500">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page >= totalPages}
              className="rounded-md border border-gray-200 px-3 py-1.5 disabled:opacity-40 dark:border-gray-700"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

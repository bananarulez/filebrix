import type { ReactNode } from "react";

interface AppShellProps {
  toolbar: ReactNode;
  sidePanel?: ReactNode;
  /** Main preview area (a table, map, thumbnail grid — whatever the app previews). */
  children: ReactNode;
  exportBar?: ReactNode;
}

/**
 * Pure layout, no app-specific knowledge — toolbar row, an optional row of
 * side-panel sections *above* the main preview (not beside it — a
 * fixed-width sidebar column would permanently steal width from a wide
 * data table/grid), and an optional export bar underneath. Shared across
 * every consolidated application (Spreadsheet & Data now; PDF/Image/Geo in
 * later phases), so it stays deliberately generic: each app supplies its
 * own toolbar/side-panel/export content as props rather than this
 * component knowing about tables, recipes, or file formats.
 *
 * Deliberately stays at the page's normal width at all times, loaded data
 * or not — an earlier version widened once data loaded, but the page's
 * width needs to stay predictable for ad placement in the side margins, so
 * this never breaks out of its container.
 */
export function AppShell({ toolbar, sidePanel, children, exportBar }: AppShellProps) {
  return (
    <div className="mx-auto flex w-full flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-3 dark:border-gray-800">
        {toolbar}
      </div>
      {sidePanel && <div className="flex flex-wrap gap-4">{sidePanel}</div>}
      <div className="min-w-0">{children}</div>
      {exportBar && (
        <div className="flex flex-wrap items-center gap-3 border-t border-gray-200 pt-4 dark:border-gray-800">
          {exportBar}
        </div>
      )}
    </div>
  );
}

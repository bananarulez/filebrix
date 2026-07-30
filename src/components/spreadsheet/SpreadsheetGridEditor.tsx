"use client";

// This file is only ever reached via next/dynamic(..., { ssr: false }) — see
// LazySpreadsheetGridEditor.tsx — so this static CSS import never lands in a
// bundle for View/Convert/Analyze-only pages, mirroring GeoMap.tsx's
// maplibre-gl.css precedent. The JS library itself is still dynamically
// imported below, inside the effect, on first mount.
import "jspreadsheet-ce/dist/jspreadsheet.css";
// jspreadsheet-ce's toolbar/dropdown/color-picker widgets are actually
// styled by its own `jsuites` dependency, in jsuites's *own* separate CSS
// file — jspreadsheet.css does not re-export or @import it. Confirmed by
// grepping both packages' real CSS: the `.material-icons` class (and the
// toolbar/picker chrome around it) only exists in jsuites.css; without this
// import the toolbar buttons render as literal unstyled ligature text
// ("format_bold") instead of icon glyphs, since no rule ever sets their
// font-family to "Material Icons" at all.
import "jsuites/dist/jsuites.css";
import "./material-icons.css";
import { useEffect, useRef } from "react";
import type jspreadsheetNS from "jspreadsheet-ce";
import type { CellValue, NormalizedTable } from "@/engines/spreadsheet";

interface SpreadsheetGridEditorProps {
  table: NormalizedTable;
  /** Fired after every direct cell edit (typing, paste, delete, column rename) with the grid's full current contents — a push model rather than an imperative ref, since refs threaded through next/dynamic's lazy boundary aren't reliable. The parent is expected to key this component (e.g. `key={bulkOpVersion}`) to force a clean remount whenever it needs to push new data in (after a bulk operation), rather than this component accepting a "reload" prop internally. */
  onLiveChange: (table: NormalizedTable) => void;
}

type GridCellValue = string | number | boolean;

/** jspreadsheet-ce's CellValue is string | number | boolean — narrower than
 * our NormalizedTable's CellValue (which also allows null/Date). Cells are
 * genuinely re-typed as text once they enter a hand-editable grid, the same
 * way a real spreadsheet treats every cell as display text/number first. */
function toGridCell(value: CellValue): GridCellValue {
  if (value === null) return "";
  if (value instanceof Date) return value.toISOString();
  return value;
}

function fromGridCell(value: GridCellValue): CellValue {
  if (value === "") return null;
  return value;
}

function readTable(worksheet: jspreadsheetNS.WorksheetInstance, warnings: string[]): NormalizedTable {
  const headers = worksheet.getHeaders(true) as string[];
  const rows = worksheet.getData() as GridCellValue[][];
  return { columns: headers, rows: rows.map((row) => row.map(fromGridCell)), warnings };
}

/** Renders an interactive, Excel-style grid for one NormalizedTable using jspreadsheet-ce (MIT). Everything happens against data already in memory — no network request, no file I/O of its own. Uninitialized props (the initial `table`) are only ever read once, on mount — see `onLiveChange` doc for why. */
export function SpreadsheetGridEditor({ table, onLiveChange }: SpreadsheetGridEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const initialTableRef = useRef(table);
  const onLiveChangeRef = useRef(onLiveChange);

  useEffect(() => {
    onLiveChangeRef.current = onLiveChange;
  }, [onLiveChange]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let cancelled = false;
    let cleanup: (() => void) | null = null;

    import("jspreadsheet-ce").then((mod) => {
      if (cancelled || !container) return;
      const jspreadsheet = mod.default;
      const initialTable = initialTableRef.current;

      const emitChange = (instance: jspreadsheetNS.WorksheetInstance) => {
        onLiveChangeRef.current(readTable(instance, initialTable.warnings));
      };

      const instances = jspreadsheet(container, {
        // The built-in formatting toolbar (bold/italic, alignment, font
        // size, color, merge, freeze, …) — off by default in jspreadsheet-ce.
        toolbar: true,
        // Cell values are always treated as plain text, never parsed as
        // HTML — this is what makes rendering a malicious cell value (e.g.
        // from an imported CSV) safe by construction. Explicit even though
        // it's already jspreadsheet-ce's default, as defense-in-depth
        // against that default ever changing. Verified with a real payload
        // — see SpreadsheetGridEditor tests.
        parseHTML: false,
        // Removes jspreadsheet-ce's own "Jspreadsheet CE" attribution link
        // from the context menu — this is FileBrix's editor, not a
        // third-party product page linked from inside it.
        about: false,
        onafterchanges: (instance: jspreadsheetNS.WorksheetInstance) => emitChange(instance),
        onchangeheader: (instance: jspreadsheetNS.WorksheetInstance) => emitChange(instance),
        oninsertrow: (instance: jspreadsheetNS.WorksheetInstance) => emitChange(instance),
        ondeleterow: (instance: jspreadsheetNS.WorksheetInstance) => emitChange(instance),
        oninsertcolumn: (instance: jspreadsheetNS.WorksheetInstance) => emitChange(instance),
        ondeletecolumn: (instance: jspreadsheetNS.WorksheetInstance) => emitChange(instance),
        worksheets: [
          {
            columns: initialTable.columns.map((title) => ({ title, type: "text", width: 140 })),
            data: initialTable.rows.map((row) => row.map(toGridCell)),
            minDimensions: [Math.max(initialTable.columns.length, 1), 1],
            // tableWidth is required for tableOverflow to actually contain
            // the grid in its own scroll area — without it the table
            // renders at full natural width and pushes the whole page into
            // horizontal scroll instead of just the grid.
            tableOverflow: true,
            tableWidth: "100%",
            tableHeight: "600px",
            search: true,
            // lazyLoading (continuous, windowed rendering as you scroll) —
            // not click-through `pagination` — matches how every other
            // large-dataset preview in this app behaves (VirtualizedTable's
            // own windowing). A 19k+/50k+ row real-world workbook should
            // scroll like a real spreadsheet, not paginate into 96 pages.
            lazyLoading: true,
          },
        ],
      });

      cleanup = () => jspreadsheet.destroy(container as unknown as jspreadsheetNS.JspreadsheetInstanceElement, true);
      void instances;
    });

    return () => {
      cancelled = true;
      cleanup?.();
    };
    // Deliberately empty: this component only ever reads `table` once, on
    // mount, via `initialTableRef`. Reloading with new data is the parent's
    // job (remount via a changing `key`), not this effect's — see the
    // `onLiveChange` prop doc for why.
  }, []);

  return (
    <div className="w-full overflow-x-auto">
      <div ref={containerRef} />
    </div>
  );
}

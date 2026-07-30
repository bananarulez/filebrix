import { ProcessingError } from "@/lib/errors/ProcessingError";
import { parseXmlOrThrow } from "./format/xml";
import { sanitizeXmlElementName } from "./xmlNames";
import type { CellValue, NormalizedTable } from "./types";

/**
 * Tabular XML<->NormalizedTable, for CSV<->XML — reuses NormalizedTable
 * directly (unlike the hierarchical JSON<->XML conversion in
 * convert/jsonXml.ts, which is a genuinely different shape and kept
 * separate rather than forced through this same path).
 *
 * Convention: <rows><row><ColumnName>value</ColumnName>...</row>...</rows>.
 * Runs on the main thread — DOMParser doesn't exist inside Web Workers.
 */
export function serializeTableToXmlText(table: NormalizedTable): string {
  const doc = document.implementation.createDocument(null, null, null);
  const rowsEl = doc.createElement("rows");
  doc.appendChild(rowsEl);

  const columnTags = table.columns.map((column) => sanitizeXmlElementName(column, "column"));

  for (const row of table.rows) {
    const rowEl = doc.createElement("row");
    rowsEl.appendChild(rowEl);
    row.forEach((cell, index) => {
      const cellEl = doc.createElement(columnTags[index]);
      rowEl.appendChild(cellEl);
      if (cell !== null && cell !== undefined) {
        cellEl.appendChild(doc.createTextNode(formatCellForXml(cell)));
      }
    });
  }

  return new XMLSerializer().serializeToString(doc);
}

function formatCellForXml(value: CellValue): string {
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

/**
 * Reverse direction requires the root's children to share one tag name
 * (the "row" shape) — anything else is a clear ProcessingError naming
 * what was expected vs. found, not a best-effort guess. A row's own
 * attributes become "@"-prefixed columns (same convention as JSON<->XML);
 * a grandchild-level nested element stringifies into its cell with a
 * warning (same nested-value precedent as Parquet Viewer and JSON->CSV).
 */
export function parseXmlTable(text: string): NormalizedTable {
  const doc = parseXmlOrThrow(text);
  const recordElements = Array.from(doc.documentElement.children);

  if (recordElements.length === 0) {
    return { columns: [], rows: [], warnings: [] };
  }

  const firstTag = recordElements[0].tagName;
  const allSameTag = recordElements.every((element) => element.tagName === firstTag);
  if (!allSameTag) {
    const distinctTags = Array.from(new Set(recordElements.map((element) => element.tagName)));
    throw new ProcessingError(
      "UNSUPPORTED_FORMAT",
      "XML to CSV expects every child of the root element to share the same tag name " +
        `(a repeating record structure like <rows><row>...</row>...</rows>). This file's root ` +
        `has children with different tags (${distinctTags.join(", ")}), so it can't be converted to a table.`
    );
  }

  const warnings: string[] = [];
  const columnOrder: string[] = [];
  const seenColumns = new Set<string>();

  function registerColumn(key: string): void {
    if (!seenColumns.has(key)) {
      seenColumns.add(key);
      columnOrder.push(key);
    }
  }

  const recordMaps = recordElements.map((recordEl) => {
    const rowMap = new Map<string, CellValue>();

    for (const attr of Array.from(recordEl.attributes)) {
      const key = `@${attr.name}`;
      registerColumn(key);
      rowMap.set(key, attr.value);
    }

    for (const fieldEl of Array.from(recordEl.children)) {
      const key = fieldEl.tagName;
      registerColumn(key);

      let value: CellValue;
      if (fieldEl.children.length > 0) {
        value = new XMLSerializer().serializeToString(fieldEl);
        warnings.push(`"${key}" contains nested elements; its value was flattened to an XML string.`);
      } else {
        const text = fieldEl.textContent?.trim() ?? "";
        value = text.length > 0 ? text : null;
      }

      if (rowMap.has(key)) {
        warnings.push(`"${key}" appeared more than once in a single record; only the last value was kept.`);
      }
      rowMap.set(key, value);
    }

    return rowMap;
  });

  const rows: CellValue[][] = recordMaps.map((rowMap) =>
    columnOrder.map((column) => (rowMap.has(column) ? rowMap.get(column)! : null))
  );

  return { columns: columnOrder, rows, warnings: Array.from(new Set(warnings)) };
}

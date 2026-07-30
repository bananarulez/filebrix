import type { EditOperation } from "@/engines/spreadsheet/edit/recipe";

/**
 * Human-readable label for one recipe step, shown in the "applied edits"
 * list. Column names are resolved against the table's *original* columns —
 * good enough for a display label, even though a rename/reorder earlier in
 * the recipe means a later step's column name here may not exactly match
 * what that step operated on at the time. Nothing downstream depends on
 * this being byte-exact; `applyRecipe` always replays against real,
 * current indices regardless of what this label says.
 */
export function describeOperation(op: EditOperation, originalColumns: string[]): string {
  const colName = (i: number) => originalColumns[i] ?? `Column ${i + 1}`;

  switch (op.type) {
    case "findReplace":
      return `Find & replace "${op.find}" → "${op.replace}"${
        op.columnIndex !== null ? ` in ${colName(op.columnIndex)}` : " in all columns"
      }`;
    case "removeEmptyRows":
      return "Remove empty rows";
    case "removeEmptyColumns":
      return "Remove empty columns";
    case "deleteRows":
      return `Delete ${op.indices.length} row${op.indices.length === 1 ? "" : "s"}`;
    case "deleteColumns":
      return `Delete column${op.indices.length === 1 ? "" : "s"}: ${op.indices.map(colName).join(", ")}`;
    case "renameColumn":
      return `Rename "${colName(op.index)}" to "${op.name}"`;
    case "reorderColumns":
      return "Reorder columns";
    case "sortRows":
      return `Sort by ${colName(op.columnIndex)} (${op.direction === "asc" ? "ascending" : "descending"})`;
    case "filterRows":
      return `Filter ${colName(op.columnIndex)}: ${op.operator}${op.value ? ` "${op.value}"` : ""}`;
    case "removeDuplicateRows":
      return "Remove duplicate rows";
    case "trimWhitespace":
      return "Trim whitespace";
  }
}

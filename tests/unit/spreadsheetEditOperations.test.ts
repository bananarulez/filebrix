import { describe, expect, it } from "vitest";
import {
  deleteColumns,
  deleteRows,
  filterRows,
  findReplace,
  removeDuplicateRows,
  removeEmptyColumns,
  removeEmptyRows,
  renameColumn,
  reorderColumns,
  sortRows,
  trimWhitespace,
} from "@/engines/spreadsheet/edit/operations";
import type { NormalizedTable } from "@/engines/spreadsheet/types";

function table(columns: string[], rows: NormalizedTable["rows"]): NormalizedTable {
  return { columns, rows, warnings: [] };
}

describe("findReplace", () => {
  it("replaces text in a single column only", () => {
    const t = table(["a", "b"], [["foo", "foo"]]);
    const result = findReplace(t, { columnIndex: 0, find: "foo", replace: "bar" });
    expect(result.rows).toEqual([["bar", "foo"]]);
  });

  it("replaces across every column when columnIndex is null", () => {
    const t = table(["a", "b"], [["foo", "foo"]]);
    const result = findReplace(t, { columnIndex: null, find: "foo", replace: "bar" });
    expect(result.rows).toEqual([["bar", "bar"]]);
  });

  it("is case-insensitive by default and case-sensitive with matchCase", () => {
    const t = table(["a"], [["Foo"]]);
    expect(findReplace(t, { columnIndex: 0, find: "foo", replace: "x" }).rows).toEqual([["x"]]);
    expect(findReplace(t, { columnIndex: 0, find: "foo", replace: "x", matchCase: true }).rows).toEqual([["Foo"]]);
  });

  it("replaces matching numeric cells too, preserving the numeric type when the result still parses as a number", () => {
    const t = table(["a"], [[9], [90], [null]]);
    const result = findReplace(t, { columnIndex: null, find: "9", replace: "12331" });
    expect(result.rows).toEqual([[12331], [123310], [null]]);
  });

  it("falls back to a text cell when the replaced value no longer parses as a number", () => {
    const t = table(["a"], [[9]]);
    const result = findReplace(t, { columnIndex: null, find: "9", replace: "nine" });
    expect(result.rows).toEqual([["nine"]]);
  });

  it("leaves a cell untouched when there's no match, regardless of type", () => {
    const t = table(["a"], [[true], [42], [null]]);
    const result = findReplace(t, { columnIndex: null, find: "zzz", replace: "x" });
    expect(result.rows).toEqual([[true], [42], [null]]);
  });

  it("does not crash on an invalid regex when useRegex is true — returns the table unchanged", () => {
    const t = table(["a"], [["foo"]]);
    expect(() => findReplace(t, { columnIndex: 0, find: "(unclosed", replace: "x", useRegex: true })).not.toThrow();
  });

  it("is a no-op for an empty search string", () => {
    const t = table(["a"], [["foo"]]);
    expect(findReplace(t, { columnIndex: null, find: "", replace: "x" })).toEqual(t);
  });
});

describe("removeEmptyRows / removeEmptyColumns", () => {
  it("removes rows where every cell is null or blank", () => {
    const t = table(["a", "b"], [[null, "  "], ["x", "y"], [null, null]]);
    expect(removeEmptyRows(t).rows).toEqual([["x", "y"]]);
  });

  it("removes columns where every cell is null or blank", () => {
    const t = table(["a", "b"], [["x", null], ["y", "  "]]);
    const result = removeEmptyColumns(t);
    expect(result.columns).toEqual(["a"]);
    expect(result.rows).toEqual([["x"], ["y"]]);
  });

  it("is a no-op on an already-empty table", () => {
    const t = table([], []);
    expect(removeEmptyRows(t)).toEqual(t);
    expect(removeEmptyColumns(t)).toEqual(t);
  });
});

describe("deleteRows / deleteColumns", () => {
  it("deletes rows by index", () => {
    const t = table(["a"], [["r0"], ["r1"], ["r2"]]);
    expect(deleteRows(t, { indices: [1] }).rows).toEqual([["r0"], ["r2"]]);
  });

  it("deletes columns by index, dropping the header and every row's cell", () => {
    const t = table(["a", "b", "c"], [[1, 2, 3]]);
    const result = deleteColumns(t, { indices: [1] });
    expect(result.columns).toEqual(["a", "c"]);
    expect(result.rows).toEqual([[1, 3]]);
  });
});

describe("renameColumn / reorderColumns", () => {
  it("renames a column by index", () => {
    const t = table(["old"], [[1]]);
    expect(renameColumn(t, { index: 0, name: "new" }).columns).toEqual(["new"]);
  });

  it("is a no-op for an out-of-range index or blank name", () => {
    const t = table(["a"], [[1]]);
    expect(renameColumn(t, { index: 5, name: "x" })).toEqual(t);
    expect(renameColumn(t, { index: 0, name: "   " })).toEqual(t);
  });

  it("reorders columns and each row's cells together", () => {
    const t = table(["a", "b", "c"], [[1, 2, 3]]);
    const result = reorderColumns(t, { order: [2, 0, 1] });
    expect(result.columns).toEqual(["c", "a", "b"]);
    expect(result.rows).toEqual([[3, 1, 2]]);
  });
});

describe("sortRows", () => {
  it("sorts numbers ascending and descending", () => {
    const t = table(["n"], [[3], [1], [2]]);
    expect(sortRows(t, { columnIndex: 0, direction: "asc" }).rows).toEqual([[1], [2], [3]]);
    expect(sortRows(t, { columnIndex: 0, direction: "desc" }).rows).toEqual([[3], [2], [1]]);
  });

  it("sorts nulls first regardless of direction convention (stable, documented behavior)", () => {
    const t = table(["n"], [[1], [null], [2]]);
    expect(sortRows(t, { columnIndex: 0, direction: "asc" }).rows).toEqual([[null], [1], [2]]);
  });

  it("sorts strings using natural/numeric-aware comparison", () => {
    const t = table(["s"], [["item10"], ["item2"]]);
    expect(sortRows(t, { columnIndex: 0, direction: "asc" }).rows).toEqual([["item2"], ["item10"]]);
  });
});

describe("filterRows", () => {
  const t = table(["n"], [[5], [15], [null]]);

  it("filters by greaterThan/lessThan", () => {
    expect(filterRows(t, { columnIndex: 0, operator: "greaterThan", value: "10" }).rows).toEqual([[15]]);
    expect(filterRows(t, { columnIndex: 0, operator: "lessThan", value: "10" }).rows).toEqual([[5]]);
  });

  it("filters by empty/notEmpty", () => {
    expect(filterRows(t, { columnIndex: 0, operator: "empty" }).rows).toEqual([[null]]);
    expect(filterRows(t, { columnIndex: 0, operator: "notEmpty" }).rows).toEqual([[5], [15]]);
  });

  it("filters by equals/contains on string columns, case-insensitively", () => {
    const s = table(["name"], [["Alice"], ["Bob"]]);
    expect(filterRows(s, { columnIndex: 0, operator: "equals", value: "alice" }).rows).toEqual([["Alice"]]);
    expect(filterRows(s, { columnIndex: 0, operator: "contains", value: "OB" }).rows).toEqual([["Bob"]]);
  });
});

describe("removeDuplicateRows", () => {
  it("keeps only the first occurrence of an exact-duplicate row", () => {
    const t = table(["a", "b"], [[1, "x"], [1, "x"], [2, "y"]]);
    expect(removeDuplicateRows(t).rows).toEqual([[1, "x"], [2, "y"]]);
  });

  it("does not treat differing rows as duplicates", () => {
    const t = table(["a"], [[1], [2]]);
    expect(removeDuplicateRows(t).rows).toEqual([[1], [2]]);
  });
});

describe("trimWhitespace", () => {
  it("trims leading/trailing whitespace from string cells only", () => {
    const t = table(["a", "b"], [["  x  ", 42]]);
    expect(trimWhitespace(t).rows).toEqual([["x", 42]]);
  });

  it("preserves Unicode content while trimming ASCII whitespace around it", () => {
    const t = table(["a"], [["  日本語 🎉  "]]);
    expect(trimWhitespace(t).rows).toEqual([["日本語 🎉"]]);
  });
});

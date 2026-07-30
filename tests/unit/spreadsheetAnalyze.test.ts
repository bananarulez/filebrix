import { describe, expect, it } from "vitest";
import { analyzeTable } from "@/engines/spreadsheet/edit/analyze";
import type { NormalizedTable } from "@/engines/spreadsheet/types";

describe("analyzeTable", () => {
  it("reports row/column counts", () => {
    const table: NormalizedTable = {
      columns: ["a", "b"],
      rows: [[1, "x"], [2, "y"]],
      warnings: [],
    };
    const result = analyzeTable(table);
    expect(result.rowCount).toBe(2);
    expect(result.columnCount).toBe(2);
  });

  it("infers a single consistent type per column", () => {
    const table: NormalizedTable = {
      columns: ["n", "s", "b", "d"],
      rows: [[1, "x", true, new Date("2024-01-01")]],
      warnings: [],
    };
    const [n, s, b, d] = analyzeTable(table).columns;
    expect(n.type).toBe("number");
    expect(s.type).toBe("string");
    expect(b.type).toBe("boolean");
    expect(d.type).toBe("date");
  });

  it("reports 'mixed' for a column with more than one non-null type", () => {
    const table: NormalizedTable = { columns: ["c"], rows: [[1], ["x"]], warnings: [] };
    expect(analyzeTable(table).columns[0].type).toBe("mixed");
  });

  it("reports 'empty' for an all-null column", () => {
    const table: NormalizedTable = { columns: ["c"], rows: [[null], [null]], warnings: [] };
    expect(analyzeTable(table).columns[0].type).toBe("empty");
  });

  it("counts nulls and distinct values per column", () => {
    const table: NormalizedTable = {
      columns: ["c"],
      rows: [["a"], ["a"], ["b"], [null]],
      warnings: [],
    };
    const col = analyzeTable(table).columns[0];
    expect(col.nullCount).toBe(1);
    expect(col.distinctCount).toBe(3); // "a", "b", null
  });

  it("computes min/max/mean/median for numeric columns only", () => {
    const table: NormalizedTable = { columns: ["n"], rows: [[1], [2], [3], [4]], warnings: [] };
    const col = analyzeTable(table).columns[0];
    expect(col.min).toBe(1);
    expect(col.max).toBe(4);
    expect(col.mean).toBe(2.5);
    expect(col.median).toBe(2.5);
  });

  it("does not compute numeric statistics for non-numeric columns", () => {
    const table: NormalizedTable = { columns: ["s"], rows: [["x"]], warnings: [] };
    const col = analyzeTable(table).columns[0];
    expect(col.min).toBeUndefined();
    expect(col.mean).toBeUndefined();
  });

  it("handles an empty table without crashing", () => {
    const result = analyzeTable({ columns: [], rows: [], warnings: [] });
    expect(result.rowCount).toBe(0);
    expect(result.columns).toEqual([]);
  });

  it("passes through file metadata unchanged", () => {
    const table: NormalizedTable = { columns: ["a"], rows: [[1]], warnings: [] };
    const result = analyzeTable(table, { fileName: "data.csv", fileSizeBytes: 1024, format: "csv" });
    expect(result.fileMetadata).toEqual({ fileName: "data.csv", fileSizeBytes: 1024, format: "csv" });
  });

  it("counts duplicate rows using the same row-key rule removeDuplicateRows uses", () => {
    const table: NormalizedTable = {
      columns: ["a", "b"],
      rows: [
        [1, "x"],
        [1, "x"],
        [2, "y"],
        [1, "x"],
      ],
      warnings: [],
    };
    // Two extra occurrences of [1, "x"] beyond its first — [2, "y"] is unique.
    expect(analyzeTable(table).duplicateRowCount).toBe(2);
  });

  it("reports zero duplicate rows when every row is unique", () => {
    const table: NormalizedTable = { columns: ["a"], rows: [[1], [2], [3]], warnings: [] };
    expect(analyzeTable(table).duplicateRowCount).toBe(0);
  });
});

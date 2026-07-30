import { describe, expect, it } from "vitest";
import { buildNormalizedTable } from "@/engines/spreadsheet/normalize";

describe("buildNormalizedTable", () => {
  it("derives columns from the header row and builds rectangular rows", () => {
    const table = buildNormalizedTable([
      ["id", "name"],
      ["1", "Alice"],
      ["2", "Bob"],
    ]);
    expect(table.columns).toEqual(["id", "name"]);
    expect(table.rows).toEqual([
      ["1", "Alice"],
      ["2", "Bob"],
    ]);
    expect(table.warnings).toEqual([]);
  });

  it("synthesizes column names for blank header cells", () => {
    const table = buildNormalizedTable([
      ["id", "", "  "],
      ["1", "x", "y"],
    ]);
    expect(table.columns).toEqual(["id", "Column 2", "Column 3"]);
  });

  it("de-duplicates repeated header names", () => {
    const table = buildNormalizedTable([
      ["name", "name"],
      ["a", "b"],
    ]);
    expect(table.columns).toEqual(["name", "name (2)"]);
  });

  it("pads short rows with null", () => {
    const table = buildNormalizedTable([
      ["a", "b", "c"],
      ["1"],
    ]);
    expect(table.rows).toEqual([["1", null, null]]);
  });

  it("truncates long rows and records a warning", () => {
    const table = buildNormalizedTable([
      ["a", "b"],
      ["1", "2", "3"],
      ["4", "5", "6"],
    ]);
    expect(table.rows).toEqual([
      ["1", "2"],
      ["4", "5"],
    ]);
    expect(table.warnings).toEqual([
      "2 rows had more values than the header row; the extra values were dropped.",
    ]);
  });

  it("converts empty strings to null", () => {
    const table = buildNormalizedTable([
      ["a", "b"],
      ["", "x"],
    ]);
    expect(table.rows).toEqual([[null, "x"]]);
  });

  it("supports headerless mode, synthesizing columns from the widest row", () => {
    const table = buildNormalizedTable(
      [
        ["1", "2"],
        ["3", "4", "5"],
      ],
      { hasHeader: false }
    );
    expect(table.columns).toEqual(["Column 1", "Column 2", "Column 3"]);
    expect(table.rows).toEqual([
      ["1", "2", null],
      ["3", "4", "5"],
    ]);
  });

  it("returns an empty table for empty input", () => {
    expect(buildNormalizedTable([])).toEqual({ columns: [], rows: [], warnings: [] });
  });
});

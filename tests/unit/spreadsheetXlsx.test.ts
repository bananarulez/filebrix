import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { parseXlsxWorkbook } from "@/engines/spreadsheet/parsers/xlsx";
import { serializeXlsx } from "@/engines/spreadsheet/serializers/xlsx";
import { ProcessingError } from "@/lib/errors/ProcessingError";
import type { NormalizedTable } from "@/engines/spreadsheet/types";

function buildTestWorkbookBytes(sheets: Record<string, unknown[][]>): Uint8Array {
  const workbook = XLSX.utils.book_new();
  for (const [name, aoa] of Object.entries(sheets)) {
    const worksheet = XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(workbook, worksheet, name);
  }
  return XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as Uint8Array;
}

describe("parseXlsxWorkbook", () => {
  it("detects multiple sheets", () => {
    const bytes = buildTestWorkbookBytes({
      Sheet1: [
        ["id", "name"],
        [1, "Alice"],
      ],
      Sheet2: [
        ["x"],
        [1],
        [2],
      ],
    });
    const workbook = parseXlsxWorkbook(bytes);
    expect(workbook.sheets.map((s) => s.name)).toEqual(["Sheet1", "Sheet2"]);
    expect(workbook.sheets[0]).toMatchObject({ name: "Sheet1", rowCount: 2, columnCount: 2 });
  });

  it("parses the requested sheet into a NormalizedTable, preserving numeric and boolean types", () => {
    const bytes = buildTestWorkbookBytes({
      Data: [
        ["id", "active", "score"],
        [1, true, 4.5],
        [2, false, 9],
      ],
    });
    const workbook = parseXlsxWorkbook(bytes);
    const table = workbook.getSheetTable("Data");
    expect(table.columns).toEqual(["id", "active", "score"]);
    expect(table.rows).toEqual([
      [1, true, 4.5],
      [2, false, 9],
    ]);
  });

  it("preserves date cells as real Date values", () => {
    const date = new Date("2024-03-15T00:00:00.000Z");
    const bytes = buildTestWorkbookBytes({
      Data: [
        ["when"],
        [date],
      ],
    });
    const table = parseXlsxWorkbook(bytes).getSheetTable("Data");
    expect(table.rows[0][0]).toBeInstanceOf(Date);
    expect((table.rows[0][0] as Date).toISOString()).toBe(date.toISOString());
  });

  it("warns about merged cells", () => {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([
      ["a", "b"],
      [1, 2],
    ]);
    worksheet["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
    const bytes = XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as Uint8Array;

    const table = parseXlsxWorkbook(bytes).getSheetTable("Data");
    expect(table.warnings.some((w) => w.toLowerCase().includes("merged"))).toBe(true);
  });

  it("warns about formulas, using their last calculated value", () => {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([
      ["total"],
      [3],
    ]);
    worksheet["A2"] = { t: "n", v: 3, f: "1+2" };
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
    const bytes = XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as Uint8Array;

    const table = parseXlsxWorkbook(bytes).getSheetTable("Data");
    expect(table.rows).toEqual([[3]]);
    expect(table.warnings.some((w) => w.toLowerCase().includes("formula"))).toBe(true);
  });

  it("throws MALFORMED_FILE for content that isn't a real workbook", () => {
    expect(() => parseXlsxWorkbook(new Uint8Array([0, 1, 2, 3]))).toThrow(ProcessingError);
  });

  it("throws MALFORMED_FILE when asked for a sheet that doesn't exist", () => {
    const bytes = buildTestWorkbookBytes({ Sheet1: [["a"], [1]] });
    const workbook = parseXlsxWorkbook(bytes);
    expect(() => workbook.getSheetTable("NoSuchSheet")).toThrow(ProcessingError);
  });
});

describe("serializeXlsx", () => {
  it("round-trips a table through serialize -> parse", () => {
    const original: NormalizedTable = {
      columns: ["id", "name", "active"],
      rows: [
        [1, "Alice", true],
        [2, "Bob", false],
      ],
      warnings: [],
    };
    const bytes = serializeXlsx(original, "MySheet");
    const workbook = parseXlsxWorkbook(bytes);
    expect(workbook.sheets.map((s) => s.name)).toEqual(["MySheet"]);
    const table = workbook.getSheetTable("MySheet");
    expect(table.columns).toEqual(original.columns);
    expect(table.rows).toEqual(original.rows);
  });

  it("sanitizes an invalid sheet name", () => {
    const bytes = serializeXlsx({ columns: ["a"], rows: [[1]], warnings: [] }, "bad:name/here");
    const workbook = parseXlsxWorkbook(bytes);
    expect(workbook.sheets[0].name).not.toMatch(/[:\\/?*[\]]/);
  });

  it("writes a real ODS file (bookType: 'ods') that round-trips through the same reader", () => {
    const original: NormalizedTable = {
      columns: ["id", "name"],
      rows: [
        [1, "Alice"],
        [2, "Bob"],
      ],
      warnings: [],
    };
    const bytes = serializeXlsx(original, "Data", "ods");
    // ODS is ZIP-based, same magic bytes as XLSX — this is what makes the
    // existing isZip guard in parseXlsxWorkbook work for both formats.
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
    const workbook = parseXlsxWorkbook(bytes);
    const table = workbook.getSheetTable("Data");
    expect(table.columns).toEqual(original.columns);
    expect(table.rows).toEqual(original.rows);
  });
});

import { describe, expect, it } from "vitest";
import { parseJson } from "@/engines/spreadsheet/parsers/json";
import { serializeJson } from "@/engines/spreadsheet/serializers/json";
import { ProcessingError } from "@/lib/errors/ProcessingError";

describe("parseJson", () => {
  it("converts an array of objects, unioning keys in first-appearance order", () => {
    const table = parseJson('[{"id":1,"name":"Alice"},{"id":2,"note":"x"}]');
    expect(table.columns).toEqual(["id", "name", "note"]);
    expect(table.rows).toEqual([
      [1, "Alice", null],
      [2, null, "x"],
    ]);
  });

  it("converts an array of arrays with synthesized column names", () => {
    const table = parseJson("[[1,2],[3,4,5]]");
    expect(table.columns).toEqual(["Column 1", "Column 2", "Column 3"]);
    expect(table.rows).toEqual([
      [1, 2, null],
      [3, 4, 5],
    ]);
  });

  it("treats a single object as a one-row table", () => {
    const table = parseJson('{"id":1,"name":"Alice"}');
    expect(table.columns).toEqual(["id", "name"]);
    expect(table.rows).toEqual([[1, "Alice"]]);
  });

  it("converts an array of plain values into a single-column table", () => {
    const table = parseJson('["a","b","c"]');
    expect(table.columns).toEqual(["value"]);
    expect(table.rows).toEqual([["a"], ["b"], ["c"]]);
  });

  it("stringifies a nested value inside an otherwise-tabular row, with a warning", () => {
    const table = parseJson('[{"id":1,"tags":["a","b"]}]');
    expect(table.rows).toEqual([[1, '["a","b"]']]);
    expect(table.warnings.some((w) => w.includes("nested"))).toBe(true);
  });

  it("rejects a bare scalar at the top level with a clear explanation", () => {
    expect(() => parseJson("42")).toThrow(ProcessingError);
    expect(() => parseJson('"just a string"')).toThrow(ProcessingError);
    expect(() => parseJson("null")).toThrow(ProcessingError);
    try {
      parseJson("42");
    } catch (error) {
      expect(error).toBeInstanceOf(ProcessingError);
      expect((error as ProcessingError).message).toMatch(/number/i);
    }
  });

  it("rejects an array mixing objects, arrays and primitives", () => {
    expect(() => parseJson('[{"a":1},[1,2],"x"]')).toThrow(ProcessingError);
  });

  it("throws MALFORMED_FILE for invalid JSON syntax", () => {
    try {
      parseJson("{not valid json");
      throw new Error("expected parseJson to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(ProcessingError);
      expect((error as ProcessingError).code).toBe("MALFORMED_FILE");
    }
  });

  it("returns an empty table for an empty array", () => {
    expect(parseJson("[]")).toEqual({ columns: [], rows: [], warnings: [] });
  });
});

describe("serializeJson", () => {
  const table = {
    columns: ["id", "name"],
    rows: [
      [1, "Alice"],
      [2, null],
    ],
    warnings: [],
  };

  it("serializes as an array of objects by default", () => {
    const json = JSON.parse(serializeJson(table));
    expect(json).toEqual([
      { id: 1, name: "Alice" },
      { id: 2, name: null },
    ]);
  });

  it("serializes as an array of arrays when requested", () => {
    const json = JSON.parse(serializeJson(table, "array-of-arrays"));
    expect(json).toEqual([
      ["id", "name"],
      [1, "Alice"],
      [2, null],
    ]);
  });

  it("round-trips array-of-objects JSON through parse -> serialize -> parse", () => {
    const original = parseJson('[{"id":1,"name":"Alice"},{"id":2,"name":"Bob"}]');
    const reparsed = parseJson(serializeJson(original));
    expect(reparsed).toEqual(original);
  });
});

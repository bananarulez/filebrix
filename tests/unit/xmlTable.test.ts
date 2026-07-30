import { describe, expect, it } from "vitest";
import { parseXmlTable, serializeTableToXmlText } from "@/engines/spreadsheet/xmlTable";
import { ProcessingError } from "@/lib/errors/ProcessingError";
import type { NormalizedTable } from "@/engines/spreadsheet/types";

describe("serializeTableToXmlText", () => {
  it("serializes a table using the <rows><row>...</row></rows> convention", () => {
    const table: NormalizedTable = {
      columns: ["id", "name"],
      rows: [
        [1, "Alice"],
        [2, "Bob"],
      ],
      warnings: [],
    };
    const xml = serializeTableToXmlText(table);
    expect(xml).toBe("<rows><row><id>1</id><name>Alice</name></row><row><id>2</id><name>Bob</name></row></rows>");
  });

  it("renders a null cell as a self-closing empty element", () => {
    const table: NormalizedTable = { columns: ["a"], rows: [[null]], warnings: [] };
    expect(serializeTableToXmlText(table)).toBe("<rows><row><a/></row></rows>");
  });

  it("sanitizes column names that aren't valid XML element names", () => {
    const table: NormalizedTable = { columns: ["first name"], rows: [["Alice"]], warnings: [] };
    expect(serializeTableToXmlText(table)).toContain("<first_name>Alice</first_name>");
  });
});

describe("parseXmlTable", () => {
  it("round-trips a table through serialize -> parse", () => {
    const original: NormalizedTable = {
      columns: ["id", "name"],
      rows: [
        ["1", "Alice"],
        ["2", "Bob"],
      ],
      warnings: [],
    };
    const xml = serializeTableToXmlText(original);
    const reparsed = parseXmlTable(xml);
    expect(reparsed.columns).toEqual(original.columns);
    expect(reparsed.rows).toEqual(original.rows);
  });

  it("reads a record's attributes as @-prefixed columns", () => {
    const table = parseXmlTable('<rows><row id="1"><name>Alice</name></row></rows>');
    expect(table.columns).toEqual(["@id", "name"]);
    expect(table.rows).toEqual([["1", "Alice"]]);
  });

  it("stringifies a nested element with a warning instead of dropping it", () => {
    const table = parseXmlTable("<rows><row><a><b>1</b></a></row></rows>");
    expect(table.rows[0][0]).toContain("<b>1</b>");
    expect(table.warnings.some((w) => w.includes("nested"))).toBe(true);
  });

  it("throws a specific, clear error when the root's children don't share one tag name", () => {
    try {
      parseXmlTable("<rows><row><a>1</a></row><other><a>2</a></other></rows>");
      throw new Error("expected parseXmlTable to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(ProcessingError);
      expect((error as ProcessingError).message).toMatch(/row|other/i);
    }
  });

  it("returns an empty table when the root has no children", () => {
    expect(parseXmlTable("<rows></rows>")).toEqual({ columns: [], rows: [], warnings: [] });
  });

  it("pads rows that are missing a column another record introduced", () => {
    const table = parseXmlTable("<rows><row><a>1</a></row><row><a>2</a><b>x</b></row></rows>");
    expect(table.columns).toEqual(["a", "b"]);
    expect(table.rows).toEqual([
      ["1", null],
      ["2", "x"],
    ]);
  });
});

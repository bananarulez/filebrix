import { describe, expect, it } from "vitest";
import { parseCsv } from "@/engines/spreadsheet/parsers/csv";
import { serializeCsv } from "@/engines/spreadsheet/serializers/csv";
import { ProcessingError } from "@/lib/errors/ProcessingError";

describe("parseCsv", () => {
  it("parses a simple comma-delimited file", () => {
    const table = parseCsv("id,name\n1,Alice\n2,Bob\n");
    expect(table.columns).toEqual(["id", "name"]);
    expect(table.rows).toEqual([
      ["1", "Alice"],
      ["2", "Bob"],
    ]);
  });

  it("auto-detects a tab delimiter (TSV)", () => {
    const table = parseCsv("id\tname\n1\tAlice\n2\tBob\n");
    expect(table.columns).toEqual(["id", "name"]);
    expect(table.rows).toEqual([
      ["1", "Alice"],
      ["2", "Bob"],
    ]);
  });

  it("accepts a forced delimiter", () => {
    const table = parseCsv("id;name\n1;Alice\n", { delimiter: ";" });
    expect(table.columns).toEqual(["id", "name"]);
  });

  it("handles quoted fields containing the delimiter and embedded newlines", () => {
    const csv = 'id,note\n1,"hello, world"\n2,"line one\nline two"\n';
    const table = parseCsv(csv);
    expect(table.rows).toEqual([
      ["1", "hello, world"],
      ["2", "line one\nline two"],
    ]);
  });

  it("handles special characters (accents, emoji)", () => {
    const table = parseCsv("name,note\nCafé,Naïve tëst\nBob,🎉 party\n");
    expect(table.rows).toEqual([
      ["Café", "Naïve tëst"],
      ["Bob", "🎉 party"],
    ]);
  });

  it("strips a leading UTF-8 BOM", () => {
    const withBom = `﻿id,name\n1,Alice\n`;
    const table = parseCsv(withBom);
    expect(table.columns).toEqual(["id", "name"]);
  });

  it("does not throw for a header-only file with no data rows", () => {
    const table = parseCsv("id,name\n");
    expect(table.columns).toEqual(["id", "name"]);
    expect(table.rows).toEqual([]);
  });

  it("throws a clear MALFORMED_FILE error for completely empty content", () => {
    try {
      parseCsv("");
      throw new Error("expected parseCsv to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(ProcessingError);
      expect((error as ProcessingError).code).toBe("MALFORMED_FILE");
    }
  });
});

describe("serializeCsv", () => {
  it("round-trips a table through serialize -> parse", () => {
    const original = parseCsv("id,name\n1,Alice\n2,Bob\n");
    const csvText = serializeCsv(original);
    const reparsed = parseCsv(csvText);
    expect(reparsed.columns).toEqual(original.columns);
    expect(reparsed.rows).toEqual(original.rows);
  });

  it("escapes a formula-like leading character to prevent CSV injection", () => {
    const csvText = serializeCsv({
      columns: ["cell"],
      rows: [["=cmd|'/c calc'!A1"]],
      warnings: [],
    });
    // escapeFormulae prefixes a leading `'` so spreadsheet apps don't
    // execute the value as a formula on open.
    expect(csvText).toContain("'=cmd");
  });

  it("serializes Date values as ISO strings", () => {
    const csvText = serializeCsv({
      columns: ["when"],
      rows: [[new Date("2024-01-01T00:00:00.000Z")]],
      warnings: [],
    });
    expect(csvText).toContain("2024-01-01T00:00:00.000Z");
  });
});

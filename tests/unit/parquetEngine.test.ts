import { describe, expect, it } from "vitest";
import {
  buildColumnStatsSelectClauses,
  buildOrderByClause,
  buildSearchClause,
  mapDuckDbTypeToColumnType,
  MAX_SEARCH_COLUMNS,
  quoteIdentifier,
  toProcessingError,
} from "@/engines/parquet";
import type { ParquetColumn } from "@/engines/parquet/types";
import { ProcessingError } from "@/lib/errors/ProcessingError";

describe("quoteIdentifier", () => {
  it("wraps a plain column name in double quotes", () => {
    expect(quoteIdentifier("price")).toBe('"price"');
  });

  it("escapes interior double quotes so a malicious column name can't break out of the identifier", () => {
    // Parquet column names come from the file's own (untrusted) schema.
    expect(quoteIdentifier('a"; DROP TABLE x; --')).toBe('"a""; DROP TABLE x; --"');
  });
});

describe("buildOrderByClause", () => {
  const known = new Set(["id", "name"]);

  it("returns empty when no sort column is given", () => {
    expect(buildOrderByClause(undefined, undefined, known)).toBe("");
  });

  it("ignores a sort column that isn't part of the known schema", () => {
    expect(buildOrderByClause("not_a_real_column", "ASC", known)).toBe("");
  });

  it("builds a quoted ORDER BY for a known column, defaulting to ASC", () => {
    expect(buildOrderByClause("id", undefined, known)).toBe('ORDER BY "id" ASC');
  });

  it("respects DESC", () => {
    expect(buildOrderByClause("name", "DESC", known)).toBe('ORDER BY "name" DESC');
  });
});

describe("buildSearchClause", () => {
  const columns: ParquetColumn[] = [
    { name: "id", type: "BIGINT" },
    { name: "name", type: "VARCHAR" },
  ];

  it("returns no clause for an empty or whitespace-only term", () => {
    expect(buildSearchClause(columns, undefined)).toEqual({ whereClause: "", params: [] });
    expect(buildSearchClause(columns, "   ")).toEqual({ whereClause: "", params: [] });
  });

  it("builds an OR'd, case-insensitive clause across every column with a bound parameter each", () => {
    const { whereClause, params } = buildSearchClause(columns, "widget");
    expect(whereClause).toBe(
      'WHERE (CAST("id" AS VARCHAR) ILIKE ? OR CAST("name" AS VARCHAR) ILIKE ?)'
    );
    expect(params).toEqual(["%widget%", "%widget%"]);
  });

  it("caps the number of searched columns on very wide tables", () => {
    const wideColumns: ParquetColumn[] = Array.from({ length: 50 }, (_, i) => ({
      name: `col_${i}`,
      type: "VARCHAR",
    }));
    const { params } = buildSearchClause(wideColumns, "x");
    expect(params).toHaveLength(MAX_SEARCH_COLUMNS);
  });
});

describe("mapDuckDbTypeToColumnType", () => {
  it("maps DuckDB numeric types to \"number\"", () => {
    for (const type of ["TINYINT", "BIGINT", "HUGEINT", "UBIGINT", "DOUBLE", "DECIMAL(18,3)", "FLOAT"]) {
      expect(mapDuckDbTypeToColumnType(type)).toBe("number");
    }
  });

  it("maps BOOLEAN to \"boolean\"", () => {
    expect(mapDuckDbTypeToColumnType("BOOLEAN")).toBe("boolean");
  });

  it("maps DATE/TIME/TIMESTAMP variants to \"date\"", () => {
    expect(mapDuckDbTypeToColumnType("DATE")).toBe("date");
    expect(mapDuckDbTypeToColumnType("TIME")).toBe("date");
    expect(mapDuckDbTypeToColumnType("TIMESTAMP WITH TIME ZONE")).toBe("date");
  });

  it("maps STRUCT/LIST/MAP and array-suffixed types to \"nested\"", () => {
    expect(mapDuckDbTypeToColumnType("STRUCT(a INTEGER, b VARCHAR)")).toBe("nested");
    expect(mapDuckDbTypeToColumnType("LIST(INTEGER)")).toBe("nested");
    expect(mapDuckDbTypeToColumnType("MAP(VARCHAR, INTEGER)")).toBe("nested");
    expect(mapDuckDbTypeToColumnType("INTEGER[]")).toBe("nested");
  });

  it("falls back to \"string\" for VARCHAR and anything unrecognized", () => {
    expect(mapDuckDbTypeToColumnType("VARCHAR")).toBe("string");
    expect(mapDuckDbTypeToColumnType("UUID")).toBe("string");
  });
});

describe("buildColumnStatsSelectClauses", () => {
  it("requests nulls/distinct for every column, and min/max/mean/median only for numeric ones", () => {
    const columns: ParquetColumn[] = [
      { name: "id", type: "BIGINT" },
      { name: "name", type: "VARCHAR" },
    ];
    const clause = buildColumnStatsSelectClauses(columns);
    expect(clause).toContain('COUNT(*) FILTER (WHERE "id" IS NULL) AS c0_nulls');
    expect(clause).toContain('COUNT(DISTINCT "id") AS c0_distinct');
    expect(clause).toContain('MIN("id") AS c0_min');
    expect(clause).toContain('MEDIAN("id") AS c0_median');
    expect(clause).toContain('COUNT(*) FILTER (WHERE "name" IS NULL) AS c1_nulls');
    expect(clause).not.toContain("c1_min");
    expect(clause).not.toContain("c1_median");
  });
});

describe("toProcessingError", () => {
  it("passes an existing ProcessingError through unchanged", () => {
    const original = new ProcessingError("MALFORMED_FILE", "already mapped");
    expect(toProcessingError(original)).toBe(original);
  });

  it("maps memory-related messages to OUT_OF_MEMORY", () => {
    expect(toProcessingError(new Error("std::bad_alloc")).code).toBe("OUT_OF_MEMORY");
    expect(toProcessingError(new Error("Out of Memory Error")).code).toBe("OUT_OF_MEMORY");
  });

  it("maps corruption/invalid-file messages to MALFORMED_FILE", () => {
    expect(toProcessingError(new Error("No magic bytes found")).code).toBe("MALFORMED_FILE");
    expect(toProcessingError(new Error("Invalid Parquet file")).code).toBe("MALFORMED_FILE");
  });

  it("falls back to UNSUPPORTED_FORMAT for anything else", () => {
    expect(toProcessingError(new Error("some unrecognized engine failure")).code).toBe(
      "UNSUPPORTED_FORMAT"
    );
    expect(toProcessingError("a raw string throw").code).toBe("UNSUPPORTED_FORMAT");
  });
});

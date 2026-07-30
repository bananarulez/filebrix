import { describe, expect, it } from "vitest";
import { buildInsertStatements } from "@/engines/developer/sql/csvToInsert";
import type { NormalizedTable } from "@/engines/spreadsheet/types";
import { ProcessingError } from "@/lib/errors/ProcessingError";

function table(overrides: Partial<NormalizedTable> = {}): NormalizedTable {
  return {
    columns: ["id", "name", "active"],
    rows: [
      [1, "Alice", true],
      [2, "O'Brien", false],
      [3, null, true],
    ],
    warnings: [],
    ...overrides,
  };
}

describe("buildInsertStatements", () => {
  it("builds one INSERT statement per row", () => {
    const { output } = buildInsertStatements(table(), { tableName: "users", dialect: "standard" });
    const statements = output.split("\n");
    expect(statements.length).toBe(3);
    expect(statements[0]).toBe(`INSERT INTO "users" ("id", "name", "active") VALUES (1, 'Alice', TRUE);`);
  });

  it("safely escapes a single quote inside a string value", () => {
    const { output } = buildInsertStatements(table(), { tableName: "users", dialect: "standard" });
    expect(output).toContain("'O''Brien'");
  });

  it("renders null cells as NULL", () => {
    const { output } = buildInsertStatements(table(), { tableName: "users", dialect: "standard" });
    expect(output).toContain("(3, NULL, TRUE)");
  });

  it("quotes identifiers with backticks for MySQL", () => {
    const { output } = buildInsertStatements(table(), { tableName: "users", dialect: "mysql" });
    expect(output).toContain("INSERT INTO `users` (`id`, `name`, `active`)");
  });

  it("escapes backslashes for MySQL string literals", () => {
    const withBackslash = table({ rows: [[1, "path\\to\\file", true]] });
    const { output } = buildInsertStatements(withBackslash, { tableName: "files", dialect: "mysql" });
    expect(output).toContain("'path\\\\to\\\\file'");
  });

  it("neutralizes a quote character embedded in a crafted table name", () => {
    const { output } = buildInsertStatements(table({ rows: [] }), {
      tableName: `evil"; DROP TABLE users; --`,
      dialect: "standard",
    });
    // The embedded quote is escaped by doubling, not left able to terminate the identifier early.
    expect(output).not.toContain('evil"; DROP');
  });

  it("warns when the table name isn't a plain identifier, but still produces valid output", () => {
    const { output, warnings } = buildInsertStatements(table({ rows: [] }), {
      tableName: "my table",
      dialect: "standard",
    });
    expect(warnings.some((w) => w.includes("my table"))).toBe(true);
    expect(output).toBeDefined();
  });

  it("defaults to my_table when the table name is blank", () => {
    const { output } = buildInsertStatements(table({ rows: [[1, "Alice", true]] }), {
      tableName: "  ",
      dialect: "standard",
    });
    expect(output).toContain('"my_table"');
  });

  it("throws a ProcessingError when the CSV has no columns", () => {
    expect(() => buildInsertStatements(table({ columns: [], rows: [] }), { tableName: "t", dialect: "standard" })).toThrow(
      ProcessingError
    );
  });

  it("preserves the source table's warnings", () => {
    const { warnings } = buildInsertStatements(table({ warnings: ["some row had extra columns"] }), {
      tableName: "users",
      dialect: "standard",
    });
    expect(warnings).toContain("some row had extra columns");
  });
});

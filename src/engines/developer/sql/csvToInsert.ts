import { ProcessingError } from "@/lib/errors/ProcessingError";
import type { CellValue, NormalizedTable } from "@/engines/spreadsheet/types";

export const INSERT_SQL_DIALECTS = ["standard", "mysql", "postgresql", "sqlite"] as const;
export type InsertSqlDialect = (typeof INSERT_SQL_DIALECTS)[number];

export const INSERT_SQL_DIALECT_LABELS: Record<InsertSqlDialect, string> = {
  standard: "Standard SQL",
  mysql: "MySQL",
  postgresql: "PostgreSQL",
  sqlite: "SQLite",
};

export interface CsvToInsertOptions {
  tableName: string;
  dialect: InsertSqlDialect;
}

export interface FormatResult {
  output: string;
  warnings: string[];
}

const IDENTIFIER_QUOTE: Record<InsertSqlDialect, string> = {
  standard: '"',
  postgresql: '"',
  sqlite: '"',
  mysql: "`",
};

/** Doubling the delimiter is the standard SQL escape for a quote character embedded in an identifier — this is what makes a crafted CSV header safe to splice into the statement. */
function quoteIdentifier(name: string, dialect: InsertSqlDialect): string {
  const quote = IDENTIFIER_QUOTE[dialect];
  return `${quote}${name.replaceAll(quote, quote + quote)}${quote}`;
}

function escapeStringLiteral(value: string, dialect: InsertSqlDialect): string {
  let escaped = value.replaceAll("'", "''");
  if (dialect === "mysql") {
    // MySQL's default (non-ANSI-quotes) mode also treats backslash as an escape character inside string literals.
    escaped = escaped.replaceAll("\\", "\\\\");
  }
  return `'${escaped}'`;
}

function formatValue(value: CellValue, dialect: InsertSqlDialect): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (value instanceof Date) return escapeStringLiteral(value.toISOString(), dialect);
  return escapeStringLiteral(String(value), dialect);
}

function isPlainIdentifier(name: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name);
}

/** One `INSERT INTO ... VALUES (...);` statement per row — never a multi-row VALUES list, so the output stays valid and readable regardless of row count or dialect. */
export function buildInsertStatements(table: NormalizedTable, options: CsvToInsertOptions): FormatResult {
  if (table.columns.length === 0) {
    throw new ProcessingError("MALFORMED_FILE", "This CSV has no columns to build an INSERT statement from.");
  }

  const tableName = options.tableName.trim() || "my_table";
  const warnings = [...table.warnings];
  if (!isPlainIdentifier(tableName)) {
    warnings.push(
      `"${tableName}" isn't a plain SQL identifier (letters, digits, underscores, not starting with a digit) — it's still quoted and escaped safely, but double-check it's what you intended.`
    );
  }

  const quotedTable = quoteIdentifier(tableName, options.dialect);
  const quotedColumns = table.columns.map((column) => quoteIdentifier(column, options.dialect)).join(", ");

  const statements = table.rows.map((row) => {
    const values = row.map((cell) => formatValue(cell, options.dialect)).join(", ");
    return `INSERT INTO ${quotedTable} (${quotedColumns}) VALUES (${values});`;
  });

  return { output: statements.join("\n"), warnings };
}

import { ProcessingError } from "@/lib/errors/ProcessingError";

/** A curated subset of `sql-formatter`'s supported dialects — enough coverage without overwhelming the UI with 20+ options. */
export const SQL_DIALECTS = ["sql", "mysql", "postgresql", "sqlite", "mariadb", "transactsql"] as const;
export type SqlDialect = (typeof SQL_DIALECTS)[number];

export const SQL_DIALECT_LABELS: Record<SqlDialect, string> = {
  sql: "Standard SQL",
  mysql: "MySQL",
  postgresql: "PostgreSQL",
  sqlite: "SQLite",
  mariadb: "MariaDB",
  transactsql: "SQL Server (T-SQL)",
};

export interface FormatResult {
  output: string;
}

/**
 * `sql-formatter` only reformats whitespace/casing/indentation of the text
 * it's given — it never parses SQL into an execution plan or runs it. This
 * is a pure client-side text transform, same as the JSON/XML formatters.
 */
export async function formatSqlText(text: string, dialect: SqlDialect = "sql"): Promise<FormatResult> {
  const { format } = await import("sql-formatter");
  try {
    return { output: format(text, { language: dialect, keywordCase: "upper" }) };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Could not format this SQL.";
    throw new ProcessingError("MALFORMED_FILE", `Could not format this SQL: ${message}`);
  }
}

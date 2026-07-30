import { describe, expect, it } from "vitest";
import { formatSqlText } from "@/engines/developer/sql/formatSql";
import { ProcessingError } from "@/lib/errors/ProcessingError";

describe("formatSqlText", () => {
  it("reformats a compact query onto multiple readable lines", async () => {
    const { output } = await formatSqlText("select id,name from users where active=1;");
    expect(output).toContain("SELECT");
    expect(output).toContain("FROM");
    expect(output).toContain("WHERE");
    expect(output.split("\n").length).toBeGreaterThan(1);
  });

  it("applies dialect-specific syntax without throwing", async () => {
    const { output } = await formatSqlText("SELECT TOP 5 * FROM users", "transactsql");
    expect(output).toContain("SELECT");
  });

  it("never executes the SQL — it only reformats text", async () => {
    const dangerous = "DROP TABLE users; DELETE FROM accounts;";
    const { output } = await formatSqlText(dangerous);
    // Formatting only changes whitespace/casing — the statements themselves survive verbatim as text.
    expect(output).toContain("DROP TABLE");
    expect(output).toContain("DELETE FROM");
  });

  it("throws a ProcessingError for unformattable input", async () => {
    await expect(formatSqlText("SELECT * FROM (((")).rejects.toThrow(ProcessingError);
  });
});

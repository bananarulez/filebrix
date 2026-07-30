import { describe, expect, it, vi } from "vitest";
import { exceedsEditorRowCap, MAX_EDITOR_ROWS, parquetSessionToTable } from "@/engines/parquet/tableBridge";
import type { ParquetSession } from "@/engines/parquet/types";

function makeSession(overrides: Partial<ParquetSession> = {}): ParquetSession {
  return {
    summary: { rowCount: 2, columns: [{ name: "id", type: "BIGINT" }, { name: "name", type: "VARCHAR" }] },
    getPage: vi.fn(),
    getAllRows: vi.fn().mockResolvedValue([
      { id: BigInt(1), name: "Alice" },
      { id: BigInt(2), name: null },
    ]),
    analyze: vi.fn(),
    close: vi.fn(),
    ...overrides,
  };
}

describe("exceedsEditorRowCap", () => {
  it("is false at or under the cap", () => {
    expect(exceedsEditorRowCap(makeSession({ summary: { rowCount: MAX_EDITOR_ROWS, columns: [] } }))).toBe(false);
  });

  it("is true just over the cap", () => {
    expect(exceedsEditorRowCap(makeSession({ summary: { rowCount: MAX_EDITOR_ROWS + 1, columns: [] } }))).toBe(true);
  });
});

describe("parquetSessionToTable", () => {
  it("maps columns and converts bigint cells to number", async () => {
    const table = await parquetSessionToTable(makeSession());
    expect(table.columns).toEqual(["id", "name"]);
    expect(table.rows).toEqual([
      [1, "Alice"],
      [2, null],
    ]);
    expect(table.warnings).toEqual([]);
  });

  it("passes Date cells through unchanged", async () => {
    const when = new Date("2024-01-01T00:00:00Z");
    const session = makeSession({
      summary: { rowCount: 1, columns: [{ name: "at", type: "TIMESTAMP" }] },
      getAllRows: vi.fn().mockResolvedValue([{ at: when }]),
    });
    const table = await parquetSessionToTable(session);
    expect(table.rows).toEqual([[when]]);
  });

  it("stringifies nested struct/list/map values and records a warning", async () => {
    const session = makeSession({
      summary: { rowCount: 2, columns: [{ name: "tags", type: "LIST(VARCHAR)" }] },
      getAllRows: vi.fn().mockResolvedValue([{ tags: ["a", "b"] }, { tags: { x: 1 } }]),
    });
    const table = await parquetSessionToTable(session);
    expect(table.rows).toEqual([[JSON.stringify(["a", "b"])], [JSON.stringify({ x: 1 })]]);
    expect(table.warnings).toEqual(["2 nested (struct/list/map) values were converted to a JSON text string."]);
  });

  it("uses singular phrasing for exactly one nested value", async () => {
    const session = makeSession({
      summary: { rowCount: 1, columns: [{ name: "tags", type: "LIST(VARCHAR)" }] },
      getAllRows: vi.fn().mockResolvedValue([{ tags: ["a"] }]),
    });
    const table = await parquetSessionToTable(session);
    expect(table.warnings).toEqual(["1 nested (struct/list/map) value was converted to a JSON text string."]);
  });
});

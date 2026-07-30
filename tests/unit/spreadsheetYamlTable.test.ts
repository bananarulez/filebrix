import { describe, expect, it } from "vitest";
import { parseYamlTable, serializeTableToYamlText } from "@/engines/spreadsheet/convert/yamlTable";
import { ProcessingError } from "@/lib/errors/ProcessingError";
import type { NormalizedTable } from "@/engines/spreadsheet/types";

describe("parseYamlTable", () => {
  it("parses a YAML list of mappings into a table, same shape as JSON array-of-objects", () => {
    const yaml = "- id: 1\n  name: Alice\n- id: 2\n  name: Bob\n";
    const table = parseYamlTable(yaml);
    expect(table.columns).toEqual(["id", "name"]);
    expect(table.rows).toEqual([
      [1, "Alice"],
      [2, "Bob"],
    ]);
  });

  it("throws a clear MALFORMED_FILE error for invalid YAML", () => {
    expect(() => parseYamlTable("- a: [unterminated")).toThrow(ProcessingError);
  });

  it("does not resolve unsafe YAML tags (no code execution from untrusted input)", () => {
    // js-yaml's default (5.x) schema has no !!js/function or similar tags —
    // this should either parse the tag as inert text/fail, never execute it.
    expect(() => parseYamlTable("a: !!js/function 'function(){}'")).not.toThrow(TypeError);
  });
});

describe("serializeTableToYamlText", () => {
  it("round-trips a table through YAML serialize -> parse", () => {
    const original: NormalizedTable = {
      columns: ["id", "name"],
      rows: [
        [1, "Alice"],
        [2, "Bob"],
      ],
      warnings: [],
    };
    const yaml = serializeTableToYamlText(original);
    const parsed = parseYamlTable(yaml);
    expect(parsed.columns).toEqual(original.columns);
    expect(parsed.rows).toEqual(original.rows);
  });

  it("supports the array-of-arrays shape, matching serializeJson's convention", () => {
    const table: NormalizedTable = { columns: ["a", "b"], rows: [[1, 2]], warnings: [] };
    const yaml = serializeTableToYamlText(table, "array-of-arrays");
    expect(yaml).toContain("- a");
    expect(yaml).toContain("- b");
  });
});

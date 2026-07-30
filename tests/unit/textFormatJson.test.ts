import { describe, expect, it } from "vitest";
import { formatJson, minifyJson } from "@/engines/spreadsheet/format/json";
import { ProcessingError } from "@/lib/errors/ProcessingError";

describe("formatJson", () => {
  it("pretty-prints with the default 2-space indent", () => {
    const { output } = formatJson('{"a":1,"b":[1,2]}');
    expect(output).toBe('{\n  "a": 1,\n  "b": [\n    1,\n    2\n  ]\n}');
  });

  it("supports a custom indent size", () => {
    const { output } = formatJson('{"a":1}', 4);
    expect(output).toBe('{\n    "a": 1\n}');
  });

  it("supports tab indentation", () => {
    const { output } = formatJson('{"a":1}', "\t");
    expect(output).toBe('{\n\t"a": 1\n}');
  });

  it("preserves special characters", () => {
    const { output } = formatJson('{"name":"Café 🎉","note":"line1\\nline2"}');
    expect(JSON.parse(output)).toEqual({ name: "Café 🎉", note: "line1\nline2" });
  });

  it("throws a clear MALFORMED_FILE error for invalid JSON, doubling as the validator", () => {
    try {
      formatJson("{not valid json");
      throw new Error("expected formatJson to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(ProcessingError);
      expect((error as ProcessingError).code).toBe("MALFORMED_FILE");
    }
  });
});

describe("minifyJson", () => {
  it("removes insignificant whitespace", () => {
    const { output } = minifyJson('{\n  "a": 1,\n  "b": [1, 2]\n}');
    expect(output).toBe('{"a":1,"b":[1,2]}');
  });

  it("throws for invalid JSON", () => {
    expect(() => minifyJson("not json")).toThrow(ProcessingError);
  });
});

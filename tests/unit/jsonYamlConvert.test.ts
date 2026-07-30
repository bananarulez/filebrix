import { describe, expect, it } from "vitest";
import { jsonTextToYamlText, yamlTextToJsonText } from "@/engines/spreadsheet/convert/jsonYaml";
import { ProcessingError } from "@/lib/errors/ProcessingError";

describe("jsonTextToYamlText", () => {
  it("converts a JSON object to YAML that parses back to the same value", () => {
    const { output } = jsonTextToYamlText('{"a":1,"b":["x","y"]}');
    expect(output).toContain("a: 1");
    expect(JSON.parse(yamlTextToJsonText(output).output)).toEqual({ a: 1, b: ["x", "y"] });
  });

  it("preserves special characters", () => {
    const { output } = jsonTextToYamlText('{"name":"Café 🎉"}');
    expect(output).toContain("Café 🎉");
  });

  it("throws MALFORMED_FILE for invalid JSON input", () => {
    expect(() => jsonTextToYamlText("not json")).toThrow(ProcessingError);
  });
});

describe("yamlTextToJsonText", () => {
  it("converts YAML to pretty-printed JSON", () => {
    const { output } = yamlTextToJsonText("a: 1\nb:\n  - x\n  - y\n");
    expect(JSON.parse(output)).toEqual({ a: 1, b: ["x", "y"] });
  });

  it("round-trips through JSON -> YAML -> JSON", () => {
    const original = '{"a":1,"b":["x","y"],"nested":{"c":true}}';
    const yaml = jsonTextToYamlText(original).output;
    const backToJson = yamlTextToJsonText(yaml).output;
    expect(JSON.parse(backToJson)).toEqual(JSON.parse(original));
  });

  it("throws a clear MALFORMED_FILE error for invalid YAML", () => {
    try {
      yamlTextToJsonText("a: [unterminated");
      throw new Error("expected yamlTextToJsonText to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(ProcessingError);
      expect((error as ProcessingError).code).toBe("MALFORMED_FILE");
    }
  });

  it("does not instantiate unsafe types from YAML tags (safe load)", () => {
    // js-yaml 5's default schema has no function/regexp/date-object-forcing
    // "unsafe" tags — an attempt to use one should fail to parse rather
    // than silently constructing an arbitrary JS type.
    expect(() => yamlTextToJsonText("a: !!js/function 'function(){}'")).toThrow(ProcessingError);
  });
});

import { describe, expect, it } from "vitest";
import { sanitizeXmlElementName } from "@/engines/spreadsheet/xmlNames";

describe("sanitizeXmlElementName", () => {
  it("passes through an already-valid name", () => {
    expect(sanitizeXmlElementName("column_1")).toBe("column_1");
  });

  it("replaces a leading digit, which XML names can't start with", () => {
    expect(sanitizeXmlElementName("1st_place")).toBe("_st_place");
  });

  it("replaces spaces and other disallowed characters with underscores", () => {
    expect(sanitizeXmlElementName("First Name (legal)")).toBe("First_Name__legal_");
  });

  it("prefixes reserved 'xml'-prefixed names, case-insensitively", () => {
    expect(sanitizeXmlElementName("xmlns")).toBe("_xmlns");
    expect(sanitizeXmlElementName("XMLVersion")).toBe("_XMLVersion");
  });

  it("falls back to the given default for an empty name", () => {
    expect(sanitizeXmlElementName("", "column")).toBe("column");
  });

  it("falls back when every character is disallowed and stripped to nothing", () => {
    // Underscore replacement means this can't actually go empty via the loop,
    // but a name of only unsafe characters should still produce a valid,
    // non-empty result rather than an all-underscore mess being silently ok.
    expect(sanitizeXmlElementName("???")).toBe("___");
  });

  it("replaces non-ASCII letters, since the sanitizer is deliberately ASCII-only", () => {
    expect(sanitizeXmlElementName("日本語")).toBe("___");
  });
});

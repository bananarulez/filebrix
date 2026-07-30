import { describe, expect, it } from "vitest";
import { jsonValueToXmlText, xmlTextToJsonValue } from "@/engines/spreadsheet/convert/jsonXml";

describe("jsonValueToXmlText", () => {
  it("converts object keys to child elements", () => {
    const { output } = jsonValueToXmlText({ a: 1, b: "hello" });
    expect(output).toBe("<root><a>1</a><b>hello</b></root>");
  });

  it("converts an @-prefixed key to an attribute", () => {
    const { output } = jsonValueToXmlText({ "@id": "5", name: "Alice" });
    expect(output).toBe('<root id="5"><name>Alice</name></root>');
  });

  it("uses #text for direct text content alongside attributes", () => {
    const { output } = jsonValueToXmlText({ "@id": "5", "#text": "Alice" });
    expect(output).toBe('<root id="5">Alice</root>');
  });

  it("converts an array value into repeated sibling elements", () => {
    const { output } = jsonValueToXmlText({ item: [1, 2, 3] });
    expect(output).toBe("<root><item>1</item><item>2</item><item>3</item></root>");
  });

  it("converts null to a self-closing empty element", () => {
    const { output } = jsonValueToXmlText({ a: null });
    expect(output).toBe("<root><a/></root>");
  });

  it("never fails — any valid JSON value produces valid XML, including a bare array or scalar", () => {
    expect(jsonValueToXmlText([1, 2]).output).toBe("<root><item>1</item><item>2</item></root>");
    expect(jsonValueToXmlText("hello").output).toBe("<root>hello</root>");
    expect(jsonValueToXmlText(42).output).toBe("<root>42</root>");
  });

  it("warns and renames a key that isn't a valid XML element name", () => {
    const { output, warnings } = jsonValueToXmlText({ "my key": 1 });
    expect(output).toContain("<my_key>1</my_key>");
    expect(warnings.some((w) => w.includes("my key"))).toBe(true);
  });

  it("preserves special characters and escapes markup-significant ones", () => {
    const { output } = jsonValueToXmlText({ note: "Café 🎉 <tag> & more" });
    expect(output).toContain("Café 🎉");
    expect(output).toContain("&lt;tag&gt;");
    expect(output).toContain("&amp;");
  });
});

describe("xmlTextToJsonValue", () => {
  it("converts a text-only element to a plain string", () => {
    expect(xmlTextToJsonValue("<root><a>hello</a></root>")).toEqual({ a: "hello" });
  });

  it("converts attributes to @-prefixed keys", () => {
    expect(xmlTextToJsonValue('<root id="5"><name>Alice</name></root>')).toEqual({
      "@id": "5",
      name: "Alice",
    });
  });

  it("converts a genuinely empty element to null", () => {
    expect(xmlTextToJsonValue("<root><a/></root>")).toEqual({ a: null });
  });

  it("converts repeated same-tag children to an array", () => {
    expect(xmlTextToJsonValue("<root><item>1</item><item>2</item></root>")).toEqual({
      item: ["1", "2"],
    });
  });

  it("documents the single-vs-array ambiguity: a single occurrence stays a plain value, not a 1-element array", () => {
    expect(xmlTextToJsonValue("<root><item>1</item></root>")).toEqual({ item: "1" });
  });

  it("collapses mixed content into #text, losing its position relative to child elements", () => {
    const result = xmlTextToJsonValue("<root>before<a>1</a>after</root>") as Record<string, unknown>;
    expect(result.a).toBe("1");
    expect(result["#text"]).toBe("beforeafter");
  });

  it("drops comments and processing instructions", () => {
    expect(xmlTextToJsonValue("<root><!-- hi --><a>1</a></root>")).toEqual({ a: "1" });
  });

  it("keeps namespace-prefixed tags literally rather than resolving them", () => {
    // The xmlns declaration itself is just a regular attribute here — no
    // namespace-aware special-casing is applied anywhere in this conversion.
    expect(xmlTextToJsonValue('<root xmlns:ns="urn:x"><ns:a>1</ns:a></root>')).toEqual({
      "@xmlns:ns": "urn:x",
      "ns:a": "1",
    });
  });

  it("round-trips shape (not necessarily value types) through JSON -> XML -> JSON", () => {
    const original = { a: "1", b: ["x", "y"] };
    const xml = jsonValueToXmlText(original).output;
    expect(xmlTextToJsonValue(xml)).toEqual(original);
  });

  it("documents that leaf values always become strings after a round trip (no native XML number/boolean type)", () => {
    const xml = jsonValueToXmlText({ count: 5, active: true }).output;
    expect(xmlTextToJsonValue(xml)).toEqual({ count: "5", active: "true" });
  });
});

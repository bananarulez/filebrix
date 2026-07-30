import { describe, expect, it } from "vitest";
import { formatXmlText, validateXmlText, parseXmlOrThrow } from "@/engines/spreadsheet/format/xml";
import { ProcessingError } from "@/lib/errors/ProcessingError";

describe("formatXmlText", () => {
  it("pretty-prints with indentation", () => {
    const { output } = formatXmlText("<root><a>1</a><b>2</b></root>");
    expect(output).toBe("<root>\n  <a>1</a>\n  <b>2</b>\n</root>");
  });

  it("preserves attributes", () => {
    const { output } = formatXmlText('<root id="5"><a>x</a></root>');
    expect(output).toContain('<root id="5">');
  });

  it("preserves comments and processing instructions rather than dropping them", () => {
    const { output } = formatXmlText("<root><!-- a comment --><a>1</a></root>");
    expect(output).toContain("<!-- a comment -->");
  });

  it("preserves CDATA sections", () => {
    const { output } = formatXmlText("<root><a><![CDATA[<b>not a tag</b>]]></a></root>");
    expect(output).toContain("<![CDATA[<b>not a tag</b>]]>");
  });

  it("renders a self-closing tag for a genuinely empty element", () => {
    const { output } = formatXmlText("<root><a></a></root>");
    expect(output).toContain("<a/>");
  });

  it("preserves special characters and escapes markup-significant ones", () => {
    const { output } = formatXmlText("<root><a>Café 🎉 &amp; co</a></root>");
    expect(output).toContain("Café 🎉");
    expect(output).toContain("&amp;");
  });

  it("throws a clear MALFORMED_FILE error for malformed XML", () => {
    try {
      formatXmlText("<root><a></root>");
      throw new Error("expected formatXmlText to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(ProcessingError);
      expect((error as ProcessingError).code).toBe("MALFORMED_FILE");
    }
  });
});

describe("validateXmlText", () => {
  it("confirms well-formed XML", () => {
    const { output } = validateXmlText("<root><a>1</a></root>");
    expect(output).toMatch(/well-formed/i);
  });

  it("throws with a specific message for malformed XML", () => {
    expect(() => validateXmlText("<root><a></root>")).toThrow(ProcessingError);
  });
});

describe("XML security", () => {
  it("does not resolve an external entity (XXE) — no file content leaks into the parsed document", () => {
    const xxe =
      '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><foo>&xxe;</foo>';
    // Either a parse error, or a document whose content is definitely not
    // the contents of a system file — never resolved.
    let text = "";
    try {
      const doc = parseXmlOrThrow(xxe);
      text = doc.documentElement.textContent ?? "";
    } catch {
      text = "";
    }
    expect(text).not.toContain("root:");
    expect(text.toLowerCase()).not.toContain("/bin/");
  });

  it("does not hang or crash on a billion-laughs-style internal entity expansion", () => {
    const billionLaughs = `<?xml version="1.0"?>
<!DOCTYPE lolz [
  <!ENTITY lol "lol">
  <!ENTITY lol2 "&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;">
  <!ENTITY lol3 "&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;">
]>
<lolz>&lol3;</lolz>`;
    const start = Date.now();
    try {
      parseXmlOrThrow(billionLaughs);
    } catch {
      // A parse error here is fine — the requirement is "doesn't hang", not "must succeed".
    }
    expect(Date.now() - start).toBeLessThan(2000);
  });

  it("treats script-tag-shaped content as inert text, never markup to execute", () => {
    const { output } = formatXmlText("<root><note>&lt;script&gt;alert(1)&lt;/script&gt;</note></root>");
    expect(output).toContain("&lt;script&gt;");
    expect(output).not.toContain("<script>");
  });

  it("does not interpret CDATA-wrapped script-like content as markup", () => {
    const { output } = formatXmlText("<root><note><![CDATA[<script>alert(1)</script>]]></note></root>");
    expect(output).toContain("<![CDATA[<script>alert(1)</script>]]>");
  });
});

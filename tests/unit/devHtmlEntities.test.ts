import { describe, expect, it } from "vitest";
import { decodeHtmlEntities, encodeHtmlEntities } from "@/engines/developer/htmlEntities";

describe("encodeHtmlEntities", () => {
  it("encodes the 5 predefined characters", () => {
    expect(encodeHtmlEntities(`<a href="x">Tom & Jerry's</a>`).output).toBe(
      "&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&#39;s&lt;/a&gt;"
    );
  });

  it("escapes & first so it never double-encodes the entities it just introduced", () => {
    expect(encodeHtmlEntities("<").output).toBe("&lt;");
  });

  it("leaves plain text untouched", () => {
    expect(encodeHtmlEntities("hello world").output).toBe("hello world");
  });
});

describe("decodeHtmlEntities", () => {
  it("round-trips text through encode then decode", () => {
    const text = `<a href="x">Tom & Jerry's</a>`;
    expect(decodeHtmlEntities(encodeHtmlEntities(text).output).output).toBe(text);
  });

  it("decodes decimal and hex numeric character references", () => {
    expect(decodeHtmlEntities("&#39;&#x27;").output).toBe("''");
  });

  it("decodes a non-ASCII code point via a numeric reference", () => {
    expect(decodeHtmlEntities("caf&#233;").output).toBe("café");
  });

  it("leaves an unrecognized entity-like sequence untouched", () => {
    expect(decodeHtmlEntities("&copy; &nbsp;").output).toBe("&copy; &nbsp;");
  });
});

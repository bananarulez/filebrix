import { describe, expect, it } from "vitest";
import { escapeUnicode, unescapeUnicode } from "@/engines/developer/unicodeEscape";

describe("escapeUnicode", () => {
  it("escapes non-ASCII characters, leaving ASCII untouched", () => {
    expect(escapeUnicode("café").output).toBe("caf\\u00e9");
  });

  it("escapes an astral character (emoji) as a surrogate pair", () => {
    expect(escapeUnicode("😀").output).toBe("\\ud83d\\ude00");
  });

  it("leaves plain ASCII text untouched", () => {
    expect(escapeUnicode("hello world").output).toBe("hello world");
  });

  it("handles empty input", () => {
    expect(escapeUnicode("").output).toBe("");
  });
});

describe("unescapeUnicode", () => {
  it("round-trips text through escape then unescape", () => {
    const text = "café 日本語 😀";
    expect(unescapeUnicode(escapeUnicode(text).output).output).toBe(text);
  });

  it("is case-insensitive for hex digits", () => {
    expect(unescapeUnicode("\\u00E9").output).toBe("é");
  });

  it("leaves non-escape backslash sequences untouched", () => {
    expect(unescapeUnicode("a\\nb").output).toBe("a\\nb");
  });
});

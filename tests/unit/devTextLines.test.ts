import { describe, expect, it } from "vitest";
import {
  normalizeLineEndings,
  removeDuplicateLines,
  removeEmptyLines,
  reverseLines,
  sortLines,
  trimWhitespace,
} from "@/engines/developer/textLines";

describe("removeEmptyLines", () => {
  it("removes blank and whitespace-only lines, keeping the rest in order", () => {
    expect(removeEmptyLines("a\n\nb\n   \nc").output).toBe("a\nb\nc");
  });

  it("handles input with no empty lines", () => {
    expect(removeEmptyLines("a\nb\nc").output).toBe("a\nb\nc");
  });

  it("handles empty input", () => {
    expect(removeEmptyLines("").output).toBe("");
  });
});

describe("removeDuplicateLines", () => {
  it("keeps the first occurrence and preserves original order", () => {
    expect(removeDuplicateLines("b\na\nb\nc\na").output).toBe("b\na\nc");
  });

  it("is case-sensitive", () => {
    expect(removeDuplicateLines("Line\nline\nLine").output).toBe("Line\nline");
  });
});

describe("sortLines", () => {
  it("sorts ascending (A→Z)", () => {
    expect(sortLines("banana\napple\ncherry", "asc").output).toBe("apple\nbanana\ncherry");
  });

  it("sorts descending (Z→A)", () => {
    expect(sortLines("banana\napple\ncherry", "desc").output).toBe("cherry\nbanana\napple");
  });
});

describe("reverseLines", () => {
  it("reverses line order without altering line contents", () => {
    expect(reverseLines("first\nsecond\nthird").output).toBe("third\nsecond\nfirst");
  });
});

describe("trimWhitespace", () => {
  it("trims leading/trailing whitespace per line, leaving internal spacing alone", () => {
    expect(trimWhitespace("  a b  \n\tc\t\n  d").output).toBe("a b\nc\nd");
  });
});

describe("normalizeLineEndings", () => {
  it("converts CRLF to LF", () => {
    expect(normalizeLineEndings("a\r\nb\r\nc", "lf").output).toBe("a\nb\nc");
  });

  it("converts LF to CRLF", () => {
    expect(normalizeLineEndings("a\nb\nc", "crlf").output).toBe("a\r\nb\r\nc");
  });

  it("converts mixed line endings to CR", () => {
    expect(normalizeLineEndings("a\nb\r\nc\rd", "cr").output).toBe("a\rb\rc\rd");
  });
});

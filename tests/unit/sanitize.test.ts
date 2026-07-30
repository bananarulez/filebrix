import { describe, expect, it } from "vitest";
import { sanitizeHtml, sanitizeText } from "@/lib/security/sanitize";

describe("sanitizeHtml", () => {
  it("strips script tags from untrusted content", () => {
    const dirty = "<p>hello</p><script>alert(1)</script>";
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain("<script>");
    expect(clean).toContain("hello");
  });
});

describe("sanitizeText", () => {
  it("removes control characters", () => {
    const withNullByte = `abc${String.fromCharCode(0)}def`;
    expect(sanitizeText(withNullByte)).toBe("abcdef");
  });

  it("keeps normal whitespace intact", () => {
    expect(sanitizeText("line1\nline2\ttabbed")).toBe("line1\nline2\ttabbed");
  });
});

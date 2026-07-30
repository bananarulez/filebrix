import { describe, expect, it } from "vitest";
import { sanitizeFilename } from "@/lib/security/filenames";

describe("sanitizeFilename", () => {
  it("strips path separators and keeps just the base name", () => {
    expect(sanitizeFilename("../../etc/passwd")).toBe("passwd");
  });

  it("replaces unsafe characters", () => {
    expect(sanitizeFilename("report:2024?.csv")).toBe("report_2024_.csv");
  });

  it("falls back to a default name when nothing safe remains", () => {
    expect(sanitizeFilename("///")).toBe("download");
  });

  it("strips path separators from a Windows-style backslash traversal, not just forward slashes", () => {
    expect(sanitizeFilename("..\\..\\windows\\system32\\evil.dll")).toBe("evil.dll");
  });

  it("replaces control characters, including a null byte, rather than passing them through", () => {
    expect(sanitizeFilename("evil\0name.txt")).toBe("evil_name.txt");
    expect(sanitizeFilename("evil\nname.txt")).toBe("evil_name.txt");
    expect(sanitizeFilename("evil\tname.txt")).toBe("evil_name.txt");
  });

  it("preserves Unicode filenames unchanged", () => {
    expect(sanitizeFilename("日本語ファイル.csv")).toBe("日本語ファイル.csv");
    expect(sanitizeFilename("café-résumé.pdf")).toBe("café-résumé.pdf");
  });

  it("falls back to the default name for an empty string", () => {
    expect(sanitizeFilename("")).toBe("download");
  });

  it("trims whitespace-only names down to the fallback", () => {
    expect(sanitizeFilename("   ")).toBe("download");
  });
});

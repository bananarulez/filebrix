import { describe, expect, it } from "vitest";
import { decodeBase64, encodeBase64 } from "@/engines/developer/base64";
import { ProcessingError } from "@/lib/errors/ProcessingError";

describe("encodeBase64", () => {
  it("encodes plain ASCII text", () => {
    expect(encodeBase64("hello").output).toBe("aGVsbG8=");
  });

  it("round-trips Unicode text (accents, CJK, emoji)", () => {
    const text = "Café 日本語 🎉";
    const { output } = encodeBase64(text);
    expect(decodeBase64(output).output).toBe(text);
  });

  it("handles empty input", () => {
    expect(encodeBase64("").output).toBe("");
  });
});

describe("decodeBase64", () => {
  it("decodes standard Base64", () => {
    expect(decodeBase64("aGVsbG8=").output).toBe("hello");
  });

  it("tolerates whitespace/newlines in the input", () => {
    expect(decodeBase64("aGVs\nbG8=  ").output).toBe("hello");
  });

  it("throws MALFORMED_FILE for text outside the Base64 alphabet", () => {
    expect(() => decodeBase64("not base64!!! @#$")).toThrow(ProcessingError);
    try {
      decodeBase64("not base64!!! @#$");
    } catch (error) {
      expect((error as ProcessingError).code).toBe("MALFORMED_FILE");
    }
  });
});

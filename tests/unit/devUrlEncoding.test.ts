import { describe, expect, it } from "vitest";
import { decodeUrlText, encodeUrlText } from "@/engines/developer/urlEncoding";
import { ProcessingError } from "@/lib/errors/ProcessingError";

describe("encodeUrlText", () => {
  it("percent-encodes reserved characters", () => {
    expect(encodeUrlText("a b&c=d").output).toBe("a%20b%26c%3Dd");
  });

  it("leaves unreserved characters untouched", () => {
    expect(encodeUrlText("abc123-_.~").output).toBe("abc123-_.~");
  });
});

describe("decodeUrlText", () => {
  it("decodes a percent-encoded string", () => {
    expect(decodeUrlText("a%20b%26c%3Dd").output).toBe("a b&c=d");
  });

  it("round-trips arbitrary text", () => {
    const text = "hello world & friends = 100%";
    expect(decodeUrlText(encodeUrlText(text).output).output).toBe(text);
  });

  it("throws MALFORMED_FILE for a malformed % sequence", () => {
    expect(() => decodeUrlText("100% off")).toThrow(ProcessingError);
    try {
      decodeUrlText("100% off");
    } catch (error) {
      expect((error as ProcessingError).code).toBe("MALFORMED_FILE");
    }
  });
});

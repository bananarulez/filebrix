import { describe, expect, it } from "vitest";
import { convertCase } from "@/engines/developer/caseConvert";

describe("convertCase", () => {
  it("converts to UPPERCASE", () => {
    expect(convertCase("Hello World", "upper").output).toBe("HELLO WORLD");
  });

  it("converts to lowercase", () => {
    expect(convertCase("Hello World", "lower").output).toBe("hello world");
  });

  it("converts to Title Case", () => {
    expect(convertCase("the quick brown fox", "title").output).toBe("The Quick Brown Fox");
  });

  it("converts to Sentence case across multiple sentences", () => {
    expect(convertCase("hello world. how ARE you? i am FINE!", "sentence").output).toBe(
      "Hello world. How are you? I am fine!"
    );
  });

  it("handles empty input for every mode", () => {
    expect(convertCase("", "upper").output).toBe("");
    expect(convertCase("", "title").output).toBe("");
    expect(convertCase("", "sentence").output).toBe("");
  });
});

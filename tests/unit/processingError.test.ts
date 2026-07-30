import { describe, expect, it } from "vitest";
import { ProcessingError } from "@/lib/errors/ProcessingError";

describe("ProcessingError", () => {
  it("serializes across a structured-clone boundary and reconstructs", () => {
    const original = new ProcessingError("MALFORMED_FILE", "The file could not be parsed.");
    const serialized = JSON.parse(JSON.stringify(original.toJSON()));

    expect(ProcessingError.isSerializedProcessingError(serialized)).toBe(true);

    const restored = ProcessingError.fromSerialized(serialized);
    expect(restored).toBeInstanceOf(ProcessingError);
    expect(restored.code).toBe("MALFORMED_FILE");
    expect(restored.message).toBe("The file could not be parsed.");
  });

  it("rejects values that aren't a serialized ProcessingError", () => {
    expect(ProcessingError.isSerializedProcessingError({ message: "plain error" })).toBe(false);
    expect(ProcessingError.isSerializedProcessingError(null)).toBe(false);
  });
});

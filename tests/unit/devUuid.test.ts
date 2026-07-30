import { describe, expect, it } from "vitest";
import { generateUuids } from "@/engines/developer/uuid";

const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe("generateUuids", () => {
  it("generates the requested number of valid v4 UUIDs", () => {
    const uuids = generateUuids(10);
    expect(uuids.length).toBe(10);
    for (const uuid of uuids) {
      expect(uuid).toMatch(UUID_V4_PATTERN);
    }
  });

  it("generates unique values", () => {
    const uuids = generateUuids(100);
    expect(new Set(uuids).size).toBe(100);
  });

  it("clamps below-1 counts up to 1", () => {
    expect(generateUuids(0).length).toBe(1);
    expect(generateUuids(-5).length).toBe(1);
  });

  it("clamps counts above the maximum", () => {
    expect(generateUuids(100000).length).toBe(1000);
  });
});

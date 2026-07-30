import { describe, expect, it } from "vitest";
import { computeHashes, HASH_ALGORITHMS } from "@/engines/developer/hash";

describe("computeHashes", () => {
  it("computes every supported algorithm", async () => {
    const results = await computeHashes("hello");
    expect(results.map((r) => r.algorithm)).toEqual([...HASH_ALGORITHMS]);
  });

  it("matches known SHA-256 test vector for an empty string", async () => {
    const results = await computeHashes("");
    const sha256 = results.find((r) => r.algorithm === "SHA-256");
    expect(sha256?.hex).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  });

  it("matches known SHA-256 test vector for 'abc'", async () => {
    const results = await computeHashes("abc");
    const sha256 = results.find((r) => r.algorithm === "SHA-256");
    expect(sha256?.hex).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });

  it("produces hex digests of the correct length per algorithm", async () => {
    const results = await computeHashes("test");
    const lengths = Object.fromEntries(results.map((r) => [r.algorithm, r.hex.length]));
    expect(lengths["SHA-1"]).toBe(40);
    expect(lengths["SHA-256"]).toBe(64);
    expect(lengths["SHA-384"]).toBe(96);
    expect(lengths["SHA-512"]).toBe(128);
  });

  it("is deterministic for the same input", async () => {
    const a = await computeHashes("repeatable");
    const b = await computeHashes("repeatable");
    expect(a).toEqual(b);
  });

  it("produces different hashes for different input", async () => {
    const a = await computeHashes("input-a");
    const b = await computeHashes("input-b");
    expect(a[0].hex).not.toBe(b[0].hex);
  });
});

import { describe, expect, it } from "vitest";
import { diffText, diffJsonText, mergeDiffBlock } from "@/engines/developer/diff";

/**
 * Merging one change across, the "→ / ←" a diff viewer is expected to have.
 *
 * Asserted against the *rebuilt text* rather than against the row structure:
 * what the user gets is a textarea's new contents, and a merge that produced
 * plausible-looking rows but the wrong string would be a silent data loss on
 * something they typed by hand.
 */
describe("mergeDiffBlock", () => {
  it("copies one changed line across without touching the others", async () => {
    const left = "one\nTWO\nthree\nFOUR";
    const right = "one\ntwo\nthree\nfour";
    const outcome = await diffText(left, right);

    // Two separate changes, so merging the first must leave the second alone.
    expect(outcome.changeBlockCount).toBe(2);
    expect(mergeDiffBlock(outcome.rows, 0, "left-to-right")).toBe("one\nTWO\nthree\nfour");
    expect(mergeDiffBlock(outcome.rows, 1, "left-to-right")).toBe("one\ntwo\nthree\nFOUR");
  });

  it("merges the other way just as well", async () => {
    const left = "one\nTWO\nthree";
    const right = "one\ntwo\nthree";
    const outcome = await diffText(left, right);
    expect(mergeDiffBlock(outcome.rows, 0, "right-to-left")).toBe("one\ntwo\nthree");
  });

  it("removes lines when the block is a pure addition", async () => {
    // The right side has a line the left doesn't. Merging left→right must
    // *delete* it, not leave a blank — a row with null on the kept side is a
    // line that doesn't exist there and contributes nothing.
    const outcome = await diffText("a\nc", "a\nb\nc");
    expect(mergeDiffBlock(outcome.rows, 0, "left-to-right")).toBe("a\nc");
  });

  it("adds lines when the block is a pure deletion", async () => {
    const outcome = await diffText("a\nb\nc", "a\nc");
    expect(mergeDiffBlock(outcome.rows, 0, "left-to-right")).toBe("a\nb\nc");
  });

  it("merging every block makes the two sides identical", async () => {
    // The property that matters: applied exhaustively, this converges. Done
    // one block at a time against a re-diff, because merging renumbers the
    // blocks that remain.
    const left = "alpha\nBRAVO\ncharlie\ndelta\nECHO";
    let right = "alpha\nbravo\ncharlie\nfoxtrot";

    for (let guard = 0; guard < 10; guard++) {
      const outcome = await diffText(left, right);
      if (outcome.changeBlockCount === 0) break;
      right = mergeDiffBlock(outcome.rows, 0, "left-to-right");
    }

    expect(right).toBe(left);
    expect((await diffText(left, right)).changeBlockCount).toBe(0);
  });

  it("leaves the text untouched for a block index that doesn't exist", async () => {
    const outcome = await diffText("a\nB", "a\nb");
    expect(mergeDiffBlock(outcome.rows, 99, "left-to-right")).toBe("a\nb");
  });

  it("works on a JSON diff, which compares canonicalised text", async () => {
    // diffJsonText sorts keys and pretty-prints before diffing, so the rows —
    // and therefore anything merged out of them — are canonical JSON, not the
    // user's original formatting. Worth pinning: it means a merge reformats
    // the pane it writes into, which is surprising if you don't expect it.
    const outcome = await diffJsonText('{"b":2,"a":1}', '{"a":1,"b":3}');
    const merged = mergeDiffBlock(outcome.rows, 0, "left-to-right");

    expect(JSON.parse(merged)).toEqual({ a: 1, b: 2 });
    expect(merged).toContain("\n"); // pretty-printed, not the input's one line
  });
});

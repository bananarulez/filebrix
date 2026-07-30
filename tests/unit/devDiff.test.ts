import { describe, expect, it } from "vitest";
import { diffJsonText, diffText, renderDiffText } from "@/engines/developer/diff";
import { ProcessingError } from "@/lib/errors/ProcessingError";

describe("diffText", () => {
  it("marks unchanged, removed and added lines correctly", async () => {
    const before = "a\nb\nc";
    const after = "a\nx\nc";
    const outcome = await diffText(before, after);

    expect(outcome.lines).toEqual([
      { value: "a", added: false, removed: false },
      { value: "b", added: false, removed: true },
      { value: "x", added: true, removed: false },
      { value: "c", added: false, removed: false },
    ]);
    expect(outcome.addedCount).toBe(1);
    expect(outcome.removedCount).toBe(1);
  });

  it("reports no differences for identical text", async () => {
    const outcome = await diffText("same\ntext", "same\ntext");
    expect(outcome.addedCount).toBe(0);
    expect(outcome.removedCount).toBe(0);
    expect(outcome.lines.every((line) => !line.added && !line.removed)).toBe(true);
  });

  it("handles a fully-added and fully-removed case", async () => {
    const outcome = await diffText("old line", "new line");
    expect(outcome.removedCount).toBe(1);
    expect(outcome.addedCount).toBe(1);
  });

  it("renders a +/- prefixed text representation", async () => {
    const outcome = await diffText("a\nb", "a\nc");
    const rendered = renderDiffText(outcome);
    expect(rendered).toBe("  a\n- b\n+ c");
  });

  it("does not produce a spurious trailing blank line", async () => {
    const outcome = await diffText("a\nb\nc", "a\nb\nc\n");
    // Only a genuine trailing blank line addition should show up, never an
    // artifact of the diff library's internal newline-terminated chunking.
    expect(outcome.lines.filter((l) => l.value === "").length).toBeLessThanOrEqual(1);
  });
});

describe("diffJsonText", () => {
  it("shows no difference when only key order changes", async () => {
    const outcome = await diffJsonText('{"a": 1, "b": 2}', '{"b": 2, "a": 1}');
    expect(outcome.addedCount).toBe(0);
    expect(outcome.removedCount).toBe(0);
  });

  it("flags a changed value", async () => {
    const outcome = await diffJsonText('{"a": 1}', '{"a": 2}');
    expect(outcome.addedCount).toBeGreaterThan(0);
    expect(outcome.removedCount).toBeGreaterThan(0);
  });

  it("flags an added key", async () => {
    const outcome = await diffJsonText("{}", '{"a": 1}');
    expect(outcome.addedCount).toBeGreaterThan(0);
  });

  it("throws a clear error when either side isn't valid JSON", async () => {
    await expect(diffJsonText("not json", "{}")).rejects.toThrow(ProcessingError);
    await expect(diffJsonText("{}", "not json")).rejects.toThrow(ProcessingError);
  });
});

/**
 * The side-by-side row model. `lines` above stays the flat/unified shape used
 * for text export; `rows` is what the viewer renders, with both sides aligned,
 * line numbers on each, and word-level segments inside a modified line.
 */
describe("diff rows (side-by-side model)", () => {
  it("pairs a removal with the following addition into one modified row", async () => {
    const outcome = await diffText("a\nb\nc", "a\nx\nc");
    expect(outcome.rows.map((row) => row.type)).toEqual(["unchanged", "modified", "unchanged"]);

    const modified = outcome.rows[1];
    expect(modified.left).toBe("b");
    expect(modified.right).toBe("x");
    // Both sides keep their own line number, which is what lets the viewer
    // show real line numbers rather than row indices.
    expect(modified.leftNumber).toBe(2);
    expect(modified.rightNumber).toBe(2);
  });

  it("gives word-level segments for a modified line", async () => {
    const outcome = await diffText("the quick brown fox", "the slow brown fox");
    const modified = outcome.rows.find((row) => row.type === "modified")!;

    // The unchanged words must not be marked, or the whole line lights up and
    // the highlighting stops telling the user anything.
    expect(modified.leftSegments!.some((s) => s.changed && s.value.includes("quick"))).toBe(true);
    expect(modified.rightSegments!.some((s) => s.changed && s.value.includes("slow"))).toBe(true);
    expect(modified.leftSegments!.some((s) => !s.changed && s.value.includes("brown"))).toBe(true);
  });

  it("keeps pure insertions and deletions unpaired", async () => {
    const added = await diffText("a", "a\nb");
    expect(added.rows.map((row) => row.type)).toEqual(["unchanged", "added"]);
    expect(added.rows[1].leftNumber).toBeNull();
    expect(added.rows[1].rightNumber).toBe(2);

    const removed = await diffText("a\nb", "a");
    expect(removed.rows.map((row) => row.type)).toEqual(["unchanged", "removed"]);
    expect(removed.rows[1].rightNumber).toBeNull();
  });

  it("numbers contiguous runs of changes as blocks, for jump navigation", async () => {
    // Two separate edits with unchanged text between them.
    const outcome = await diffText("a\nb\nc\nd\ne", "a\nX\nc\nY\ne");
    expect(outcome.changeBlockCount).toBe(2);

    const blocks = outcome.rows.filter((row) => row.blockIndex !== null).map((row) => row.blockIndex);
    expect(new Set(blocks)).toEqual(new Set([0, 1]));
    // Unchanged rows never belong to a block, so "next change" can't land on one.
    expect(outcome.rows.filter((row) => row.type === "unchanged").every((row) => row.blockIndex === null)).toBe(true);
  });

  it("reports zero change blocks for identical input", async () => {
    const outcome = await diffText("same\ntext", "same\ntext");
    expect(outcome.changeBlockCount).toBe(0);
    expect(outcome.unchangedCount).toBe(2);
  });
});

describe("diffText options", () => {
  it("ignoreCase treats differently-cased lines as unchanged", async () => {
    const sensitive = await diffText("Hello\nWorld", "hello\nworld");
    expect(sensitive.changeBlockCount).toBeGreaterThan(0);

    const insensitive = await diffText("Hello\nWorld", "hello\nworld", { ignoreCase: true });
    expect(insensitive.changeBlockCount).toBe(0);
  });

  it("ignoreCase preserves the original casing in the output", async () => {
    const outcome = await diffText("Hello", "hello", { ignoreCase: true });
    // Lower-casing the inputs would have been simpler but would show the user
    // text they never wrote.
    expect(outcome.rows[0].left).toBe("Hello");
  });

  it("ignoreWhitespace treats indentation-only changes as unchanged", async () => {
    const sensitive = await diffText("a\n  b", "a\nb");
    expect(sensitive.changeBlockCount).toBeGreaterThan(0);

    const insensitive = await diffText("a\n  b", "a\nb", { ignoreWhitespace: true });
    expect(insensitive.changeBlockCount).toBe(0);
  });

  it("combines both options", async () => {
    const outcome = await diffText("  Hello", "hello  ", { ignoreCase: true, ignoreWhitespace: true });
    expect(outcome.changeBlockCount).toBe(0);
  });
});

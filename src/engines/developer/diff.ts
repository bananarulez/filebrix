import { parseJsonOrThrow } from "@/engines/spreadsheet/format/json";

export interface DiffLine {
  value: string;
  added: boolean;
  removed: boolean;
}

/** One word-level piece of a modified line — `changed` marks the differing part. */
export interface DiffSegment {
  value: string;
  changed: boolean;
}

export type DiffRowType = "unchanged" | "added" | "removed" | "modified";

/**
 * One aligned row of a side-by-side diff. `modified` rows carry both sides
 * plus word-level segments, which is what lets the UI highlight the part of a
 * line that actually changed rather than the whole line.
 */
export interface DiffRow {
  type: DiffRowType;
  /** 1-based line number in the original, or null when the row is an addition. */
  leftNumber: number | null;
  /** 1-based line number in the changed text, or null when the row is a deletion. */
  rightNumber: number | null;
  left: string | null;
  right: string | null;
  leftSegments?: DiffSegment[];
  rightSegments?: DiffSegment[];
  /** Which contiguous change block this row belongs to — drives jump-to-change. */
  blockIndex: number | null;
}

export interface DiffOutcome {
  /** Flat, unified representation. Kept as the stable shape for text export. */
  lines: DiffLine[];
  /** Aligned rows for the side-by-side view. */
  rows: DiffRow[];
  addedCount: number;
  removedCount: number;
  unchangedCount: number;
  /** Number of contiguous runs of changed rows — what "3 of 12 changes" counts. */
  changeBlockCount: number;
}

export interface DiffOptions {
  /** Treat "Foo" and "foo" as equal. */
  ignoreCase?: boolean;
  /** Ignore leading/trailing whitespace differences. */
  ignoreWhitespace?: boolean;
}

interface ChangePart {
  value: string;
  added?: boolean;
  removed?: boolean;
  /**
   * For an *unchanged* run produced by a comparator-based diff, the original
   * left-hand text. The `diff` library documents that when tokens match
   * loosely (a custom comparator, `ignoreCase`) it returns the value from the
   * **new** string — so without this the left column would display the right
   * side's casing, i.e. text the user never wrote.
   */
  leftValue?: string;
}

/** Splits a chunk into lines, dropping the spurious trailing empty segment a `"...\n"`-terminated chunk's `.split("\n")` produces. */
function toSegments(value: string): string[] {
  const segments = value.split("\n");
  if (segments.length > 1 && segments[segments.length - 1] === "") segments.pop();
  return segments;
}

/** Flattens the `diff` library's chunked `Change[]` into one line per row. */
function toDiffLines(changes: ChangePart[]): { lines: DiffLine[]; addedCount: number; removedCount: number } {
  const lines: DiffLine[] = [];
  let addedCount = 0;
  let removedCount = 0;
  for (const part of changes) {
    const added = Boolean(part.added);
    const removed = Boolean(part.removed);
    for (const segment of toSegments(part.value)) {
      lines.push({ value: segment, added, removed });
      if (added) addedCount += 1;
      if (removed) removedCount += 1;
    }
  }
  return { lines, addedCount, removedCount };
}

type WordDiffer = (before: string, after: string) => ChangePart[];

/**
 * Aligns the flat change list into side-by-side rows.
 *
 * A run of removed lines immediately followed by a run of added lines is the
 * signature of an *edit*, so those are paired index-wise into `modified` rows
 * (with a word-level diff of each pair) instead of being shown as an unrelated
 * deletion block above an unrelated insertion block. Leftovers on either side
 * stay pure additions/deletions. This pairing is what makes the output read
 * like a real diff viewer rather than a list of line events.
 */
function toRows(changes: ChangePart[], diffWords: WordDiffer): { rows: DiffRow[]; changeBlockCount: number } {
  const rows: DiffRow[] = [];
  let leftNumber = 0;
  let rightNumber = 0;

  // Collapse the library's chunks into a simple list of (kind, lines) runs.
  const runs: Array<{ kind: "same" | "add" | "remove"; lines: string[]; leftLines?: string[] }> = [];
  for (const part of changes) {
    const kind = part.added ? "add" : part.removed ? "remove" : "same";
    const lines = toSegments(part.value);
    const leftLines = part.leftValue === undefined ? undefined : toSegments(part.leftValue);
    const previous = runs[runs.length - 1];
    if (previous && previous.kind === kind) {
      previous.lines.push(...lines);
      if (leftLines) (previous.leftLines ??= []).push(...leftLines);
    } else {
      runs.push({ kind, lines, leftLines });
    }
  }

  for (let index = 0; index < runs.length; index++) {
    const run = runs[index];

    if (run.kind === "same") {
      run.lines.forEach((line, i) => {
        leftNumber += 1;
        rightNumber += 1;
        rows.push({
          type: "unchanged",
          leftNumber,
          rightNumber,
          // Each side keeps its own original text: under ignoreCase these
          // rows count as unchanged while still differing character by
          // character, and showing the real text of each side is the point.
          left: run.leftLines?.[i] ?? line,
          right: line,
          blockIndex: null,
        });
      });
      continue;
    }

    if (run.kind === "remove") {
      const next = runs[index + 1];
      const additions = next?.kind === "add" ? next.lines : [];
      const paired = Math.min(run.lines.length, additions.length);

      for (let i = 0; i < paired; i++) {
        leftNumber += 1;
        rightNumber += 1;
        const before = run.lines[i];
        const after = additions[i];

        /**
         * The differ can pair two byte-identical lines — most commonly from a
         * trailing-newline difference, where `diffLines("a", "a\nb")` reports
         * a removal of `"a"` and an addition of `"a\nb"` rather than a shared
         * `"a"`. Marking that as `modified` would highlight a "change" where
         * nothing actually changed, so it's reported as unchanged instead.
         */
        if (before === after) {
          rows.push({
            type: "unchanged",
            leftNumber,
            rightNumber,
            left: before,
            right: after,
            blockIndex: null,
          });
          continue;
        }

        const words = diffWords(before, after);
        rows.push({
          type: "modified",
          leftNumber,
          rightNumber,
          left: before,
          right: after,
          leftSegments: words
            .filter((part) => !part.added)
            .map((part) => ({ value: part.value, changed: Boolean(part.removed) })),
          rightSegments: words
            .filter((part) => !part.removed)
            .map((part) => ({ value: part.value, changed: Boolean(part.added) })),
          blockIndex: 0,
        });
      }

      for (let i = paired; i < run.lines.length; i++) {
        leftNumber += 1;
        rows.push({
          type: "removed",
          leftNumber,
          rightNumber: null,
          left: run.lines[i],
          right: null,
          blockIndex: 0,
        });
      }

      // Any additions beyond the paired ones belong to this same edit region.
      for (let i = paired; i < additions.length; i++) {
        rightNumber += 1;
        rows.push({
          type: "added",
          leftNumber: null,
          rightNumber,
          left: null,
          right: additions[i],
          blockIndex: 0,
        });
      }

      if (next?.kind === "add") index += 1; // consumed above
      continue;
    }

    // A pure addition run (no preceding deletion).
    for (const line of run.lines) {
      rightNumber += 1;
      rows.push({
        type: "added",
        leftNumber: null,
        rightNumber,
        left: null,
        right: line,
        blockIndex: 0,
      });
    }
  }

  // Number the contiguous runs of changed rows, so the UI can step through
  // "change 3 of 12" rather than through individual lines.
  let blockCount = 0;
  let inBlock = false;
  for (const row of rows) {
    if (row.type === "unchanged") {
      inBlock = false;
      row.blockIndex = null;
      continue;
    }
    if (!inBlock) {
      blockCount += 1;
      inBlock = true;
    }
    row.blockIndex = blockCount - 1;
  }

  return { rows, changeBlockCount: blockCount };
}

function build(changes: ChangePart[], diffWords: WordDiffer): DiffOutcome {
  const { lines, addedCount, removedCount } = toDiffLines(changes);
  const { rows, changeBlockCount } = toRows(changes, diffWords);
  return {
    lines,
    rows,
    addedCount,
    removedCount,
    unchangedCount: rows.filter((row) => row.type === "unchanged").length,
    changeBlockCount,
  };
}

/**
 * Line-level diff of two arbitrary texts.
 *
 * The default path is the `diff` package's Myers-diff `diffLines`, which
 * handles trailing-newline semantics correctly. `diffLines` has no
 * `ignoreCase` option and (unlike `diffArrays`) accepts no custom
 * `comparator`, so case-insensitive comparison goes through `diffArrays` over
 * pre-split lines instead. Lower-casing the *inputs* would have been simpler
 * but would also lower-case the output, showing the user text they never
 * wrote. Keeping the default on `diffLines` means the common case stays
 * byte-for-byte what it has always produced.
 */
export async function diffText(before: string, after: string, options: DiffOptions = {}): Promise<DiffOutcome> {
  const { diffLines, diffArrays, diffWordsWithSpace } = await import("diff");
  const wordDiffer: WordDiffer = (a, b) => diffWordsWithSpace(a, b, { ignoreCase: options.ignoreCase });

  if (!options.ignoreCase) {
    return build(diffLines(before, after, { ignoreWhitespace: options.ignoreWhitespace }), wordDiffer);
  }

  const normalize = (value: string) => {
    const lowered = value.toLowerCase();
    return options.ignoreWhitespace ? lowered.trim() : lowered;
  };

  const beforeLines = before.split("\n");
  const afterLines = after.split("\n");

  // Walk the raw output alongside both originals. The library documents that
  // for loosely-matched tokens it returns the value from the *new* string, so
  // an unchanged run's left-hand text has to be taken from `beforeLines` by
  // position — otherwise the left column would show the right side's casing.
  // Re-joined with a trailing newline so `toSegments` splits it back into
  // exactly these lines, matching diffLines' chunk shape.
  const join = (lines: string[]) => (lines.length > 0 ? `${lines.join("\n")}\n` : "");
  let beforeIndex = 0;
  let afterIndex = 0;
  const changes: ChangePart[] = [];

  for (const change of diffArrays(beforeLines, afterLines, {
    comparator: (a, b) => normalize(a) === normalize(b),
  })) {
    const count = change.count ?? change.value.length;
    if (change.added) {
      changes.push({ value: join(afterLines.slice(afterIndex, afterIndex + count)), added: true });
      afterIndex += count;
    } else if (change.removed) {
      changes.push({ value: join(beforeLines.slice(beforeIndex, beforeIndex + count)), removed: true });
      beforeIndex += count;
    } else {
      changes.push({
        value: join(afterLines.slice(afterIndex, afterIndex + count)),
        leftValue: join(beforeLines.slice(beforeIndex, beforeIndex + count)),
      });
      beforeIndex += count;
      afterIndex += count;
    }
  }

  return build(changes, wordDiffer);
}

/**
 * Structural JSON diff — reuses the same `diff` package's `diffJson`, which
 * canonicalizes (sorted keys) and pretty-prints each value before line-
 * diffing it, rather than a hand-rolled recursive differ. Reuses
 * `parseJsonOrThrow` from the Spreadsheet engine's JSON formatter rather
 * than re-implementing JSON parsing/error messages a second time.
 */
export async function diffJsonText(before: string, after: string): Promise<DiffOutcome> {
  // parseJsonOrThrow returns `unknown` (any valid JSON value); diffJson's
  // `string | object` parameter type doesn't cover JSON primitives like a
  // bare number or boolean, but its `canonicalize()` handles any value fine
  // at runtime — the cast just satisfies the narrower public type.
  const beforeValue = parseJsonOrThrow(before) as object;
  const afterValue = parseJsonOrThrow(after) as object;
  const { diffJson, diffWordsWithSpace } = await import("diff");
  return build(diffJson(beforeValue, afterValue), (a, b) => diffWordsWithSpace(a, b));
}

export function renderDiffText(outcome: DiffOutcome): string {
  return outcome.lines
    .map((line) => `${line.added ? "+ " : line.removed ? "- " : "  "}${line.value}`)
    .join("\n");
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ErrorPanel } from "@/components/tools/ErrorPanel";
import { DownloadResult } from "@/components/tools/DownloadResult";
import { ProcessingError, type ProcessingErrorCode } from "@/lib/errors/ProcessingError";
import {
  diffJsonText,
  diffText,
  mergeDiffBlock,
  renderDiffText,
  type DiffOutcome,
  type DiffRow,
  type DiffSegment,
  type MergeDirection,
} from "@/engines/developer/diff";

interface ErrorState {
  message: string;
  code?: ProcessingErrorCode;
}

function errorFrom(cause: unknown): ErrorState {
  if (cause instanceof ProcessingError) return { message: cause.message, code: cause.code };
  return { message: "Something went wrong comparing this input." };
}

export type DiffMode = "text" | "json";

const MODE_CONFIG: Record<DiffMode, { leftLabel: string; rightLabel: string; placeholder: string }> = {
  text: {
    leftLabel: "Original text",
    rightLabel: "Changed text",
    placeholder: "Paste text here",
  },
  json: {
    leftLabel: "Original JSON",
    rightLabel: "Changed JSON",
    placeholder: '{"example": "paste JSON here"}',
  },
};

type ViewMode = "split" | "unified";

/** Background tint per row type, shared by both views so they read identically. */
const ROW_TONE: Record<DiffRow["type"], { left: string; right: string }> = {
  unchanged: { left: "", right: "" },
  added: {
    left: "bg-gray-50 dark:bg-gray-900/40",
    right: "bg-green-50 dark:bg-green-950/30",
  },
  removed: {
    left: "bg-red-50 dark:bg-red-950/30",
    right: "bg-gray-50 dark:bg-gray-900/40",
  },
  modified: {
    left: "bg-red-50 dark:bg-red-950/30",
    right: "bg-green-50 dark:bg-green-950/30",
  },
};

/** Renders a line with the changed words highlighted, falling back to plain text. */
function LineContent({
  segments,
  fallback,
  side,
}: {
  segments: DiffSegment[] | undefined;
  fallback: string | null;
  side: "left" | "right";
}) {
  if (!segments) return <>{fallback ?? ""}</>;
  return (
    <>
      {segments.map((segment, index) =>
        segment.changed ? (
          <mark
            key={index}
            className={
              side === "left"
                ? "rounded-sm bg-red-200 text-red-900 dark:bg-red-800/60 dark:text-red-100"
                : "rounded-sm bg-green-200 text-green-900 dark:bg-green-800/60 dark:text-green-100"
            }
          >
            {segment.value}
          </mark>
        ) : (
          <span key={index}>{segment.value}</span>
        )
      )}
    </>
  );
}

function LineNumber({ value }: { value: number | null }) {
  return (
    <td className="w-10 select-none border-r border-gray-200 px-2 text-right align-top text-[11px] leading-relaxed text-gray-400 dark:border-gray-800">
      {value ?? ""}
    </td>
  );
}

/**
 * Powers both Text Diff and JSON Diff — only `mode` (which underlying `diff`
 * function runs) differs, mirroring GeoConverterTool's `kind` prop pattern.
 *
 * The viewer is deliberately close to what people expect from a dedicated
 * diff tool: aligned side-by-side (or unified) rows with line numbers on both
 * sides, word-level highlighting inside a changed line, and next/previous
 * navigation that steps through *change blocks* rather than individual lines.
 */
export function DiffTool({ mode }: { mode: DiffMode }) {
  const config = MODE_CONFIG[mode];
  const [left, setLeft] = useState("");
  const [right, setRight] = useState("");
  const [outcome, setOutcome] = useState<DiffOutcome | null>(null);
  const [error, setError] = useState<ErrorState | null>(null);
  const [isComparing, setIsComparing] = useState(false);

  const [view, setView] = useState<ViewMode>("split");
  const [ignoreCase, setIgnoreCase] = useState(false);
  const [ignoreWhitespace, setIgnoreWhitespace] = useState(false);
  const [currentBlock, setCurrentBlock] = useState(0);
  /**
   * The panes as they were before the last merge.
   *
   * Merging rewrites a textarea programmatically, which the browser's own
   * undo stack does not cover — so without this, one mis-aimed click silently
   * destroys text someone typed by hand, with no way back.
   */
  const [undoSnapshot, setUndoSnapshot] = useState<{ left: string; right: string } | null>(null);

  async function mergeCurrentBlock(direction: MergeDirection) {
    if (!outcome || outcome.changeBlockCount === 0) return;
    const merged = mergeDiffBlock(outcome.rows, currentBlock, direction);
    setUndoSnapshot({ left, right });

    if (direction === "left-to-right") {
      setRight(merged);
      await handleCompare(left, merged, true);
    } else {
      setLeft(merged);
      await handleCompare(merged, right, true);
    }
  }

  async function undoMerge() {
    if (!undoSnapshot) return;
    setLeft(undoSnapshot.left);
    setRight(undoSnapshot.right);
    setUndoSnapshot(null);
    await handleCompare(undoSnapshot.left, undoSnapshot.right, true);
  }

  const resultRef = useRef<HTMLDivElement | null>(null);

  /**
   * `nextLeft`/`nextRight` exist because merging changes a pane and must
   * re-diff immediately: React state isn't updated yet at that point, so the
   * new text has to be passed in rather than read back.
   *
   * `keepPosition` holds the reader where they were. Merging renumbers the
   * remaining blocks — merge block 2 and the old block 3 becomes 2 — so
   * resetting to the first change would throw away their place in a long
   * diff after every single merge.
   */
  async function handleCompare(nextLeft = left, nextRight = right, keepPosition = false) {
    setIsComparing(true);
    setError(null);
    try {
      const result =
        mode === "json"
          ? await diffJsonText(nextLeft, nextRight)
          : await diffText(nextLeft, nextRight, { ignoreCase, ignoreWhitespace });
      setOutcome(result);
      setCurrentBlock((current) =>
        keepPosition ? Math.min(current, Math.max(result.changeBlockCount - 1, 0)) : 0
      );
    } catch (cause) {
      setError(errorFrom(cause));
      setOutcome(null);
    } finally {
      setIsComparing(false);
    }
  }

  /**
   * Centres a change inside the result box — and *only* inside it.
   *
   * This used to call `target.scrollIntoView({ block: "center" })`, which
   * scrolls every scrollable ancestor including the window: stepping to the
   * next change yanked the whole page so the row sat in the middle of the
   * screen, even when a few pixels inside the box would have done. The result
   * box already has its own scroll area (`max-h-[32rem] overflow-auto`), so
   * scrolling it directly is both correct and less disruptive — the controls,
   * the two textareas and the reader's place on the page all stay put.
   *
   * Measured from `getBoundingClientRect()` rather than `offsetTop`, which is
   * relative to the nearest *positioned* ancestor and would silently start
   * returning a different number if the surrounding layout ever gained one.
   */
  const scrollToBlock = useCallback((blockIndex: number) => {
    const container = resultRef.current;
    const target = container?.querySelector<HTMLElement>(`[data-block-start="${blockIndex}"]`);
    if (!container || !target) return;

    const targetRect = target.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const delta =
      targetRect.top - containerRect.top - (container.clientHeight - targetRect.height) / 2;
    container.scrollBy({ top: delta, behavior: "smooth" });
  }, []);

  const goToBlock = useCallback(
    (next: number) => {
      if (!outcome || outcome.changeBlockCount === 0) return;
      // Wrap around, so stepping past the last change returns to the first.
      const wrapped = (next + outcome.changeBlockCount) % outcome.changeBlockCount;
      setCurrentBlock(wrapped);
      scrollToBlock(wrapped);
    },
    [outcome, scrollToBlock]
  );

  // Keyboard shortcuts, matching what a dedicated diff viewer offers: n/p step
  // through changes whenever focus isn't in a text field.
  useEffect(() => {
    if (!outcome || outcome.changeBlockCount === 0) return;

    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "TEXTAREA" || target.tagName === "INPUT")) return;
      if (event.key === "n") {
        event.preventDefault();
        goToBlock(currentBlock + 1);
      } else if (event.key === "p") {
        event.preventDefault();
        goToBlock(currentBlock - 1);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [outcome, currentBlock, goToBlock]);

  const hasChanges = outcome !== null && outcome.changeBlockCount > 0;

  /** The first row of each block carries the anchor the jump buttons target. */
  function blockStartAttribute(row: DiffRow, index: number, rows: DiffRow[]): string | undefined {
    if (row.blockIndex === null) return undefined;
    return rows[index - 1]?.blockIndex === row.blockIndex ? undefined : String(row.blockIndex);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="diff-left" className="text-sm font-medium">
            {config.leftLabel}
          </label>
          <textarea
            id="diff-left"
            value={left}
            onChange={(event) => setLeft(event.target.value)}
            placeholder={config.placeholder}
            rows={10}
            spellCheck={false}
            className="w-full rounded-lg border border-gray-300 p-3 font-mono text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-gray-700 dark:bg-gray-900"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="diff-right" className="text-sm font-medium">
            {config.rightLabel}
          </label>
          <textarea
            id="diff-right"
            value={right}
            onChange={(event) => setRight(event.target.value)}
            placeholder={config.placeholder}
            rows={10}
            spellCheck={false}
            className="w-full rounded-lg border border-gray-300 p-3 font-mono text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-gray-700 dark:bg-gray-900"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={() => void handleCompare()}
          disabled={isComparing}
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {isComparing ? "Comparing…" : "Compare"}
        </button>

        {/* JSON mode canonicalizes (sorted keys, re-indented) before diffing,
            so case/whitespace options would have nothing left to act on. */}
        {mode === "text" && (
          <>
            <label className="flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                checked={ignoreCase}
                onChange={(event) => setIgnoreCase(event.target.checked)}
              />
              Ignore case
            </label>
            <label className="flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                checked={ignoreWhitespace}
                onChange={(event) => setIgnoreWhitespace(event.target.checked)}
              />
              Ignore whitespace
            </label>
          </>
        )}
      </div>

      {error && <ErrorPanel message={error.message} code={error.code} />}

      {outcome && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-800">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="font-medium">
                {outcome.changeBlockCount === 0
                  ? "No differences"
                  : `${outcome.changeBlockCount} change${outcome.changeBlockCount === 1 ? "" : "s"}`}
              </span>
              <span className="text-green-700 dark:text-green-400">+{outcome.addedCount} added</span>
              <span className="text-red-700 dark:text-red-400">−{outcome.removedCount} removed</span>
              <span className="text-gray-500">{outcome.unchangedCount} unchanged</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {hasChanges && (
                <>
                  <span className="text-xs text-gray-500">
                    Change {currentBlock + 1} of {outcome.changeBlockCount}
                  </span>
                  <button
                    type="button"
                    onClick={() => goToBlock(currentBlock - 1)}
                    aria-label="Previous change"
                    title="Previous change (p)"
                    className="rounded-md border border-gray-200 px-2 py-1 text-sm hover:border-gray-400 dark:border-gray-700"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => goToBlock(currentBlock + 1)}
                    aria-label="Next change"
                    title="Next change (n)"
                    className="rounded-md border border-gray-200 px-2 py-1 text-sm hover:border-gray-400 dark:border-gray-700"
                  >
                    ↓
                  </button>

                  {/*
                    Merge the change you're standing on, either way.
                    Deliberately here rather than as a control floating between
                    the two panes: the table is one grid with no gutter to hang
                    them in, and pairing them with the step buttons means the
                    keyboard path (n / p to find a change, then merge it) and
                    the mouse path are the same path.
                  */}
                  <button
                    type="button"
                    onClick={() => void mergeCurrentBlock("left-to-right")}
                    aria-label="Merge this change into the right side"
                    title="Copy this change from left to right"
                    className="rounded-md border border-gray-200 px-2 py-1 text-sm hover:border-gray-400 dark:border-gray-700"
                  >
                    →
                  </button>
                  <button
                    type="button"
                    onClick={() => void mergeCurrentBlock("right-to-left")}
                    aria-label="Merge this change into the left side"
                    title="Copy this change from right to left"
                    className="rounded-md border border-gray-200 px-2 py-1 text-sm hover:border-gray-400 dark:border-gray-700"
                  >
                    ←
                  </button>
                </>
              )}

              {undoSnapshot && (
                <button
                  type="button"
                  onClick={() => void undoMerge()}
                  className="rounded-md border border-gray-200 px-2 py-1 text-sm hover:border-gray-400 dark:border-gray-700"
                >
                  Undo merge
                </button>
              )}
              <div
                role="tablist"
                aria-label="Diff view"
                className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-900"
              >
                {(["split", "unified"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    role="tab"
                    aria-selected={view === option}
                    onClick={() => setView(option)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium capitalize ${
                      view === option
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300"
                        : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div
            ref={resultRef}
            className="max-h-[32rem] overflow-auto rounded-lg border border-gray-200 dark:border-gray-800"
          >
            <table className="w-full border-collapse font-mono text-xs leading-relaxed">
              <caption className="sr-only">
                {view === "split" ? "Side-by-side" : "Unified"} comparison of {config.leftLabel} and{" "}
                {config.rightLabel}
              </caption>
              <tbody>
                {outcome.rows.map((row, index) => {
                  const anchor = blockStartAttribute(row, index, outcome.rows);
                  const tone = ROW_TONE[row.type];

                  if (view === "unified") {
                    // One table row per side, so a modified line reads as a
                    // paired deletion and insertion the way a patch does.
                    const parts: Array<{
                      sign: string;
                      text: string | null;
                      segments?: DiffSegment[];
                      side: "left" | "right";
                      number: number | null;
                      tint: string;
                    }> = [];

                    if (row.type === "unchanged") {
                      parts.push({ sign: " ", text: row.left, side: "left", number: row.leftNumber, tint: "" });
                    } else {
                      if (row.left !== null) {
                        parts.push({
                          sign: "−",
                          text: row.left,
                          segments: row.leftSegments,
                          side: "left",
                          number: row.leftNumber,
                          tint: tone.left,
                        });
                      }
                      if (row.right !== null) {
                        parts.push({
                          sign: "+",
                          text: row.right,
                          segments: row.rightSegments,
                          side: "right",
                          number: row.rightNumber,
                          tint: tone.right,
                        });
                      }
                    }

                    return parts.map((part, partIndex) => (
                      <tr
                        key={`${index}-${partIndex}`}
                        data-block-start={partIndex === 0 ? anchor : undefined}
                        className={part.tint}
                      >
                        <LineNumber value={part.number} />
                        <td className="w-4 select-none px-1 text-center align-top text-gray-400">{part.sign}</td>
                        <td className="whitespace-pre-wrap break-all px-2 align-top">
                          <LineContent segments={part.segments} fallback={part.text} side={part.side} />
                        </td>
                      </tr>
                    ));
                  }

                  return (
                    <tr key={index} data-block-start={anchor}>
                      <LineNumber value={row.leftNumber} />
                      <td className={`w-1/2 whitespace-pre-wrap break-all px-2 align-top ${tone.left}`}>
                        <LineContent segments={row.leftSegments} fallback={row.left} side="left" />
                      </td>
                      <LineNumber value={row.rightNumber} />
                      <td className={`w-1/2 whitespace-pre-wrap break-all px-2 align-top ${tone.right}`}>
                        <LineContent segments={row.rightSegments} fallback={row.right} side="right" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <DownloadResult
              filename="diff.txt"
              blob={new Blob([renderDiffText(outcome)], { type: "text/plain;charset=utf-8" })}
              label="Download diff"
            />
            {hasChanges && (
              <span className="text-xs text-gray-500">
                Tip: press <kbd className="rounded border border-gray-300 px-1 dark:border-gray-700">n</kbd> /{" "}
                <kbd className="rounded border border-gray-300 px-1 dark:border-gray-700">p</kbd> to step through
                changes.
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

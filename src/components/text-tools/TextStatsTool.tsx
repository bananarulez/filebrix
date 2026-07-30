"use client";

import { useEffect, useMemo, useState } from "react";
import { computeTextStats, type TextStats } from "@/engines/developer/textStats";
import { takePendingFile } from "@/lib/fileHandoff";

type StatKey = keyof TextStats;

const STAT_LABELS: Record<StatKey, string> = {
  words: "Words",
  characters: "Characters",
  charactersNoSpaces: "Characters (no spaces)",
  lines: "Lines",
  sentences: "Sentences",
  paragraphs: "Paragraphs",
};

const STAT_ORDER: StatKey[] = ["words", "characters", "charactersNoSpaces", "lines", "sentences", "paragraphs"];

interface TextStatsToolProps {
  /** Which stat is visually emphasized — Word/Character/Line Counter all
   * share this component and this same full stat grid, differing only in
   * which number is headlined (and in each page's own title/copy). */
  highlight: StatKey;
  placeholder?: string;
  toolSlug?: string;
}

/** Live word/character/line/sentence/paragraph counts — recomputed on every
 * keystroke via useMemo, no "process" button needed since these are cheap,
 * total (never-failing) string operations. Shared by Word Counter,
 * Character Counter and Line Counter (see registry devCategory "text"). */
export function TextStatsTool({ highlight, placeholder, toolSlug }: TextStatsToolProps) {
  const [input, setInput] = useState("");
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");
  const stats = useMemo(() => computeTextStats(input), [input]);
  const order = useMemo(() => [highlight, ...STAT_ORDER.filter((key) => key !== highlight)], [highlight]);

  useEffect(() => {
    if (!toolSlug) return;
    const handedOffFile = takePendingFile(toolSlug);
    if (handedOffFile) void handedOffFile.text().then(setInput);
  }, [toolSlug]);

  async function handleCopy() {
    const summary = order.map((key) => `${STAT_LABELS[key]}: ${stats[key]}`).join("\n");
    try {
      await navigator.clipboard.writeText(summary);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    }
    setTimeout(() => setCopyStatus("idle"), 2000);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="text-stats-input" className="text-sm font-medium">
          Text
        </label>
        <textarea
          id="text-stats-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={placeholder ?? "Paste or type text here"}
          rows={12}
          spellCheck={false}
          className="w-full rounded-lg border border-gray-300 p-3 font-mono text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-gray-700 dark:bg-gray-900"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 rounded-lg border border-gray-200 p-4 text-sm dark:border-gray-800 sm:grid-cols-3">
        {order.map((key) => (
          <div key={key}>
            <dt className="text-gray-500">{STAT_LABELS[key]}</dt>
            <dd className={key === highlight ? "text-2xl font-semibold" : "text-lg font-medium"}>
              {stats[key].toLocaleString()}
            </dd>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => void handleCopy()}
        className="w-fit rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:border-gray-400 hover:text-gray-900 dark:border-gray-700 dark:text-gray-300 dark:hover:text-white"
      >
        {copyStatus === "copied" ? "Copied!" : copyStatus === "error" ? "Couldn't copy" : "Copy stats"}
      </button>
    </div>
  );
}

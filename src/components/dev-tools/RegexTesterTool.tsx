"use client";

import { useMemo, useState } from "react";
import { ErrorPanel } from "@/components/tools/ErrorPanel";
import { ProcessingError, type ProcessingErrorCode } from "@/lib/errors/ProcessingError";
import { REGEX_FLAGS, replaceWithRegex, testRegex, type RegexTestResult } from "@/engines/developer/regex";

interface ErrorState {
  message: string;
  code?: ProcessingErrorCode;
}

/**
 * Live rather than click-to-run, unlike most Developer Toolkit tools: the
 * workflow a regex tester exists for is "change one character, look at what
 * matched, change it again", and a Run button between every keystroke and its
 * answer is what makes people go back to their editor.
 *
 * That is affordable because `testRegex` is pure, synchronous and capped, so
 * this never leaves an async result racing the input it came from — and an
 * invalid pattern (which you type *through* on the way to a valid one) is an
 * expected intermediate state shown inline, not an error banner that flashes
 * on every keystroke.
 *
 * **The honest caveat, stated in the UI and the FAQ:** a pathological pattern
 * can still hang the tab through catastrophic backtracking, because
 * `RegExp.exec` cannot be interrupted once started. Moving this to a worker
 * would make it cancellable; it would also be the only worker in an engine
 * whose entire premise is that its work is cheap. Since the pattern, the
 * input and the tab all belong to the same person, the cost of getting it
 * wrong is a refresh — so this says so rather than pretending otherwise.
 */
export function RegexTesterTool() {
  const [pattern, setPattern] = useState("");
  const [flags, setFlags] = useState<string[]>(["g"]);
  const [input, setInput] = useState("");
  const [replacement, setReplacement] = useState("");
  const [showReplace, setShowReplace] = useState(false);

  const flagString = flags.join("");

  const { result, error } = useMemo((): { result: RegexTestResult | null; error: ErrorState | null } => {
    if (pattern === "") return { result: null, error: null };
    try {
      return { result: testRegex(pattern, flagString, input), error: null };
    } catch (cause) {
      if (cause instanceof ProcessingError) return { result: null, error: { message: cause.message, code: cause.code } };
      return { result: null, error: { message: "Something went wrong running this pattern." } };
    }
  }, [pattern, flagString, input]);

  const replaced = useMemo(() => {
    if (!showReplace || pattern === "" || error) return null;
    try {
      return replaceWithRegex(pattern, flagString, input, replacement);
    } catch {
      return null;
    }
  }, [showReplace, pattern, flagString, input, replacement, error]);

  function toggleFlag(flag: string) {
    setFlags((current) => (current.includes(flag) ? current.filter((f) => f !== flag) : [...current, flag]));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Regular expression</span>
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 font-mono text-sm focus-within:border-blue-500 dark:border-gray-700">
            <span className="text-gray-400">/</span>
            <input
              value={pattern}
              onChange={(event) => setPattern(event.target.value)}
              placeholder="\d{4}-\d{2}-\d{2}"
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              className="min-w-0 flex-1 bg-transparent outline-none"
            />
            <span className="text-gray-400">/{flagString}</span>
          </div>
        </label>

        <fieldset className="flex flex-wrap gap-x-4 gap-y-1">
          <legend className="sr-only">Flags</legend>
          {REGEX_FLAGS.map(({ flag, label, hint }) => (
            <label key={flag} className="flex items-center gap-1.5 text-sm" title={hint}>
              <input type="checkbox" checked={flags.includes(flag)} onChange={() => toggleFlag(flag)} />
              <span>
                {label} <code className="text-xs text-gray-500">{flag}</code>
              </span>
            </label>
          ))}
        </fieldset>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Test string</span>
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          rows={8}
          spellCheck={false}
          placeholder="Paste the text you want to match against"
          className="w-full rounded-lg border border-gray-200 p-3 font-mono text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-950"
        />
      </label>

      {error && <ErrorPanel message={error.message} code={error.code} />}

      {result && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium" role="status">
            {result.matches.length === 0
              ? "No matches"
              : `${result.matches.length}${result.truncated ? "+" : ""} ${result.matches.length === 1 ? "match" : "matches"}`}
            {result.truncated && (
              <span className="ml-2 text-xs font-normal text-amber-700 dark:text-amber-400">
                stopped after the first 1000
              </span>
            )}
          </p>

          {result.matches.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500 dark:border-gray-800">
                  <tr>
                    <th className="px-3 py-2 font-medium">#</th>
                    <th className="px-3 py-2 font-medium">Index</th>
                    <th className="px-3 py-2 font-medium">Match</th>
                    <th className="px-3 py-2 font-medium">Groups</th>
                  </tr>
                </thead>
                <tbody>
                  {result.matches.map((match, index) => (
                    <tr key={`${match.index}-${index}`} className="border-b border-gray-100 last:border-0 dark:border-gray-900">
                      <td className="px-3 py-2 tabular-nums text-gray-500">{index + 1}</td>
                      <td className="px-3 py-2 tabular-nums text-gray-500">{match.index}</td>
                      <td className="px-3 py-2 font-mono">
                        {/* An empty match is a real result (`\b`, `a*`), and
                            rendering it as blank looks like a rendering bug. */}
                        {match.value === "" ? <span className="text-gray-400">(empty match)</span> : match.value}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-gray-600 dark:text-gray-300">
                        {match.groups.length === 0 && match.named.length === 0 ? (
                          <span className="text-gray-400">—</span>
                        ) : (
                          <div className="flex flex-col gap-0.5">
                            {match.groups.map((value, position) => (
                              <span key={`n${position}`}>
                                <span className="text-gray-400">{position + 1}:</span>{" "}
                                {value === undefined ? <span className="text-gray-400">(no match)</span> : value}
                              </span>
                            ))}
                            {match.named.map((group) => (
                              <span key={group.name}>
                                <span className="text-gray-400">{group.name}:</span>{" "}
                                {group.value === undefined ? <span className="text-gray-400">(no match)</span> : group.value}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={showReplace} onChange={() => setShowReplace((value) => !value)} />
          <span>Show replacement preview</span>
        </label>

        {showReplace && (
          <>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">Replacement</span>
              <input
                value={replacement}
                onChange={(event) => setReplacement(event.target.value)}
                placeholder="$1 / $&amp; / $<name> all work"
                spellCheck={false}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-950"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">Result</span>
              <textarea
                readOnly
                value={replaced ?? ""}
                rows={6}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 p-3 font-mono text-sm dark:border-gray-700 dark:bg-gray-900"
              />
            </label>
          </>
        )}
      </div>

      <p className="text-xs text-gray-500">
        Matching runs in this tab on your own device — the pattern and the text are never sent anywhere. A
        pathological pattern can still make the page unresponsive; reloading recovers it.
      </p>
    </div>
  );
}

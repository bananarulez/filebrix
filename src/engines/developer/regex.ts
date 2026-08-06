import { ProcessingError } from "@/lib/errors/ProcessingError";

/**
 * Regular-expression testing on the native `RegExp` — no dependency, and no
 * dialect translation: the whole point of this tool is to show what
 * JavaScript's own engine does with your pattern, so anything that
 * reinterpreted it would make the answer less useful, not more.
 */

/** A cap, not a page size. See `truncated` on the result. */
const MAX_MATCHES = 1000;

export const REGEX_FLAGS = [
  { flag: "g", label: "Global", hint: "Find every match, not just the first" },
  { flag: "i", label: "Ignore case", hint: "Match regardless of upper/lower case" },
  { flag: "m", label: "Multiline", hint: "^ and $ match at each line, not just the whole string" },
  { flag: "s", label: "Dot matches newline", hint: "Let . match line breaks too" },
  { flag: "u", label: "Unicode", hint: "Treat the pattern as a sequence of Unicode code points" },
] as const;

export interface RegexMatch {
  /** Offset into the input where this match starts. */
  index: number;
  value: string;
  /** Numbered capture groups in order, starting at 1. `undefined` where a group took part in no match (an unmatched alternative). */
  groups: (string | undefined)[];
  /**
   * Named groups from `(?<name>...)`, reported separately rather than folded
   * into `groups` with a name attached. A named group *is* also numbered, and
   * the runtime gives no mapping between the two — inferring one by matching
   * values would attach the wrong name whenever two groups captured the same
   * text. Listing both views is accurate; guessing isn't.
   */
  named: { name: string; value: string | undefined }[];
}

export interface RegexTestResult {
  matches: RegexMatch[];
  /** `true` when matching stopped at MAX_MATCHES — the count shown is a floor, not a total. */
  truncated: boolean;
}

/**
 * `g` is forced on internally so a single call can report every match; the
 * user's own `g` choice is what the UI reports as "first match only", because
 * that is the distinction people are actually testing.
 */
function compile(pattern: string, flags: string): RegExp {
  if (pattern === "") throw new ProcessingError("MALFORMED_FILE", "Enter a pattern to test.");
  try {
    return new RegExp(pattern, flags.includes("g") ? flags : `${flags}g`);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Invalid regular expression.";
    throw new ProcessingError("MALFORMED_FILE", `This isn't a valid regular expression: ${message}`);
  }
}

function toMatch(found: RegExpExecArray): RegexMatch {
  return {
    index: found.index,
    value: found[0],
    // found[0] is the whole match, so numbered groups start at 1.
    groups: found.slice(1),
    named: Object.entries(found.groups ?? {}).map(([name, value]) => ({ name, value })),
  };
}

export function testRegex(pattern: string, flags: string, input: string): RegexTestResult {
  const regex = compile(pattern, flags);
  const global = flags.includes("g");
  const matches: RegexMatch[] = [];

  let found: RegExpExecArray | null;
  while ((found = regex.exec(input)) !== null) {
    matches.push(toMatch(found));

    // A pattern that can match the empty string (`a*`, `\b`, a lookahead)
    // leaves lastIndex where it was, so exec returns the same zero-length
    // match at the same offset forever. Advancing by one is what the spec's
    // own String.prototype.matchAll does; without it this loop never ends and
    // the tab is gone.
    if (found[0] === "") regex.lastIndex += 1;
    if (!global) break;
    if (matches.length >= MAX_MATCHES) return { matches, truncated: true };
  }

  return { matches, truncated: false };
}

/**
 * `String.replace` with the same pattern, so `$1`, `$<name>` and `$&` behave
 * exactly as they would in the user's own code.
 */
export function replaceWithRegex(
  pattern: string,
  flags: string,
  input: string,
  replacement: string
): string {
  const regex = compile(pattern, flags);
  if (!flags.includes("g")) {
    // compile() forced `g` on; honour the user's choice here by replacing once.
    const single = new RegExp(pattern, flags.replace(/g/g, ""));
    return input.replace(single, replacement);
  }
  return input.replace(regex, replacement);
}

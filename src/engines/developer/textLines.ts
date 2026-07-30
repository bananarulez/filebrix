export interface TextOpResult {
  output: string;
}

/** Total functions — line-oriented text operations never fail on any input, so none of these throw a ProcessingError. */
function splitLines(text: string): string[] {
  if (text === "") return [];
  return text.split(/\r\n|\r|\n/);
}

export function removeEmptyLines(text: string): TextOpResult {
  return { output: splitLines(text).filter((line) => line.trim() !== "").join("\n") };
}

export function removeDuplicateLines(text: string): TextOpResult {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const line of splitLines(text)) {
    if (!seen.has(line)) {
      seen.add(line);
      result.push(line);
    }
  }
  return { output: result.join("\n") };
}

export type SortDirection = "asc" | "desc";

export function sortLines(text: string, direction: SortDirection): TextOpResult {
  const sorted = splitLines(text).sort((a, b) => a.localeCompare(b));
  if (direction === "desc") sorted.reverse();
  return { output: sorted.join("\n") };
}

export function reverseLines(text: string): TextOpResult {
  return { output: splitLines(text).reverse().join("\n") };
}

export function trimWhitespace(text: string): TextOpResult {
  return { output: splitLines(text).map((line) => line.trim()).join("\n") };
}

export type LineEnding = "lf" | "crlf" | "cr";

const LINE_ENDING_CHAR: Record<LineEnding, string> = { lf: "\n", crlf: "\r\n", cr: "\r" };

export function normalizeLineEndings(text: string, target: LineEnding): TextOpResult {
  return { output: splitLines(text).join(LINE_ENDING_CHAR[target]) };
}

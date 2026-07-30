export interface TextOpResult {
  output: string;
}

export type CaseMode = "upper" | "lower" | "title" | "sentence";

function toTitleCase(text: string): string {
  return text.replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

/** Capitalizes the first letter of the string and of every letter following
 * a sentence-ending `.`/`!`/`?` (plus following whitespace) — the rest is lowercased first. */
function toSentenceCase(text: string): string {
  const lower = text.toLowerCase();
  return lower.replace(/(^\s*[a-z]|[.!?]\s+[a-z])/g, (match) => match.toUpperCase());
}

export function convertCase(text: string, mode: CaseMode): TextOpResult {
  switch (mode) {
    case "upper":
      return { output: text.toUpperCase() };
    case "lower":
      return { output: text.toLowerCase() };
    case "title":
      return { output: toTitleCase(text) };
    case "sentence":
      return { output: toSentenceCase(text) };
  }
}

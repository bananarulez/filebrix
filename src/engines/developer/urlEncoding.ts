import { ProcessingError } from "@/lib/errors/ProcessingError";

export interface FormatResult {
  output: string;
}

/** Component-style encoding (`encodeURIComponent`) — safe for a query string value or path segment, escaping reserved characters like `&`, `=`, `/` and `?` rather than preserving them. */
export function encodeUrlText(text: string): FormatResult {
  return { output: encodeURIComponent(text) };
}

export function decodeUrlText(text: string): FormatResult {
  try {
    return { output: decodeURIComponent(text) };
  } catch {
    throw new ProcessingError(
      "MALFORMED_FILE",
      "This isn't valid URL-encoded text — it contains a malformed % escape sequence."
    );
  }
}

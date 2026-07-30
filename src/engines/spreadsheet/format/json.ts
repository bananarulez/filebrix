import { ProcessingError } from "@/lib/errors/ProcessingError";

export interface FormatResult {
  output: string;
}

/**
 * Distinct from parsers/json.ts's parseJson — that one flattens JSON into a
 * NormalizedTable (for CSV/JSON conversions). This preserves the JSON value
 * as-is; formatting/minifying shouldn't tabularize anything.
 */
export function parseJsonOrThrow(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Invalid JSON.";
    throw new ProcessingError("MALFORMED_FILE", `This isn't valid JSON: ${message}`);
  }
}

export function formatJson(text: string, indent: number | string = 2): FormatResult {
  const value = parseJsonOrThrow(text);
  return { output: JSON.stringify(value, null, indent) };
}

export function minifyJson(text: string): FormatResult {
  const value = parseJsonOrThrow(text);
  return { output: JSON.stringify(value) };
}

/** A thrown ProcessingError from parseJsonOrThrow *is* the validation failure — this just gives the JSON Validator tool a positive-confirmation message for the success case, mirroring validateXmlText. */
export function validateJsonText(text: string): FormatResult {
  parseJsonOrThrow(text);
  return { output: "This JSON is valid." };
}

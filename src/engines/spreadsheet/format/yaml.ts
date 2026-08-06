import { dump, load } from "js-yaml";
import { ProcessingError } from "@/lib/errors/ProcessingError";
import type { FormatResult } from "./json";

/**
 * js-yaml's `load()` is safe by default in the installed version (5.x) — its tag set
 * has no "unsafe"/function/regexp constructors like older schemas in other YAML
 * libraries, so parsing untrusted YAML can't instantiate arbitrary JS types or execute
 * code. `maxAliases` is set explicitly as defense-in-depth against a "billion
 * laughs"-style anchor/alias expansion attack.
 */
const MAX_ALIASES = 200;

/**
 * Distinct from `convert/yamlTable.ts`'s `parseYamlTable` — that one immediately
 * normalizes the result into a `NormalizedTable` (for CSV/YAML conversions). This
 * preserves the YAML value as-is, for callers that need the raw nested structure
 * (the tree view, and lossless YAML<->JSON/XML conversion) rather than a table.
 * Both `parseYamlTable` and `convert/jsonYaml.ts`'s `yamlTextToJsonText` call this
 * rather than each keeping their own copy of the `load()`/`maxAliases` setup.
 */
export function parseYamlOrThrow(text: string): unknown {
  try {
    return load(text, { maxAliases: MAX_ALIASES });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Invalid YAML.";
    throw new ProcessingError("MALFORMED_FILE", `This isn't valid YAML: ${message}`);
  }
}

/**
 * Re-emits the document with consistent indentation and key order preserved.
 *
 * `noRefs: true` is the load-bearing option, not a stylistic one: js-yaml
 * otherwise replaces a value it has already emitted with an anchor/alias
 * (`&ref_0` / `*ref_0`) whenever the same object appears twice. That's valid
 * YAML and round-trips correctly, but a *formatter* that introduces anchors
 * into a document that had none produces something the author didn't
 * recognise, which is the opposite of what tidying is for.
 *
 * `lineWidth: -1` disables js-yaml's default 80-column wrapping for the same
 * reason — folding a long string across lines is a rewrite, not formatting.
 */
export function formatYaml(text: string, indent: number = 2): FormatResult {
  const value = parseYamlOrThrow(text);
  return { output: dump(value, { indent, noRefs: true, lineWidth: -1 }) };
}

/** The thrown ProcessingError from parseYamlOrThrow *is* the validation failure — this only supplies the positive-confirmation message, mirroring validateJsonText/validateXmlText. */
export function validateYamlText(text: string): FormatResult {
  parseYamlOrThrow(text);
  return { output: "This YAML is valid." };
}

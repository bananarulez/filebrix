import { load } from "js-yaml";
import { ProcessingError } from "@/lib/errors/ProcessingError";

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

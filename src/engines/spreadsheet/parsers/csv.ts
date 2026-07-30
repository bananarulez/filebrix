import Papa from "papaparse";
import { buildNormalizedTable } from "../normalize";
import type { NormalizedTable } from "../types";
import { ProcessingError } from "@/lib/errors/ProcessingError";

const MAX_REPORTED_ROW_ERRORS = 5;

export interface ParseCsvOptions {
  /** Force a delimiter (e.g. "\t" for TSV). Leave unset to auto-detect. */
  delimiter?: string;
}

/**
 * Parses full CSV/TSV text (never line-split beforehand, so Papa Parse can
 * correctly handle quoted fields containing embedded newlines) into a
 * NormalizedTable. Assumes the first row is a header row, which matches
 * what every CSV tool on this site expects.
 */
export function parseCsv(text: string, options: ParseCsvOptions = {}): NormalizedTable {
  const cleaned = stripLeadingBom(text);

  const result = Papa.parse<string[]>(cleaned, {
    delimiter: options.delimiter ?? "",
    header: false,
    skipEmptyLines: "greedy",
    dynamicTyping: false,
  });

  if (result.data.length === 0) {
    if (result.errors.length > 0) {
      throw new ProcessingError(
        "MALFORMED_FILE",
        "This file doesn't look like valid CSV data — no rows could be read from it."
      );
    }
    return { columns: [], rows: [], warnings: [] };
  }

  const table = buildNormalizedTable(result.data, { hasHeader: true });

  if (result.errors.length > 0) {
    const shown = result.errors.slice(0, MAX_REPORTED_ROW_ERRORS);
    const rowWarnings = shown.map(
      (error) => `Row ${(error.row ?? 0) + 1}: ${error.message}.`
    );
    if (result.errors.length > MAX_REPORTED_ROW_ERRORS) {
      rowWarnings.push(
        `...and ${result.errors.length - MAX_REPORTED_ROW_ERRORS} more row${
          result.errors.length - MAX_REPORTED_ROW_ERRORS === 1 ? "" : "s"
        } with issues.`
      );
    }
    table.warnings.push(...rowWarnings);
  }

  return table;
}

function stripLeadingBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

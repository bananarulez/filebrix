import type { DevCategorySlug } from "./types";

export interface DevCategoryDefinition {
  slug: DevCategorySlug;
  name: string;
  description: string;
}

/**
 * The Developer Toolkit sub-categories, in landing-page display order. Each
 * `engine: "developer"` tool declares its `devCategory` on its own
 * `ToolDefinition` (see `registry/tools/*.ts`) — this array is just the
 * category metadata (name/description shown on the landing page card and
 * the category page header), not a second place tool membership is listed.
 *
 * A 5th sub-category, "JSON" (structured-data-format formatting, validation
 * and conversion — JSON/XML/YAML), lived here originally but was retired
 * once its tools moved to Data Studio, whose `engines/spreadsheet/`
 * implementation already powered every one of them; see PROJECT_LOG.md
 * "Data Studio absorbs JSON/XML/YAML tooling." JSON Diff, the one
 * `devCategory: "json"` tool that *isn't* Spreadsheet-engine-backed, moved
 * into "text" below instead, pairing it with Text Diff (its component
 * sibling) rather than being deleted or left in a dead category.
 */
export const DEV_CATEGORIES: DevCategoryDefinition[] = [
  {
    slug: "text",
    name: "Text",
    description: "Text manipulation and comparison utilities.",
  },
  {
    slug: "encoding",
    name: "Encoding",
    description: "Encoding and decoding utilities.",
  },
  {
    slug: "sql",
    name: "SQL",
    description: "Format SQL and generate SQL statements from CSV data.",
  },
  {
    slug: "utilities",
    name: "Utilities",
    description: "Generators and converters for everyday developer tasks.",
  },
];

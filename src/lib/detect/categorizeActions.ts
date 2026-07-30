import type { ToolCategory, ToolDefinition } from "@/registry/types";

export interface CategorizedActions {
  view: ToolDefinition[];
  convert: ToolDefinition[];
  edit: ToolDefinition[];
  utility: ToolDefinition[];
}

const CATEGORY_KEYS: Record<ToolCategory, keyof CategorizedActions> = {
  view: "view",
  convert: "convert",
  edit: "edit",
  utility: "utility",
};

/** Groups the tools the registry already says accept a format into VIEW/CONVERT/EDIT/TOOLS sections — nothing here can produce a tool that doesn't really exist, since it only ever groups what `getToolsAcceptingFormat` returned. */
export function categorizeActions(tools: ToolDefinition[]): CategorizedActions {
  const result: CategorizedActions = { view: [], convert: [], edit: [], utility: [] };
  for (const tool of tools) {
    result[CATEGORY_KEYS[tool.category]].push(tool);
  }
  return result;
}

export function hasAnyActions(actions: CategorizedActions): boolean {
  return actions.view.length + actions.convert.length + actions.edit.length + actions.utility.length > 0;
}

/**
 * A small, deliberately-curated set of tools that work on arbitrary pasted
 * or opened text regardless of what it actually is — offered only when a
 * file's type couldn't be identified but it still decodes as plain text.
 * Never suggested for unidentified binary data.
 */
export const GENERIC_TEXT_TOOL_SLUGS = ["text-diff", "json-formatter", "hash-generator"];

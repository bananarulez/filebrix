import type { ToolDefinition } from "@/registry/types";

export function makeTool(overrides: Partial<ToolDefinition> = {}): ToolDefinition {
  return {
    id: "id",
    slug: "slug",
    name: "Name",
    routeGroup: "convert",
    category: "convert",
    engine: "spreadsheet",
    description: "description",
    keywords: [],
    acceptedFileTypes: [],
    outputFileTypes: [],
    createProcessor: async () => ({ run: async () => ({ outputs: [] }) }),
    relatedTools: [],
    seo: { title: "title", description: "description" },
    ...overrides,
  };
}

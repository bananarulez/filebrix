# Tool definitions

One file per tool, each exporting a single `ToolDefinition` (see `../types.ts`).

To add a tool:

1. Create `<slug>.ts` here, e.g. `parquet-viewer.ts`.
2. Export a `ToolDefinition` whose `createProcessor` dynamically imports the
   owning engine under `src/engines/<engine>/`.
3. Import and add it to the `tools` array in `../index.ts`.
4. Add the page route under `src/app/<routeGroup>/[slug]/page.tsx` if one
   doesn't already exist for that route group.

Nothing should be added to `tools` without a working page — no placeholder
tools (README.txt §53).

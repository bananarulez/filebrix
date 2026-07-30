import { tools as allTools, searchTools } from "./index";
import { getAppNavItems, type AppNavItem } from "./navigation";
import { getOwningCategorySlug } from "./capabilities";
import { STUDIOS } from "./studios";
import { FILE_FORMAT_LABELS } from "@/lib/detect/formatLabels";
import type { ToolDefinition } from "./types";

export interface AppSearchResult {
  kind: "application";
  slug: string;
  name: string;
  href: string;
}

export interface ToolSearchResult {
  kind: "tool";
  tool: ToolDefinition;
}

export type SiteSearchResult = AppSearchResult | ToolSearchResult;

function toAppResult(item: AppNavItem): AppSearchResult {
  return { kind: "application", slug: item.slug, name: item.name, href: item.href };
}

/**
 * Which Application a tool belongs to, for surfacing it as a search result
 * alongside a matched tool — e.g. searching "Resize" matches Resize Image
 * by name, and this resolves that to Image Studio even though "Resize"
 * isn't one of Image Studio's own top-level capability labels (it's a
 * sub-action inside the Edit tab's own action picker, one level deeper
 * than `registry/studios.ts` tracks). The engine-to-Application resolution
 * itself lives in `getOwningCategorySlug` (registry/capabilities.ts), shared
 * with the tool-page breadcrumbs so the two can't disagree.
 */
function findOwningApp(tool: ToolDefinition, appNavItems: AppNavItem[]): AppNavItem | undefined {
  const slug = getOwningCategorySlug(tool);
  return appNavItems.find((item) => item.slug === slug);
}

/**
 * Global, entirely client-side site search — Applications (by name,
 * capability, and accepted file format) plus individual tools, in one
 * ranked list with Applications always ordered before tools. Runs purely
 * against registry data already in the bundle: no network request, no
 * server-side index. Applications are deduplicated (a query can match an
 * Application through more than one signal — e.g. "csv" matches Data
 * Studio's accepted formats *and* several of its tools) while preserving
 * first-matched order, so a broad query like "PDF" (which matches PDF
 * Studio by name directly) and a narrow one like "Resize" (which only
 * reaches Image Studio via its one matching tool) both surface their
 * owning Application exactly once, ahead of every tool result.
 */
export function searchSite(query: string, toolList: ToolDefinition[] = allTools): SiteSearchResult[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  const appNavItems = getAppNavItems();
  const matchedAppSlugs = new Set<string>();
  const appResults: AppSearchResult[] = [];

  function addApp(item: AppNavItem) {
    if (matchedAppSlugs.has(item.slug)) return;
    matchedAppSlugs.add(item.slug);
    appResults.push(toAppResult(item));
  }

  // 1. Application name or capability (e.g. "PDF" -> PDF Studio, "Analyze"
  //    -> Data Studio / Geospatial Studio, "Encoding" -> Developer Toolkit).
  for (const item of appNavItems) {
    const nameMatches = item.name.toLowerCase().includes(normalized);
    const capabilityMatches = item.capabilities.some((capability) =>
      capability.label.toLowerCase().includes(normalized)
    );
    if (nameMatches || capabilityMatches) addApp(item);
  }

  // 2. Accepted file format (e.g. "csv" or "excel" -> Data Studio) — reuses
  //    the same format labels the Universal File Drop already shows, so a
  //    format search understands both the raw code and its display name.
  for (const studio of STUDIOS) {
    const matchesFormat = studio.acceptedFileTypes.some(
      (format) => format.includes(normalized) || FILE_FORMAT_LABELS[format].toLowerCase().includes(normalized)
    );
    if (matchesFormat) {
      const item = appNavItems.find((candidate) => candidate.slug === studio.categorySlug);
      if (item) addApp(item);
    }
  }

  // 3. Tools (name/description/keywords — see registry/index.ts#searchTools),
  //    each also surfacing its own owning Application.
  const matchedTools = searchTools(query, toolList);
  for (const tool of matchedTools) {
    const owningApp = findOwningApp(tool, appNavItems);
    if (owningApp) addApp(owningApp);
  }

  const toolResults: ToolSearchResult[] = matchedTools.map((tool) => ({ kind: "tool", tool }));

  return [...appResults, ...toolResults];
}

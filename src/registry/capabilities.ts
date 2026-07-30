import type { AppMode, ToolDefinition } from "./types";
import { tools as allTools, getToolsByEngine } from "./index";
import { STUDIOS, type StudioCategorySlug, type StudioAction } from "./studios";
import { CATEGORIES } from "./categories";

export interface CapabilityConfig {
  /** Owning Application's category slug, e.g. "pdf-tools". */
  categorySlug: StudioCategorySlug;
  /** Owning Application's display name, e.g. "PDF Studio" (from CATEGORIES — rule 8). */
  appName: string;
  /** Capability id, which is also its URL segment, e.g. "pages". */
  id: AppMode;
  /** Capability display label, e.g. "Pages" (from STUDIOS[].actions). */
  label: string;
  description: string;
  /** `/{categorySlug}/{id}` — this page's own canonical path. */
  path: string;
  tools: ToolDefinition[];
}

/**
 * A tool's *navigational* capability: `appEntry.mode` where the tool renders
 * the shared Studio app, else its own explicit `capability` field. Never
 * both — see `ToolDefinition.capability`'s doc comment for why the two
 * fields exist and stay non-duplicative. In practice every Studio-owned
 * tool now takes the `appEntry` branch; the `capability` fallback is kept
 * for a future tool whose page renders bespoke UI rather than the Studio.
 */
export function getToolCapability(tool: ToolDefinition): AppMode | undefined {
  return tool.appEntry?.mode ?? tool.capability;
}

/**
 * The category slug of the Application that owns a tool, resolved the way
 * ownership actually works rather than by a single lookup.
 *
 * `STUDIOS[].relatedEngines` is checked first because it's the one place a
 * Studio's ownership spans more than one engine: Parquet Viewer
 * (`engine: "parquet"`) belongs to Data Studio this way, and no `CATEGORIES`
 * entry has `engine: "parquet"` at all. The `CATEGORIES` fallback covers
 * `engine: "developer"`, which isn't a Studio.
 *
 * `registry/search.ts` needed exactly this lookup first and had a private
 * copy; both now share this one, so a future Application spanning two
 * engines can't be right in search and wrong in breadcrumbs.
 */
export function getOwningCategorySlug(tool: ToolDefinition): string | undefined {
  const studio = STUDIOS.find((s) => s.relatedEngines.includes(tool.engine));
  return studio?.categorySlug ?? CATEGORIES.find((c) => c.engine === tool.engine)?.slug;
}

/**
 * The capability index page a tool belongs under, or `undefined` when it has
 * none — either because the tool has no capability at all (every Developer
 * Toolkit tool, which uses `devCategory` instead) or because its capability
 * deliberately has no index page.
 *
 * Callers must treat `undefined` as "render no capability link", never as an
 * error: a capability with no `indexDescription`, or with zero standalone
 * tools, is intentionally page-less (thin content — see `toConfig` above),
 * and linking to one would be a 404.
 */
export function getCapabilityForTool(
  tool: ToolDefinition,
  toolList: ToolDefinition[] = allTools
): CapabilityConfig | undefined {
  const capability = getToolCapability(tool);
  if (!capability) return undefined;
  const categorySlug = getOwningCategorySlug(tool);
  if (!categorySlug) return undefined;
  return getAllCapabilities(toolList).find(
    (c) => c.categorySlug === categorySlug && c.id === capability
  );
}

/** Every tool belonging to one Application capability, in registry order. */
export function getToolsByCapability(
  categorySlug: StudioCategorySlug,
  capability: AppMode,
  toolList: ToolDefinition[] = allTools
): ToolDefinition[] {
  const studio = STUDIOS.find((s) => s.categorySlug === categorySlug);
  if (!studio) return [];
  const owned = studio.relatedEngines.flatMap((engine) => getToolsByEngine(engine, toolList));
  return owned.filter((tool) => getToolCapability(tool) === capability);
}

function toConfig(
  categorySlug: StudioCategorySlug,
  action: StudioAction,
  toolList: ToolDefinition[]
): CapabilityConfig | null {
  // No `indexDescription` = a Studio-only capability with no standalone
  // tools; deliberately gets no index page (thin content). The registry
  // integrity test asserts the converse — that anything *with* tools has a
  // description — so the two can't silently drift apart.
  if (!action.indexDescription) return null;
  const category = CATEGORIES.find((c) => c.slug === categorySlug);
  if (!category) return null;
  const tools = getToolsByCapability(categorySlug, action.id, toolList);
  if (tools.length === 0) return null;
  return {
    categorySlug,
    appName: category.name,
    id: action.id,
    label: action.label,
    description: action.indexDescription,
    path: `/${categorySlug}/${action.id}`,
    tools,
  };
}

/**
 * Every capability index page that should exist — one per Studio action
 * that has both an `indexDescription` and at least one real tool. Drives
 * the capability pages themselves, their sitemap entries, and the
 * capability links each Studio page renders, so all three can never
 * disagree about which pages exist (rule 8).
 */
export function getAllCapabilities(toolList: ToolDefinition[] = allTools): CapabilityConfig[] {
  return STUDIOS.flatMap((studio) =>
    studio.actions
      .map((action) => toConfig(studio.categorySlug, action, toolList))
      .filter((config): config is CapabilityConfig => config !== null)
  );
}

/** The capabilities belonging to one Application, for its own page's internal links. */
export function getCapabilitiesForStudio(
  categorySlug: StudioCategorySlug,
  toolList: ToolDefinition[] = allTools
): CapabilityConfig[] {
  return getAllCapabilities(toolList).filter((c) => c.categorySlug === categorySlug);
}

/** Throws on an unknown pair, since every caller passes compile-time-known values — a miss means the registries have drifted, not bad input. */
export function getCapabilityConfig(
  categorySlug: StudioCategorySlug,
  capability: AppMode,
  toolList: ToolDefinition[] = allTools
): CapabilityConfig {
  const config = getAllCapabilities(toolList).find(
    (c) => c.categorySlug === categorySlug && c.id === capability
  );
  if (!config) {
    throw new Error(`No capability index page is registered for "${categorySlug}/${capability}".`);
  }
  return config;
}

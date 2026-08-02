import type { ToolProcessor } from "@/engines/shared/types";

export type FileFormat =
  | "csv"
  | "tsv"
  | "xlsx"
  | "xls"
  | "ods"
  | "json"
  | "xml"
  | "yaml"
  | "parquet"
  | "arrow"
  | "pdf"
  | "txt"
  | "markdown"
  | "html"
  | "png"
  | "jpg"
  | "webp"
  | "avif"
  | "svg"
  | "gif"
  | "heic"
  | "geojson"
  | "kml"
  | "kmz"
  | "gpx"
  | "shapefile"
  | "topojson"
  | "sql";

export type Engine =
  | "spreadsheet"
  | "parquet"
  | "pdf"
  | "image"
  | "geospatial"
  | "developer";

export type ToolCategory = "convert" | "view" | "edit" | "utility";

/**
 * Developer Toolkit sub-category (`engine: "developer"` tools only) — Text/
 * JSON/Encoding/SQL/Utilities. Unlike the four Studio apps, Developer
 * Toolkit is intentionally a categorized collection of independent
 * utilities, not a unified tabbed application, so this is a plain
 * navigational grouping rather than an `AppMode`. See `registry/devCategories.ts`.
 */
export type DevCategorySlug = "text" | "encoding" | "sql" | "utilities";

/** Matches the URL prefix a tool is served under, e.g. `/pdf/merge-pdf`. */
export type RouteGroup = "convert" | "pdf" | "tools" | "geo";

export interface ToolSeo {
  title: string;
  description: string;
}

export interface ToolFaqItem {
  question: string;
  answer: string;
}

/** ID of a consolidated multi-operation application. */
export type AppId = "spreadsheet-data" | "pdf-studio" | "image-studio" | "geospatial-studio";

/**
 * Shared across every consolidated app, not namespaced per app — "view"/"edit"/
 * "convert"/"analyze" are Data Studio's tabs, "pages"/"metadata"/"security" are PDF
 * Studio's (PDF Studio's Convert tab reuses "convert" directly, same name and
 * meaning). Additive only when a new app needs a mode an existing one doesn't have.
 */
export type AppMode = "view" | "edit" | "convert" | "analyze" | "pages" | "metadata" | "security";

/**
 * Deep-links this tool's page into a specific mode/format of a shared
 * multi-operation application, instead of the tool owning bespoke UI. The
 * tool keeps its own route/slug/SEO/FAQ (so nothing about search indexing
 * changes) — only its rendered body is swapped for `<App initialMode=...
 * lockedFormat=... />`. See FileBrix Phase 1 plan.
 */
export interface ToolAppEntry {
  app: AppId;
  mode: AppMode;
  /** Omitted for tools that should leave the format picker open (rare for individual tool pages, common for category hub pages). */
  lockedFormat?: FileFormat;
  /** Convert mode only: which output format the picker should default to (e.g. "excel-to-csv" defaults to csv). */
  outputFormat?: FileFormat;
}

export interface ToolDefinition<TOptions = unknown> {
  id: string;
  slug: string;
  name: string;
  routeGroup: RouteGroup;
  category: ToolCategory;
  engine: Engine;
  description: string;
  keywords: string[];
  acceptedFileTypes: FileFormat[];
  outputFileTypes: FileFormat[];
  /**
   * Dynamic import into the owning engine — keeps heavy libraries out of
   * shared/UI bundles. Only conversion tools have one; viewers (e.g.
   * Parquet Viewer) query their engine directly and omit this.
   */
  createProcessor?: () => Promise<ToolProcessor<TOptions>>;
  /** Slugs of other tools, resolved against the registry at render time. */
  relatedTools: string[];
  seo: ToolSeo;
  faq?: ToolFaqItem[];
  /** Present for tools consolidated into a shared multi-operation application. */
  appEntry?: ToolAppEntry;
  /**
   * Which Application capability this tool belongs to, for capability index
   * pages (`/{studio-slug}/{capability}`) and internal linking — the
   * *navigational* answer, distinct from `appEntry`, which is the
   * *rendering* one ("this page mounts the shared Studio app in this mode").
   *
   * Only set it on a tool that has no `appEntry` but still belongs to a
   * Studio. **No registered tool needs this today** — every Studio-owned
   * tool now deep-links into its Studio app via `appEntry`, including the 9
   * JSON/XML/YAML tools that were this field's original (and only) users
   * before their pages became Studio entry points too. It stays as the
   * supported escape hatch for a future Studio tool whose page renders
   * genuinely bespoke UI instead of the Studio app. Everything else derives
   * its capability from `appEntry.mode`, so this is never duplicated data —
   * see `getToolCapability`.
   */
  capability?: AppMode;
  /** Present only for `engine: "developer"` tools — which Developer Toolkit
   * sub-category page (`/developer-tools/{slug}`) lists this tool. */
  devCategory?: DevCategorySlug;
}

import type { AppMode, Engine, FileFormat, ToolFaqItem } from "./types";
import { CATEGORIES } from "./categories";

/** The four category slugs that are unified, multi-tab Studio applications — everything in `CATEGORIES` except Developer Toolkit (deliberately not a Studio, see `categories.ts`). */
export type StudioCategorySlug = "data-studio" | "pdf-tools" | "image-tools" | "geospatial-tools";

export interface StudioAction {
  id: AppMode;
  label: string;
  /**
   * On-page intro + `<meta description>` for this capability's own index
   * page (`/{categorySlug}/{id}`). Required for every capability that has
   * at least one tool — `tests/unit/registryIntegrity.test.ts` enforces
   * that, since TypeScript can't express "required only when tools exist."
   *
   * Absent means the capability exists only *inside* the Studio app and has
   * no standalone tools to index (PDF Studio's Security, Image Studio's
   * View, Geospatial Studio's Analyze) — deliberately no index page, since
   * a page listing zero tools is thin content that would hurt rather than
   * help crawlability.
   */
  indexDescription?: string;
}

/**
 * Implementation-layer configuration for one Studio application — the data
 * `StudioLayout` (the one generic page shell shared by all four Studio
 * pages) renders from. Title/description-for-SEO/engine already have a
 * single source of truth (`CATEGORIES`, per CLAUDE.md rule 8) so they're
 * not repeated here; `getStudioConfig` below merges the two into the one
 * config object a Studio page actually needs.
 */
export interface StudioDefinition {
  categorySlug: StudioCategorySlug;
  /** On-page supporting copy under the H1 — distinct from `CategoryDefinition.description` (which feeds `<meta>` tags only), matching what each page already showed before this was centralized. */
  description: string;
  acceptedFileTypes: FileFormat[];
  actions: StudioAction[];
  defaultAction: AppMode;
  /**
   * Which registry `Engine`s count as this Studio's "related actions."
   * Usually just the category's own engine, but Data Studio is the one
   * case where a Studio's product surface spans two implementation
   * engines — it covers Parquet directly (see CATEGORIES's data-studio
   * entry and PROJECT_LOG §"Data/PDF/Image/Geospatial Studio renames"),
   * even though Parquet Viewer is registered under the separate `"parquet"`
   * engine, not `"spreadsheet"`.
   */
  relatedEngines: Engine[];
  faq: ToolFaqItem[];
}

export const STUDIOS: StudioDefinition[] = [
  {
    categorySlug: "data-studio",
    description:
      "View, edit, convert and analyze CSV, TSV, Excel, ODS, JSON, XML, YAML and Parquet files — entirely in your browser. Switch modes anytime; nothing is ever uploaded.",
    acceptedFileTypes: ["csv", "tsv", "xlsx", "ods", "json", "xml", "yaml", "parquet"],
    actions: [
      {
        id: "view",
        label: "Viewer",
        indexDescription:
          "Open and read CSV, Excel and Parquet files directly in your browser — search, sort and page through large datasets without uploading anything.",
      },
      {
        id: "edit",
        label: "Editor",
        indexDescription:
          "Format, minify and clean up structured data files in your browser — pretty-print JSON and XML, or edit tabular data in a spreadsheet grid.",
      },
      {
        id: "convert",
        label: "Converter",
        indexDescription:
          "Convert between CSV, Excel, JSON, XML, YAML and Parquet in your browser. Every conversion runs locally — your data is never uploaded.",
      },
      {
        id: "analyze",
        label: "Analyzer",
        indexDescription:
          "Validate and profile structured data in your browser — check JSON and XML for syntax errors, or summarize a dataset's columns, types and duplicates.",
      },
    ],
    defaultAction: "view",
    relatedEngines: ["spreadsheet", "parquet"],
    faq: [
      {
        question: "Is my spreadsheet or data file uploaded anywhere?",
        answer:
          "No. Every mode — Viewer, Editor, Converter and Analyzer — processes your file locally in your browser. Nothing is ever sent to a server.",
      },
      {
        question: "Can I switch between modes without re-selecting my file?",
        answer:
          "Yes — drop a file once and switch freely between Viewer, Editor, Converter and Analyzer. The same loaded data, including any edits, carries over to every mode.",
      },
      {
        question: "Do the individual CSV/Excel/Parquet tool pages still work?",
        answer:
          "Yes. Every individual tool (CSV Viewer, CSV to Excel, Parquet Viewer, and the rest) still has its own dedicated page and URL — Data Studio is a superset, not a replacement.",
      },
      {
        question: "Is there a file size limit?",
        answer:
          "There's no server upload limit, since nothing is uploaded. The practical maximum depends on your device's memory and browser.",
      },
    ],
  },
  {
    categorySlug: "pdf-tools",
    description:
      "Merge, split, rotate, reorder, extract and delete pages, convert between PDFs and images or text, and view or remove metadata — entirely in your browser. Switch tabs anytime; nothing is ever uploaded.",
    acceptedFileTypes: ["pdf", "png", "jpg"],
    actions: [
      {
        id: "pages",
        label: "Pages",
        indexDescription:
          "Merge, split, rotate, reorder, extract and delete PDF pages in your browser. Every page operation runs locally — your document is never uploaded.",
      },
      {
        id: "convert",
        label: "Convert",
        indexDescription:
          "Convert PDFs to images or plain text, and build a PDF from images — entirely in your browser, with nothing sent to a server.",
      },
      {
        id: "metadata",
        label: "Metadata",
        indexDescription:
          "Inspect or strip a PDF's title, author, creation date and producer metadata locally in your browser, before you share the file.",
      },
      // No indexDescription: Security is a placeholder tab with no tools —
      // see StudioAction's own doc comment.
      { id: "security", label: "Security" },
    ],
    defaultAction: "pages",
    relatedEngines: ["pdf"],
    faq: [
      {
        question: "Is my PDF uploaded anywhere?",
        answer:
          "No. Merging, splitting, rotating, converting and every other operation happens locally in your browser.",
      },
      {
        question: "Can PDF Studio open password-protected PDFs?",
        answer:
          "Not yet — encrypted PDFs are detected and rejected with a clear message across every tab, since the underlying library has no way to decrypt them locally.",
      },
      {
        question: "Do the individual tool pages (Merge PDF, Split PDF, ...) still work?",
        answer:
          "Yes — every one of the 11 individual PDF tool pages still has its own dedicated URL; PDF Studio is a superset covering all of them in one place.",
      },
      {
        question: "Is password protection or watermarking available?",
        answer:
          "Not yet — the Security tab is a placeholder reserved for planned password-protection support.",
      },
    ],
  },
  {
    categorySlug: "image-tools",
    description:
      "View, edit and convert PNG, JPG, WebP and SVG images, and inspect EXIF metadata — entirely in your browser. Switch tabs anytime; nothing is ever uploaded.",
    acceptedFileTypes: ["png", "jpg", "webp", "svg"],
    actions: [
      // No indexDescription: View is a Studio-only capability (the in-app
      // image viewer) with no standalone tools — see StudioAction's doc comment.
      { id: "view", label: "View" },
      {
        id: "edit",
        label: "Edit",
        indexDescription:
          "Resize, crop, compress, rotate and flip images in your browser. Batch-process many at once and download them individually or as a .zip.",
      },
      {
        id: "convert",
        label: "Convert",
        indexDescription:
          "Convert between PNG, JPG, WebP and SVG in your browser using your device's own image decoder — no upload, no quality-destroying round trip through a server.",
      },
      {
        id: "metadata",
        label: "Metadata",
        indexDescription:
          "View a photo's EXIF metadata — camera, capture date and GPS location — or strip it entirely before sharing. Both run locally in your browser.",
      },
    ],
    defaultAction: "view",
    relatedEngines: ["image"],
    faq: [
      {
        question: "Are my photos uploaded anywhere?",
        answer:
          "No. Every conversion and edit runs locally in your browser using the Canvas API — nothing is ever sent to a server.",
      },
      {
        question: "Is EXIF orientation handled automatically?",
        answer:
          "Yes — your browser applies EXIF orientation on decode, so output images are already correctly oriented with no extra step.",
      },
      {
        question: "Do the individual tool pages (Resize Image, PNG to JPG, ...) still work?",
        answer:
          "Yes — every one of the 13 individual image tool pages still has its own dedicated URL; Image Studio is a superset covering all of them in one place.",
      },
      {
        question: "Is watermarking available?",
        answer: "Not yet — the Watermark tab is a placeholder reserved for a planned feature.",
      },
    ],
  },
  {
    categorySlug: "geospatial-tools",
    description:
      "View, edit, analyze and convert GeoJSON, KML and GPX files — entirely in your browser. Switch tabs anytime; nothing is ever uploaded.",
    acceptedFileTypes: ["geojson", "kml", "gpx", "csv"],
    actions: [
      {
        id: "view",
        label: "View",
        indexDescription:
          "Open GeoJSON, KML and GPX files on an interactive map in your browser — inspect features, properties and elevation without uploading your data.",
      },
      {
        id: "edit",
        label: "Edit",
        indexDescription:
          "Simplify oversized geometry and validate or repair malformed GeoJSON locally in your browser, with every change explained before you download it.",
      },
      {
        id: "analyze",
        label: "Analyze",
        // Gained an index page once Analyze grew standalone tools of its own
        // (GeoJSON Statistics, plus the derived-geometry actions); it was
        // deliberately page-less while it hosted only the in-app summary.
        indexDescription:
          "Measure and summarize spatial data in your browser — feature counts, geometry types, total length and area, extents and attribute statistics, with nothing uploaded.",
      },
      {
        id: "convert",
        label: "Convert",
        indexDescription:
          "Convert between GeoJSON, KML, GPX and CSV, and translate coordinates between formats — all locally in your browser.",
      },
    ],
    defaultAction: "view",
    relatedEngines: ["geospatial"],
    faq: [
      {
        question: "Are my coordinates or GeoJSON data sent to a map server?",
        answer:
          "No — only anonymous map tile images are fetched from the basemap provider. Your geometries, coordinates and properties are rendered locally and never transmitted.",
      },
      {
        question: "Do the individual tool pages (GeoJSON Viewer, KML to GeoJSON, ...) still work?",
        answer:
          "Yes — every one of the 11 individual geospatial tool pages still has its own dedicated URL; Geospatial Studio is a superset covering all of them in one place.",
      },
      {
        question: "What coordinate reference system is used?",
        answer:
          "WGS84 (EPSG:4326) — the standard for GeoJSON, and what everything normalized through this app's KML/GPX converters uses too.",
      },
      {
        question: "Is editing coordinates directly on the map available?",
        answer: "Not yet — the Coordinate Editing tab is a placeholder reserved for a planned feature.",
      },
    ],
  },
];

export interface StudioConfig extends StudioDefinition {
  title: string;
  engine: Engine;
}

/**
 * Merges a `StudioDefinition` with its `CategoryDefinition` (title, engine —
 * both single-sourced from `CATEGORIES`) into the one config object
 * `StudioLayout` and each Studio page need. Throws on an unknown slug since
 * every caller passes a compile-time-known `StudioCategorySlug`, so a
 * mismatch here means the two registries have drifted apart, not bad input.
 */
export function getStudioConfig(categorySlug: StudioCategorySlug): StudioConfig {
  const studio = STUDIOS.find((s) => s.categorySlug === categorySlug);
  const category = CATEGORIES.find((c) => c.slug === categorySlug);
  if (!studio || !category) {
    throw new Error(`No Studio configuration registered for category slug "${categorySlug}".`);
  }
  return { ...studio, title: category.name, engine: category.engine };
}

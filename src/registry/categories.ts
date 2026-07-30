import type { Engine } from "./types";

export interface CategoryDefinition {
  slug: string;
  name: string;
  engine: Engine;
  description: string;
}

export const CATEGORIES: CategoryDefinition[] = [
  {
    slug: "data-studio",
    name: "Data Studio",
    engine: "spreadsheet",
    description:
      "View, edit, analyze and convert CSV, Excel, JSON, XML, YAML and Parquet files locally in your browser.",
  },
  {
    // Slug stays "pdf-tools" (preserves the existing URL) even though the
    // display name is now "PDF Studio" — PDF Studio is a complete, unified
    // multi-tab application (Pages/Convert/Metadata/Security), not a plain
    // tool list, same reasoning as Data Studio and Image Studio below.
    slug: "pdf-tools",
    name: "PDF Studio",
    engine: "pdf",
    description:
      "Merge, split, rotate, convert and manage metadata on PDF documents locally in your browser.",
  },
  {
    // Slug stays "image-tools" for the same URL-preservation reason as
    // pdf-tools above.
    slug: "image-tools",
    name: "Image Studio",
    engine: "image",
    description: "Convert, resize and compress images entirely in your browser.",
  },
  {
    // Slug stays "geospatial-tools" for the same URL-preservation reason.
    slug: "geospatial-tools",
    name: "Geospatial Studio",
    engine: "geospatial",
    description: "View and convert GeoJSON, KML and GPX files locally.",
  },
  {
    // "Toolkit", not "Tools" or "Studio" — deliberately distinct from both.
    // Not "Studio": this engine stays a collection of independent utilities
    // (UUID Generator, Hash Generator, Base64, ...), not one unified
    // multi-tab workspace like the four above. Not the old flat "Tools"
    // list either: with 20+ tools, Developer Toolkit is organized into
    // sub-category pages (Text/Encoding/SQL/Utilities — see
    // `registry/devCategories.ts`) reached from this page's category
    // cards, rather than one long filterable list. Slug stays
    // "developer-tools" (URL-preservation, same reasoning as the three
    // above); only the display name and this page's content changed. A
    // former 5th sub-category, JSON, moved to Data Studio — see
    // PROJECT_LOG.md "Data Studio absorbs JSON/XML/YAML tooling."
    slug: "developer-tools",
    name: "Developer Toolkit",
    engine: "developer",
    description:
      "Browse developer utilities by category — Text, Encoding, SQL and Utilities — entirely in your browser.",
  },
];

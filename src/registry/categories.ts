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
    // Renamed from "pdf-tools" so the URL matches the display name, the way
    // /data-studio always has — PDF Studio is a complete, unified multi-tab
    // application (View/Pages/Convert/Metadata/Security), not a plain tool
    // list. The old slug (and every capability page under it) permanently
    // redirects here — see `next.config.ts#redirects()`. Same for the two
    // below.
    slug: "pdf-studio",
    name: "PDF Studio",
    engine: "pdf",
    description:
      "Read, merge, split, rotate, convert and manage metadata on PDF documents locally in your browser.",
  },
  {
    // Renamed from "image-tools", same reasoning and same redirect treatment
    // as pdf-studio above.
    slug: "image-studio",
    name: "Image Studio",
    engine: "image",
    description: "Convert, resize and compress images entirely in your browser.",
  },
  {
    // Renamed from "geospatial-tools", same reasoning and redirect treatment.
    slug: "geospatial-studio",
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

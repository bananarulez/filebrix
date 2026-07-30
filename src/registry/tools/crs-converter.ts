import type { ToolDefinition } from "../types";

export const crsConverterTool: ToolDefinition = {
  id: "crs-converter",
  slug: "crs-converter",
  name: "CRS Converter",
  routeGroup: "geo",
  category: "convert",
  engine: "geospatial",
  description:
    "Reproject GeoJSON, KML or GPX between coordinate reference systems — WGS 84, Web Mercator, S-JTSK, UTM and more, entirely in your browser.",
  keywords: [
    "crs converter",
    "reproject geojson",
    "coordinate reference system",
    "epsg converter",
    "wgs84 to web mercator",
    "geojson projection",
  ],
  acceptedFileTypes: ["geojson", "kml", "gpx"],
  outputFileTypes: ["geojson"],
  // Rendered by the shared GeospatialStudioApp (Convert tab, locked to
  // "crs-converter") — see app/geo/crs-converter/page.tsx.
  appEntry: { app: "geospatial-studio", mode: "convert" },
  relatedTools: ["coordinate-converter", "geojson-viewer", "geojson-statistics"],
  seo: {
    title: "CRS Converter — Reproject GeoJSON Between Coordinate Systems, Free & Private",
    description:
      "Transform GeoJSON, KML and GPX between any supported coordinate reference system — EPSG:4326, EPSG:3857, S-JTSK (EPSG:5514), ETRS89/UTM and more. Search by EPSG code or name, or paste your own proj4 definition. Runs entirely in your browser; nothing is uploaded.",
  },
  faq: [
    {
      question: "Is my file uploaded anywhere?",
      answer:
        "No. The transformation runs entirely on your device using proj4, which carries every projection definition it needs locally — no lookup service is ever contacted.",
    },
    {
      question: "Which coordinate reference systems are supported?",
      answer:
        "A curated set of global and national systems is built in and searchable by EPSG code, name or alias — including WGS 84 (EPSG:4326), Web Mercator (EPSG:3857), S-JTSK / Krovak East North (EPSG:5514), ETRS89 / UTM zone 33N (EPSG:25833), British National Grid, Lambert-93, RD New and more. For anything not listed, you can paste a proj4 or WKT definition and use that instead.",
    },
    {
      question: "Can it detect my file's coordinate system automatically?",
      answer:
        "Yes, when the file declares one. GeoJSON written against the older 2008 spec carries a \"crs\" member, which is read and used as the source automatically. RFC 7946 removed that member, so many modern files declare nothing — in that case you pick the source yourself rather than the tool guessing, since assuming WGS 84 would silently corrupt a projected file.",
    },
    {
      question: "Are my attributes and geometry types preserved?",
      answer:
        "Yes. Only coordinate values change — feature properties, feature ids, geometry types (including GeometryCollection) and ring structure all pass through untouched, and elevation values are carried across unchanged.",
    },
    {
      question: "Why does the map preview not update for a projected result?",
      answer:
        "The map can only draw WGS 84 longitude/latitude. When you convert to a projected system the preview keeps showing your input, because drawing projected metre coordinates on a lon/lat map would place them nowhere near the right location. The downloaded file is still correct.",
    },
  ],
};

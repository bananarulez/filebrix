import type { ToolDefinition } from "../types";

export const geojsonStatisticsTool: ToolDefinition = {
  id: "geojson-statistics",
  slug: "geojson-statistics",
  name: "GeoJSON Statistics",
  routeGroup: "geo",
  category: "view",
  engine: "geospatial",
  description:
    "Summarize a GeoJSON, KML or GPX file — feature counts, geometry types, total length and area, extent and attribute statistics.",
  keywords: [
    "geojson statistics",
    "geojson feature count",
    "geojson total area",
    "geojson attribute summary",
    "analyze geojson",
  ],
  acceptedFileTypes: ["geojson", "kml", "gpx"],
  outputFileTypes: [],
  // Rendered by the shared GeospatialStudioApp (Analyze tab, locked to "statistics").
  appEntry: { app: "geospatial-studio", mode: "analyze" },
  relatedTools: ["geojson-viewer", "crs-converter", "geojson-validator"],
  seo: {
    title: "GeoJSON Statistics — Feature, Length, Area & Attribute Summary",
    description:
      "Get a full statistical summary of a GeoJSON, KML or GPX file: feature count, geometry-type breakdown, vertex count, total length and area, bounding box, coordinate system and per-attribute min/max/mean. Runs entirely in your browser.",
  },
  faq: [
    {
      question: "Is my file uploaded anywhere?",
      answer: "No. Every statistic is computed locally in your browser.",
    },
    {
      question: "How are length and area calculated?",
      answer:
        "Geodesically, assuming WGS 84 longitude/latitude input — the standard for GeoJSON. If your data is in a projected system, reproject it with the CRS Converter first, otherwise the numbers will be meaningless.",
    },
    {
      question: "What attribute statistics are shown?",
      answer:
        "For every attribute: how many features have it, how many are missing it, and how many distinct values it has. Attributes whose values are essentially all numeric also get min, max and mean.",
    },
    {
      question: "Are features without geometry counted?",
      answer:
        "They are counted as features and reported separately, but excluded from length, area and extent — a null geometry has no measurable size.",
    },
  ],
};

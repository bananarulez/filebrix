import type { ToolDefinition } from "../types";

export const geojsonDissolveTool: ToolDefinition = {
  id: "geojson-dissolve",
  slug: "geojson-dissolve",
  name: "GeoJSON Dissolve",
  routeGroup: "geo",
  category: "edit",
  engine: "geospatial",
  description:
    "Merge touching or overlapping polygons into single shapes, optionally grouped by an attribute — entirely in your browser.",
  keywords: ["geojson dissolve", "dissolve polygons", "merge polygons", "dissolve by attribute", "gis dissolve"],
  acceptedFileTypes: ["geojson", "kml"],
  outputFileTypes: ["geojson"],
  // Rendered by the shared GeospatialStudioApp (Edit tab, locked to "dissolve").
  appEntry: { app: "geospatial-studio", mode: "edit" },
  relatedTools: ["geojson-buffer", "geojson-simplifier", "geojson-validator"],
  seo: {
    title: "GeoJSON Dissolve — Merge Polygons Online, Free & Private",
    description:
      "Dissolve touching or overlapping GeoJSON polygons into single shapes, optionally grouping by an attribute so only polygons sharing a value combine. Preview on a map and download. Nothing is uploaded.",
  },
  faq: [
    {
      question: "Is my file uploaded anywhere?",
      answer: "No. The dissolve runs entirely on your device using Turf.js.",
    },
    {
      question: "What does dissolving by an attribute do?",
      answer:
        "Only polygons sharing the same value for that attribute are merged. Two adjacent polygons in different regions stay separate, which is what makes it useful for building region outlines from smaller units.",
    },
    {
      question: "What happens to my attributes?",
      answer:
        "A dissolved shape has no single source feature, so attributes are dropped — except the attribute you grouped by, which is kept. The tool states this explicitly rather than losing data silently.",
    },
    {
      question: "Why does dissolve fail on some files?",
      answer:
        "Self-intersecting or otherwise invalid polygons make the underlying geometry library fail. Run Validate & Repair first — it reports self-intersections, degenerate rings and duplicate vertices.",
    },
  ],
};

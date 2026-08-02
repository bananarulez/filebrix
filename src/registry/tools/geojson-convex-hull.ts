import type { ToolDefinition } from "../types";

export const geojsonConvexHullTool: ToolDefinition = {
  id: "geojson-convex-hull",
  slug: "geojson-convex-hull",
  name: "GeoJSON Convex Hull",
  routeGroup: "geo",
  category: "utility",
  engine: "geospatial",
  description:
    "Wrap GeoJSON, KML or GPX features in their convex hull — the tightest enclosing polygon, computed in your browser.",
  keywords: ["convex hull", "geojson convex hull", "convex hull online", "enclosing polygon", "hull from points"],
  acceptedFileTypes: ["geojson", "kml", "gpx"],
  outputFileTypes: ["geojson"],
  // Rendered by the shared GeospatialStudioApp (Analyze tab, locked to
  // "convex-hull"). The operation already existed as a Studio-only action with
  // no URL of its own, which made it invisible to search.
  appEntry: { app: "geospatial-studio", mode: "analyze" },
  relatedTools: ["geojson-bounding-box", "geojson-dissolve", "geojson-viewer"],
  seo: {
    title: "GeoJSON Convex Hull — Free Online Tool, No Upload",
    description:
      "Compute the convex hull of points, lines or polygons from GeoJSON, KML or GPX and download it. Runs entirely in your browser — your data is never uploaded.",
  },
  faq: [
    {
      question: "What is a convex hull?",
      answer:
        "The smallest polygon that contains all your features and has no inward dents — the shape a rubber band would take if stretched around every point.",
    },
    {
      question: "How is it different from a bounding box?",
      answer:
        "A bounding box is always an upright rectangle. A convex hull follows the actual outline of your data, so it's a much tighter fit for anything that isn't rectangular.",
    },
    {
      question: "Is my file uploaded anywhere?",
      answer:
        "No. The hull is computed on your device with Turf.js.",
    },
    {
      question: "What if my data has fewer than three points?",
      answer:
        "A hull needs at least three distinct points to enclose an area. With fewer, there's no polygon to produce and the tool says so rather than returning something misleading.",
    },
  ],
};

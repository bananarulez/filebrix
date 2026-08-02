import type { ToolDefinition } from "../types";

export const geojsonBoundingBoxTool: ToolDefinition = {
  id: "geojson-bounding-box",
  slug: "geojson-bounding-box",
  name: "GeoJSON Bounding Box",
  routeGroup: "geo",
  category: "utility",
  engine: "geospatial",
  description:
    "Get the bounding box (extent) of any GeoJSON, KML or GPX file — entirely in your browser.",
  keywords: ["bounding box", "geojson bounding box", "bbox tool", "get extent of geojson", "calculate bbox online"],
  acceptedFileTypes: ["geojson", "kml", "gpx"],
  outputFileTypes: ["geojson"],
  // Rendered by the shared GeospatialStudioApp (Analyze tab, locked to
  // "bounding-box"). The operation already existed as a Studio-only action with
  // no URL of its own, which made it invisible to search.
  appEntry: { app: "geospatial-studio", mode: "analyze" },
  relatedTools: ["geojson-statistics", "geojson-viewer", "geojson-convex-hull"],
  seo: {
    title: "GeoJSON Bounding Box Tool — Free, Private & No Upload",
    description:
      "Calculate the bounding box of GeoJSON, KML or GPX data and download it as a rectangle polygon. Runs entirely in your browser — your file is never uploaded.",
  },
  faq: [
    {
      question: "What is a bounding box?",
      answer:
        "The smallest upright rectangle that contains every feature in your data, given as its west, south, east and north edges. It's the usual way to describe where a dataset is, and what map servers and catalogues expect.",
    },
    {
      question: "Is my file uploaded anywhere?",
      answer:
        "No. The extent is computed on your device with Turf.js — nothing is ever sent to a server.",
    },
    {
      question: "What do I get back?",
      answer:
        "A GeoJSON polygon of the rectangle, which you can download or preview on the map. The corner coordinates are shown alongside it.",
    },
    {
      question: "Does it work with KML and GPX too?",
      answer:
        "Yes. Those are converted to GeoJSON locally first, so the bounding box is computed the same way.",
    },
  ],
};

import type { ToolDefinition } from "../types";

export const geojsonCentroidTool: ToolDefinition = {
  id: "geojson-centroid",
  slug: "geojson-centroid",
  name: "GeoJSON Centroid",
  routeGroup: "geo",
  category: "utility",
  engine: "geospatial",
  description:
    "Find the centroid (center point) of GeoJSON, KML or GPX features — entirely in your browser.",
  keywords: ["geojson centroid", "polygon centroid", "center of polygon", "centroid calculator", "find center point gis"],
  acceptedFileTypes: ["geojson", "kml", "gpx"],
  outputFileTypes: ["geojson"],
  // Rendered by the shared GeospatialStudioApp (Analyze tab, locked to
  // "centroid"). The operation already existed as a Studio-only action with
  // no URL of its own, which made it invisible to search.
  appEntry: { app: "geospatial-studio", mode: "analyze" },
  relatedTools: ["geojson-bounding-box", "geojson-viewer", "geojson-statistics"],
  seo: {
    title: "GeoJSON Centroid Calculator — Free, Private & No Upload",
    description:
      "Calculate the centroid of every feature in a GeoJSON, KML or GPX file and download the result as points. Runs entirely in your browser — nothing is uploaded.",
  },
  faq: [
    {
      question: "What is a centroid?",
      answer:
        "The average position of a shape's geometry — its balance point. For a polygon it's the middle of its area; for a line, the middle of its vertices.",
    },
    {
      question: "Is my file uploaded anywhere?",
      answer:
        "No. Centroids are computed on your device with Turf.js.",
    },
    {
      question: "Can the centroid fall outside the shape?",
      answer:
        "Yes, and that's expected. A crescent or an L-shaped polygon has its centroid outside its own boundary — the centroid is a mathematical average, not a guaranteed interior point.",
    },
    {
      question: "Does each feature get its own centroid?",
      answer:
        "Yes. Every feature in the file produces one point, keeping its original properties.",
    },
  ],
};

import type { ToolDefinition } from "../types";

export const geojsonSimplifierTool: ToolDefinition = {
  id: "geojson-simplifier",
  slug: "geojson-simplifier",
  name: "GeoJSON Simplifier",
  routeGroup: "geo",
  category: "edit",
  engine: "geospatial",
  description: "Reduce a GeoJSON file's vertex count with adjustable tolerance — entirely in your browser.",
  keywords: ["geojson simplifier", "simplify geojson", "reduce geojson size", "geojson vertex reduction"],
  acceptedFileTypes: ["geojson"],
  outputFileTypes: ["geojson"],
  // Rendered by the shared GeospatialStudioApp (Edit tab, locked to
  // "simplify") — see appEntry and app/geo/geojson-simplifier/page.tsx.
  appEntry: { app: "geospatial-studio", mode: "edit" },
  relatedTools: ["geojson-viewer", "geojson-validator", "geojson-to-csv"],
  seo: {
    title: "GeoJSON Simplifier — Free, Private & No Upload",
    description:
      "Reduce a GeoJSON file's vertex count using the Douglas-Peucker algorithm, directly in your browser. Preview the result on a map and see the exact before/after vertex reduction. Nothing is uploaded.",
  },
  faq: [
    {
      question: "Is my GeoJSON file uploaded anywhere?",
      answer: "No. Simplification happens entirely on your device.",
    },
    {
      question: "What algorithm does this use?",
      answer:
        "Douglas-Peucker simplification (via Turf.js's simplify, itself built on simplify-js), with an optional higher-quality, slower mode.",
    },
    {
      question: "What does the tolerance value mean?",
      answer:
        "It's in the same units as your coordinates — degrees, for typical WGS84 GeoJSON. A higher tolerance removes more vertices but changes the shape more; start small and increase if the result still looks too detailed.",
    },
    {
      question: "Why would I want to simplify a GeoJSON file?",
      answer: "Smaller file size and faster rendering — useful for large polygons or tracks with far more detail than a map actually needs to display.",
    },
  ],
};

import type { ToolDefinition } from "../types";

export const geojsonBufferTool: ToolDefinition = {
  id: "geojson-buffer",
  slug: "geojson-buffer",
  name: "GeoJSON Buffer",
  routeGroup: "geo",
  category: "edit",
  engine: "geospatial",
  description:
    "Grow or shrink GeoJSON features by a fixed distance — turn points and lines into polygons, entirely in your browser.",
  keywords: ["geojson buffer", "buffer polygon", "buffer geojson online", "negative buffer", "gis buffer tool"],
  acceptedFileTypes: ["geojson", "kml", "gpx"],
  outputFileTypes: ["geojson"],
  // Rendered by the shared GeospatialStudioApp (Edit tab, locked to "buffer").
  appEntry: { app: "geospatial-studio", mode: "edit" },
  relatedTools: ["geojson-dissolve", "geojson-simplifier", "geojson-viewer"],
  seo: {
    title: "GeoJSON Buffer — Free Online Buffer Tool, No Upload",
    description:
      "Buffer GeoJSON, KML or GPX features by any distance in meters, kilometers, feet or miles. Points and lines become polygons; a negative distance shrinks polygons inward. Preview on a map and download. Runs entirely in your browser.",
  },
  faq: [
    {
      question: "Is my file uploaded anywhere?",
      answer: "No. The buffer is computed on your device with Turf.js — nothing is ever sent to a server.",
    },
    {
      question: "Can I use a negative distance?",
      answer:
        "Yes. A negative distance erodes polygons inward. Features narrower than twice that distance disappear entirely, and the tool reports how many were dropped rather than silently losing them.",
    },
    {
      question: "What happens to points and lines?",
      answer:
        "They become polygons — a buffered point is a circle, a buffered line is a corridor. A negative distance has no meaningful effect on them.",
    },
    {
      question: "Which units are supported?",
      answer: "Meters, kilometers, feet and miles. Distances are measured geodesically, assuming WGS 84 longitude/latitude input.",
    },
  ],
};

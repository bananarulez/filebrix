import type { ToolDefinition } from "../types";

export const gpxViewerTool: ToolDefinition = {
  id: "gpx-viewer",
  slug: "gpx-viewer",
  name: "GPX Viewer",
  routeGroup: "geo",
  category: "view",
  engine: "geospatial",
  description:
    "View a GPX track on a map with distance, elevation gain/loss and an elevation profile — entirely in your browser.",
  keywords: ["gpx viewer", "view gpx", "open gpx", "gpx map", "gpx elevation profile"],
  acceptedFileTypes: ["gpx"],
  outputFileTypes: [],
  // Rendered by the shared GeospatialStudioApp (View tab, locked to "gpx")
  // — see appEntry and app/geo/gpx-viewer/page.tsx.
  appEntry: { app: "geospatial-studio", mode: "view" },
  relatedTools: ["gpx-to-geojson", "gpx-to-kml", "geojson-viewer"],
  seo: {
    title: "GPX Viewer Online — Free, Private & No Upload",
    description:
      "View a GPX track on a map directly in your browser, with distance, elevation gain/loss, min/max elevation and an elevation profile chart. Your file is never uploaded.",
  },
  faq: [
    {
      question: "Is my GPX file uploaded anywhere?",
      answer:
        "No. The track is parsed and rendered entirely on your device. The only network requests this page makes are for basemap tile images — never your track data.",
    },
    {
      question: "How is distance calculated?",
      answer:
        "As the sum of the great-circle distance between each consecutive track point, using the Haversine formula — not a straight line from start to end.",
    },
    {
      question: "What if my GPX file has no elevation data?",
      answer:
        "The map and distance still work; the elevation stats and profile chart are simply omitted, since there's nothing to show.",
    },
    {
      question: "Does it support routes as well as tracks?",
      answer: "Yes — both <trk> tracks and <rte> routes are read and shown the same way.",
    },
  ],
};

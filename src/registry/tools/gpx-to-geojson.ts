import type { ToolDefinition } from "../types";

export const gpxToGeojsonTool: ToolDefinition = {
  id: "gpx-to-geojson",
  slug: "gpx-to-geojson",
  name: "GPX to GeoJSON Converter",
  routeGroup: "geo",
  category: "convert",
  engine: "geospatial",
  description: "Convert a GPX file to GeoJSON entirely in your browser — nothing is uploaded.",
  keywords: ["gpx to geojson", "convert gpx to geojson", "gpx to geojson online"],
  acceptedFileTypes: ["gpx"],
  outputFileTypes: ["geojson"],
  // Rendered by the shared GeospatialStudioApp (Convert tab, locked to
  // "gpx-to-geojson") — see appEntry and app/geo/gpx-to-geojson/page.tsx.
  appEntry: { app: "geospatial-studio", mode: "convert", lockedFormat: "gpx", outputFormat: "geojson" },
  relatedTools: ["gpx-to-kml", "gpx-viewer", "geojson-viewer"],
  seo: {
    title: "GPX to GeoJSON Converter — Free, Private & No Upload",
    description:
      "Convert GPX tracks, routes and waypoints to GeoJSON directly in your browser. Elevation is preserved as a third coordinate value — your file never leaves your device.",
  },
  faq: [
    {
      question: "Is my GPX file uploaded anywhere?",
      answer: "No. The conversion happens entirely on your device, using the browser's own XML parser.",
    },
    {
      question: "What becomes what in the GeoJSON output?",
      answer:
        "Waypoints (<wpt>) become Point features, and tracks/routes (<trk>/<rte>) become LineString features. Elevation, if present, is kept as the third coordinate value ([lon, lat, elevation]).",
    },
    {
      question: "Is it safe to convert a GPX file from an untrusted source?",
      answer:
        "Yes. The browser's XML parser doesn't fetch external resources or resolve external entities, so this can't be used to read files from your device or make network requests (an XXE attack).",
    },
  ],
};

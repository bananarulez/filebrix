import type { ToolDefinition } from "../types";

export const gpxToKmlTool: ToolDefinition = {
  id: "gpx-to-kml",
  slug: "gpx-to-kml",
  name: "GPX to KML Converter",
  routeGroup: "geo",
  category: "convert",
  engine: "geospatial",
  description: "Convert a GPX file to KML entirely in your browser — nothing is uploaded.",
  keywords: ["gpx to kml", "convert gpx to kml", "gpx to kml online"],
  acceptedFileTypes: ["gpx"],
  outputFileTypes: ["kml"],
  // Rendered by the shared GeospatialStudioApp (Convert tab, locked to
  // "gpx-to-kml") — see appEntry and app/geo/gpx-to-kml/page.tsx.
  appEntry: { app: "geospatial-studio", mode: "convert", lockedFormat: "gpx", outputFormat: "kml" },
  relatedTools: ["gpx-to-geojson", "kml-to-geojson", "gpx-viewer"],
  seo: {
    title: "GPX to KML Converter — Free, Private & No Upload",
    description:
      "Convert GPX tracks and waypoints to KML directly in your browser, ready to open in Google Earth. Your file never leaves your device.",
  },
  faq: [
    {
      question: "Is my GPX file uploaded anywhere?",
      answer: "No. The conversion happens entirely on your device — GPX is read as GeoJSON internally, then written out as KML, all locally.",
    },
    {
      question: "What becomes what in the KML output?",
      answer: "Waypoints become <Placemark> Points, and tracks/routes become <Placemark> LineStrings, each inside a <Document>.",
    },
    {
      question: "Can I open the result in Google Earth?",
      answer: "Yes — the output is standard KML 2.2.",
    },
  ],
};

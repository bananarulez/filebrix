import type { ToolDefinition } from "../types";

export const geojsonToKmlTool: ToolDefinition = {
  id: "geojson-to-kml",
  slug: "geojson-to-kml",
  name: "GeoJSON to KML Converter",
  routeGroup: "geo",
  category: "convert",
  engine: "geospatial",
  description: "Convert a GeoJSON file to KML entirely in your browser — nothing is uploaded.",
  keywords: ["geojson to kml", "convert geojson to kml", "geojson to kml online"],
  acceptedFileTypes: ["geojson"],
  outputFileTypes: ["kml"],
  // Rendered by the shared GeospatialStudioApp (Convert tab, locked to
  // "geojson-to-kml") — see appEntry and app/geo/geojson-to-kml/page.tsx.
  appEntry: { app: "geospatial-studio", mode: "convert", lockedFormat: "geojson", outputFormat: "kml" },
  relatedTools: ["kml-to-geojson", "geojson-viewer", "gpx-to-kml"],
  seo: {
    title: "GeoJSON to KML Converter — Free, Private & No Upload",
    description:
      "Convert GeoJSON files to KML directly in your browser. Each feature becomes a Placemark, ready to open in Google Earth — your file never leaves your device.",
  },
  faq: [
    {
      question: "Is my GeoJSON file uploaded anywhere?",
      answer: "No. The conversion happens entirely on your device.",
    },
    {
      question: "What does the KML output look like?",
      answer:
        "Each GeoJSON feature becomes a <Placemark>, with a name (taken from a properties.name field, if present) and its other properties stored as ExtendedData.",
    },
    {
      question: "Which geometry types are supported?",
      answer: "Point, MultiPoint, LineString, MultiLineString, Polygon, MultiPolygon and GeometryCollection.",
    },
    {
      question: "Can I open the result in Google Earth?",
      answer: "Yes — the output is standard KML 2.2, compatible with Google Earth and other KML-reading software.",
    },
  ],
};

import type { ToolDefinition } from "../types";

export const kmlToGeojsonTool: ToolDefinition = {
  id: "kml-to-geojson",
  slug: "kml-to-geojson",
  name: "KML to GeoJSON Converter",
  routeGroup: "geo",
  category: "convert",
  engine: "geospatial",
  description: "Convert a KML file to GeoJSON entirely in your browser — nothing is uploaded.",
  keywords: ["kml to geojson", "convert kml to geojson", "kml to geojson online"],
  acceptedFileTypes: ["kml"],
  outputFileTypes: ["geojson"],
  // Rendered by the shared GeospatialStudioApp (Convert tab, locked to
  // "kml-to-geojson") — see appEntry and app/geo/kml-to-geojson/page.tsx.
  appEntry: { app: "geospatial-studio", mode: "convert", lockedFormat: "kml", outputFormat: "geojson" },
  relatedTools: ["geojson-to-kml", "geojson-viewer", "gpx-to-kml"],
  seo: {
    title: "KML to GeoJSON Converter — Free, Private & No Upload",
    description:
      "Convert KML files to GeoJSON directly in your browser. Placemarks, folders and extended data are handled locally — your file never leaves your device.",
  },
  faq: [
    {
      question: "Is my KML file uploaded anywhere?",
      answer: "No. Parsing and conversion both happen locally in your browser, using the browser's own XML parser.",
    },
    {
      question: "Is it safe to convert a KML file from an untrusted source?",
      answer:
        "Yes. The browser's XML parser doesn't fetch external resources or resolve external entities, so this can't be used to read files from your device or make network requests (an XXE attack), even with a maliciously crafted file.",
    },
    {
      question: "What KML elements are supported?",
      answer:
        "Placemarks with Point, LineString, Polygon and MultiGeometry, including their names and extended data, which become GeoJSON feature properties.",
    },
    {
      question: "What about ground overlays or styles?",
      answer:
        "Ground overlays and Placemark styling (icons, colors) don't have a direct GeoJSON equivalent and aren't carried over — only geometry and feature data are converted.",
    },
  ],
};

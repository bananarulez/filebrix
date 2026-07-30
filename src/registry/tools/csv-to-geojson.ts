import type { ToolDefinition } from "../types";

export const csvToGeojsonTool: ToolDefinition = {
  id: "csv-to-geojson",
  slug: "csv-to-geojson",
  name: "CSV to GeoJSON Converter",
  routeGroup: "geo",
  category: "convert",
  engine: "geospatial",
  description: "Convert CSV rows with latitude/longitude columns into GeoJSON points — entirely in your browser.",
  keywords: ["csv to geojson", "convert csv to geojson", "csv coordinates to geojson", "lat lon csv to geojson"],
  acceptedFileTypes: ["csv"],
  outputFileTypes: ["geojson"],
  // Rendered by the shared GeospatialStudioApp (Convert tab, locked to
  // "csv-to-geojson") — see appEntry and app/geo/csv-to-geojson/page.tsx.
  appEntry: { app: "geospatial-studio", mode: "convert", lockedFormat: "csv", outputFormat: "geojson" },
  relatedTools: ["geojson-to-csv", "geojson-viewer", "coordinate-converter"],
  seo: {
    title: "CSV to GeoJSON Converter — Free, Private & No Upload",
    description:
      "Convert a CSV file with latitude/longitude columns into a GeoJSON Point FeatureCollection directly in your browser. Columns are auto-detected but always correctable — your file never leaves your device.",
  },
  faq: [
    {
      question: "Is my CSV file uploaded anywhere?",
      answer: "No. Parsing and conversion both happen locally in your browser.",
    },
    {
      question: "How are the latitude/longitude columns chosen?",
      answer:
        "Common header names (lat, latitude, lon, lng, longitude, x, y) are detected automatically, but you can always pick different columns before converting.",
    },
    {
      question: "What happens to rows with bad or missing coordinates?",
      answer: "They're skipped, and you'll see how many were skipped — the conversion doesn't fail because of a few bad rows.",
    },
    {
      question: "What happens to the other columns?",
      answer: "Every other column becomes a property on the resulting Point feature.",
    },
  ],
};

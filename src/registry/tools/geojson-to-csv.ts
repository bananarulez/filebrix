import type { ToolDefinition } from "../types";

export const geojsonToCsvTool: ToolDefinition = {
  id: "geojson-to-csv",
  slug: "geojson-to-csv",
  name: "GeoJSON to CSV Converter",
  routeGroup: "geo",
  category: "convert",
  engine: "geospatial",
  description: "Convert a GeoJSON file to CSV — coordinates and properties as columns — entirely in your browser.",
  keywords: ["geojson to csv", "convert geojson to csv", "geojson to csv online"],
  acceptedFileTypes: ["geojson"],
  outputFileTypes: ["csv"],
  // Rendered by the shared GeospatialStudioApp (Convert tab, locked to
  // "geojson-to-csv") — see appEntry and app/geo/geojson-to-csv/page.tsx.
  appEntry: { app: "geospatial-studio", mode: "convert", lockedFormat: "geojson", outputFormat: "csv" },
  relatedTools: ["csv-to-geojson", "geojson-viewer", "geojson-validator"],
  seo: {
    title: "GeoJSON to CSV Converter — Free, Private & No Upload",
    description:
      "Convert GeoJSON features to a CSV file directly in your browser, with a representative longitude/latitude and every property as its own column. Your file never leaves your device.",
  },
  faq: [
    {
      question: "Is my GeoJSON file uploaded anywhere?",
      answer: "No. The conversion happens entirely on your device.",
    },
    {
      question: "What columns does the CSV have?",
      answer:
        "geometry_type, longitude, latitude, followed by one column per property key found across all features. Missing values are left blank.",
    },
    {
      question: "What coordinate is used for a Polygon or LineString?",
      answer:
        "For a Point, its own coordinates. For a MultiPoint or LineString, its first vertex. For anything with an area or multiple parts (Polygon, MultiPolygon, MultiLineString), the center of its bounding box — an approximation, not a true geometric centroid.",
    },
    {
      question: "What happens to nested or array-valued properties?",
      answer: "They're written into their cell as JSON text, so no information is lost.",
    },
  ],
};

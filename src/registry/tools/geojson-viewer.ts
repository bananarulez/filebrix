import type { ToolDefinition } from "../types";

export const geojsonViewerTool: ToolDefinition = {
  id: "geojson-viewer",
  slug: "geojson-viewer",
  name: "GeoJSON Viewer",
  routeGroup: "geo",
  category: "view",
  engine: "geospatial",
  description:
    "Open and view GeoJSON files on a map, with feature counts, geometry types and a property preview — entirely in your browser.",
  keywords: ["geojson viewer", "view geojson", "open geojson", "geojson map", "geojson online"],
  acceptedFileTypes: ["geojson"],
  outputFileTypes: [],
  // Rendered by the shared GeospatialStudioApp (View tab, locked to
  // "geojson") — see appEntry and app/geo/geojson-viewer/page.tsx.
  appEntry: { app: "geospatial-studio", mode: "view" },
  relatedTools: ["geojson-validator", "geojson-simplifier", "geojson-to-kml", "geojson-to-csv"],
  seo: {
    title: "GeoJSON Viewer Online — Free, Private & No Upload",
    description:
      "View GeoJSON files on a map directly in your browser, with feature counts, geometry types, bounding box and a property preview. Your file is never uploaded.",
  },
  faq: [
    {
      question: "Is my GeoJSON file uploaded anywhere?",
      answer:
        "No. The file is parsed and rendered entirely on your device. The only network requests this page makes are for basemap tile images — never your geometries, coordinates or properties.",
    },
    {
      question: "Which geometry types are supported?",
      answer: "Point, MultiPoint, LineString, MultiLineString, Polygon and MultiPolygon.",
    },
    {
      question: "Does the map zoom to my data automatically?",
      answer: "Yes — the map fits to your dataset's bounding box as soon as it loads.",
    },
    {
      question: "What if my GeoJSON has structural problems?",
      answer:
        "The viewer is tolerant of individual malformed features and will still show what it can. For a detailed list of problems, use the GeoJSON Validator.",
    },
    {
      question: "How large a file can I open?",
      answer:
        "There's no server upload limit, since nothing is uploaded. The practical maximum depends on your device's memory and browser.",
    },
  ],
};

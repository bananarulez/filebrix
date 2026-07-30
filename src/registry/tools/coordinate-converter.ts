import type { ToolDefinition } from "../types";

export const coordinateConverterTool: ToolDefinition = {
  id: "coordinate-converter",
  slug: "coordinate-converter",
  name: "Coordinate Converter",
  routeGroup: "geo",
  category: "utility",
  engine: "geospatial",
  description:
    "Convert coordinates between decimal degrees, DMS, degrees-decimal-minutes and UTM — paste text, entirely in your browser.",
  keywords: [
    "coordinate converter",
    "lat long converter",
    "dms to decimal degrees",
    "decimal degrees to utm",
    "utm converter",
  ],
  acceptedFileTypes: [],
  outputFileTypes: [],
  // Rendered by the shared GeospatialStudioApp (Convert tab, locked to
  // "coordinate-converter") — see appEntry and app/geo/coordinate-converter/page.tsx.
  appEntry: { app: "geospatial-studio", mode: "convert" },
  relatedTools: ["csv-to-geojson", "geojson-viewer"],
  seo: {
    title: "Coordinate Converter — Free, Private & No Upload",
    description:
      "Convert coordinates between decimal degrees, degrees/minutes/seconds, degrees-decimal-minutes and UTM directly in your browser. Paste a list — the format of each line is detected automatically.",
  },
  faq: [
    {
      question: "Are my coordinates sent anywhere?",
      answer: "No. Every conversion runs locally in your browser.",
    },
    {
      question: "Which formats are supported?",
      answer:
        "Decimal degrees (40.7128, -74.0060), degrees/minutes/seconds (40°42'46\"N 74°0'22\"W), degrees-decimal-minutes (40°42.77'N 74°0.36'W), and UTM (18T 583960 4507523).",
    },
    {
      question: "How is the input format detected?",
      answer:
        "Each line is checked independently against every supported format's pattern, so you can paste a mixed list — lines that don't match anything are reported, not silently dropped.",
    },
    {
      question: "How accurate is the UTM conversion?",
      answer:
        "It uses the standard WGS84 ellipsoid transverse Mercator projection, accurate to within about a meter for typical use — not intended for surveying-grade work.",
    },
  ],
};

import type { ToolDefinition } from "../types";

export const topojsonToGeojsonTool: ToolDefinition = {
  id: "topojson-to-geojson",
  slug: "topojson-to-geojson",
  name: "TopoJSON to GeoJSON Converter",
  routeGroup: "geo",
  category: "convert",
  engine: "geospatial",
  description:
    "Convert a TopoJSON topology to standard GeoJSON in your browser — nothing is uploaded.",
  keywords: [
    "topojson to geojson",
    "convert topojson",
    "topojson converter online",
    "open topojson file",
  ],
  acceptedFileTypes: ["topojson"],
  outputFileTypes: ["geojson"],
  appEntry: {
    app: "geospatial-studio",
    mode: "convert",
    lockedFormat: "topojson",
    outputFormat: "geojson",
  },
  relatedTools: ["geojson-viewer", "geojson-to-kml", "shapefile-to-geojson"],
  seo: {
    title: "TopoJSON to GeoJSON Converter — Free, Private & No Upload",
    description:
      "Convert TopoJSON topologies to plain GeoJSON directly in your browser. Arcs are decoded and every named object is expanded into features — your file never leaves your device.",
  },
  faq: [
    {
      question: "What's the difference between TopoJSON and GeoJSON?",
      answer:
        "TopoJSON stores shared borders once as 'arcs' instead of repeating them in every neighbouring shape, which makes files considerably smaller. GeoJSON repeats the coordinates, so it's larger but understood by far more tools.",
    },
    {
      question: "Is my file uploaded anywhere?",
      answer: "No. The conversion runs entirely in your browser.",
    },
    {
      question: "What if the topology contains several objects?",
      answer:
        "Each named object is expanded and merged into one GeoJSON FeatureCollection, with the object's name kept as a 'layer' property so you can still tell the features apart.",
    },
    {
      question: "Can I convert GeoJSON back to TopoJSON?",
      answer:
        "Not currently. Building a topology means detecting which borders are shared between shapes — a genuinely different and much heavier computation than reading one, so it isn't offered here.",
    },
  ],
};

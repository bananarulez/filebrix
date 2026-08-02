import type { ToolDefinition } from "../types";

export const mapTileCalculatorTool: ToolDefinition = {
  id: "map-tile-calculator",
  slug: "map-tile-calculator",
  name: "Map Tile Calculator",
  routeGroup: "geo",
  category: "utility",
  engine: "geospatial",
  description:
    "Convert a longitude, latitude and zoom level into XYZ map tile coordinates and the tile's bounds — in your browser.",
  keywords: ["map tile calculator", "lat long to tile", "slippy map tile", "xyz tile coordinates", "tile z x y calculator"],
  acceptedFileTypes: [],
  outputFileTypes: [],
  // Paste-first, like the Coordinate Converter: no file is ever read, so
  // the Studio hides its drop zone for this action.
  appEntry: { app: "geospatial-studio", mode: "convert" },
  relatedTools: ["utm-zone-finder", "coordinate-converter", "geojson-bounding-box"],
  seo: {
    title: "Map Tile Calculator — Lat/Lon to XYZ Tile, No Upload",
    description:
      "Convert longitude, latitude and zoom into slippy-map XYZ tile coordinates, including the TMS Y value and the tile's own bounding box. Runs entirely in your browser.",
  },
  faq: [
    {
      question: "What are XYZ map tiles?",
      answer:
        "Web maps are served as a pyramid of 256-pixel square images. At zoom level z the world is split into 2^z by 2^z tiles, each addressed by an x and y index. Most tile URLs are templates like /{z}/{x}/{y}.png.",
    },
    {
      question: "What is the TMS Y value?",
      answer:
        "TMS numbers rows from the bottom instead of the top, so its Y is flipped relative to the XYZ scheme. Both are given because tooling in this space is split between the two conventions.",
    },
    {
      question: "Why are the poles excluded?",
      answer:
        "Web Mercator, the projection these tiles use, stretches infinitely towards the poles and is conventionally clipped at about 85.05 degrees. Coordinates beyond that have no tile.",
    },
    {
      question: "Is anything sent to a server?",
      answer:
        "No. No tile is fetched and no coordinate leaves your browser — this only computes which tile would contain your point.",
    },
  ],
};

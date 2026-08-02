import type { ToolDefinition } from "../types";

export const utmZoneFinderTool: ToolDefinition = {
  id: "utm-zone-finder",
  slug: "utm-zone-finder",
  name: "UTM Zone Finder",
  routeGroup: "geo",
  category: "utility",
  engine: "geospatial",
  description:
    "Find the UTM zone, latitude band and EPSG code for any longitude and latitude — entirely in your browser.",
  keywords: ["utm zone finder", "what utm zone am i in", "utm zone lookup", "find utm zone from coordinates", "utm epsg code"],
  acceptedFileTypes: [],
  outputFileTypes: [],
  // Paste-first, like the Coordinate Converter: no file is ever read, so
  // the Studio hides its drop zone for this action.
  appEntry: { app: "geospatial-studio", mode: "convert" },
  relatedTools: ["coordinate-converter", "crs-converter", "map-tile-calculator"],
  seo: {
    title: "UTM Zone Finder — Free Online Lookup, No Upload",
    description:
      "Enter a longitude and latitude to get its UTM zone, latitude band, hemisphere and EPSG code. Handles the Norway and Svalbard exceptions. Runs entirely in your browser.",
  },
  faq: [
    {
      question: "What is a UTM zone?",
      answer:
        "The world is divided into 60 north-south strips, each 6 degrees of longitude wide, so that a flat metre-based coordinate system can be used with acceptable distortion. Zone numbers run 1 to 60 starting at 180 degrees west.",
    },
    {
      question: "What is the latitude band letter for?",
      answer:
        "Bands run C to X in 8-degree steps and identify how far north or south you are. Together with the zone number they give a grid square reference such as 33U. The letters I and O are skipped so they can't be confused with 1 and 0.",
    },
    {
      question: "Why does the zone sometimes not match a simple calculation?",
      answer:
        "Because the grid has two documented irregularities. Zone 32 is widened over southern Norway, and Svalbard uses only zones 31, 33, 35 and 37. Both are applied here, so the answer matches a real UTM grid.",
    },
    {
      question: "What about the poles?",
      answer:
        "UTM only covers 80 degrees south to 84 degrees north. Beyond that the Universal Polar Stereographic grid is used instead, and this tool says so rather than returning a meaningless zone.",
    },
    {
      question: "Is anything sent to a server?",
      answer:
        "No. This is arithmetic running in your browser — no coordinates leave your device.",
    },
  ],
};

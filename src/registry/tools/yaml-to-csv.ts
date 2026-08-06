import type { ToolDefinition } from "../types";

export const yamlToCsvTool: ToolDefinition = {
  id: "yaml-to-csv",
  slug: "yaml-to-csv",
  name: "YAML to CSV Converter",
  routeGroup: "convert",
  category: "convert",
  engine: "spreadsheet",
  description: "Convert a YAML list of records into a CSV table in your browser, with keys becoming column headers.",
  keywords: ["yaml to csv", "convert yaml to csv", "yaml csv converter"],
  acceptedFileTypes: ["yaml"],
  outputFileTypes: ["csv"],
  // Data Studio's Converter already handled this pair in-app (any of its 8
  // formats to any other); it simply had no URL, so nothing could link to or
  // find it. Same fix as the image Edit actions and the geo Analyze pages.
  appEntry: { app: "spreadsheet-data", mode: "convert", lockedFormat: "yaml", outputFormat: "csv" },
  relatedTools: ["csv-to-yaml", "yaml-to-json", "json-to-csv"],
  seo: {
    title: "YAML to CSV Converter — Free, Private & No Upload",
    description: "Turn a YAML list of records into a CSV table in your browser. Keys become headers; nothing is uploaded.",
  },
  faq: [
    {
      question: "Is my YAML sent anywhere?",
      answer:
        "No. It's parsed and converted entirely on your device.",
    },
    {
      question: "What YAML shape does it expect?",
      answer:
        "A list of records — a top-level sequence of mappings. Each record becomes a row and the union of the keys becomes the header.",
    },
    {
      question: "What happens to nested values?",
      answer:
        "A CSV cell holds one value, so nesting can't survive as a table. If your YAML is deeply nested, YAML to JSON keeps the structure intact.",
    },
    {
      question: "Are multiple YAML documents in one file supported?",
      answer:
        "The first document is converted. Splitting a multi-document file is a separate step this tool doesn't perform.",
    },
  ],
};

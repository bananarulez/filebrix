import type { ToolDefinition } from "../types";

export const csvToJsonTool: ToolDefinition = {
  id: "csv-to-json",
  slug: "csv-to-json",
  name: "CSV to JSON Converter",
  routeGroup: "convert",
  category: "convert",
  engine: "spreadsheet",
  description: "Convert a CSV or TSV file into JSON, as an array of objects or an array of arrays.",
  keywords: ["csv to json", "convert csv to json", "csv to json array", "csv to json objects"],
  acceptedFileTypes: ["csv"],
  outputFileTypes: ["json"],
  relatedTools: ["json-to-csv", "csv-viewer"],
  appEntry: { app: "spreadsheet-data", mode: "convert", lockedFormat: "csv", outputFormat: "json" },
  seo: {
    title: "CSV to JSON Converter — Free, Private & No Upload",
    description:
      "Convert CSV files to JSON directly in your browser, choosing an array of objects (keyed by column) or an array of arrays. Your file never leaves your device.",
  },
  faq: [
    {
      question: "Is my CSV file uploaded anywhere?",
      answer: "No. Parsing and conversion both happen locally in your browser.",
    },
    {
      question: "What JSON shape do I get?",
      answer:
        "You can choose an array of objects (each row becomes an object keyed by its column header — the most common shape for APIs and data pipelines) or an array of arrays (a header row followed by each row's raw values).",
    },
    {
      question: "What happens to empty cells?",
      answer: "Empty cells become JSON null, so missing values are explicit rather than empty strings.",
    },
    {
      question: "Does it handle quoted fields and different delimiters?",
      answer:
        "Yes. The delimiter is auto-detected, and quoted fields — including ones containing commas or line breaks — parse correctly.",
    },
    {
      question: "Is there a file size limit?",
      answer:
        "There's no server upload limit. The practical maximum depends on your device's memory and browser.",
    },
  ],
};

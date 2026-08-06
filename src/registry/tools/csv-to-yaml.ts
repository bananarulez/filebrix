import type { ToolDefinition } from "../types";

export const csvToYamlTool: ToolDefinition = {
  id: "csv-to-yaml",
  slug: "csv-to-yaml",
  name: "CSV to YAML Converter",
  routeGroup: "convert",
  category: "convert",
  engine: "spreadsheet",
  description: "Convert CSV rows into a YAML list of records in your browser, with the header row supplying the keys.",
  keywords: ["csv to yaml", "convert csv to yaml", "csv yaml converter"],
  acceptedFileTypes: ["csv"],
  outputFileTypes: ["yaml"],
  // Data Studio's Converter already handled this pair in-app (any of its 8
  // formats to any other); it simply had no URL, so nothing could link to or
  // find it. Same fix as the image Edit actions and the geo Analyze pages.
  appEntry: { app: "spreadsheet-data", mode: "convert", lockedFormat: "csv", outputFormat: "yaml" },
  relatedTools: ["yaml-to-csv", "csv-to-json", "json-to-yaml"],
  seo: {
    title: "CSV to YAML Converter — Free, Private & No Upload",
    description: "Convert a CSV file into readable YAML in your browser. The header row becomes the keys; nothing is uploaded.",
  },
  faq: [
    {
      question: "Is my CSV uploaded?",
      answer:
        "No. Parsing and YAML generation both happen on your device.",
    },
    {
      question: "What does the output look like?",
      answer:
        "A list of records, one per CSV row, with the header row's column names as keys — the shape most configuration and fixture files use.",
    },
    {
      question: "Are values quoted?",
      answer:
        "Only where YAML requires it. Text that could otherwise be read as a number, a boolean or a date is quoted so it survives a round trip unchanged.",
    },
    {
      question: "Can I go the other way?",
      answer:
        "Yes — the YAML to CSV tool converts a list of records back into a table.",
    },
  ],
};

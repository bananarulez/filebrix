import type { ToolDefinition } from "../types";

export const tsvToCsvTool: ToolDefinition = {
  id: "tsv-to-csv",
  slug: "tsv-to-csv",
  name: "TSV to CSV Converter",
  routeGroup: "convert",
  category: "convert",
  engine: "spreadsheet",
  description: "Convert tab-separated .tsv files to comma-separated CSV in your browser, with quoting handled correctly.",
  keywords: ["tsv to csv", "convert tsv to csv", "tab separated to csv"],
  acceptedFileTypes: ["tsv"],
  outputFileTypes: ["csv"],
  // Data Studio's Converter already handled this pair in-app (any of its 8
  // formats to any other); it simply had no URL, so nothing could link to or
  // find it. Same fix as the image Edit actions and the geo Analyze pages.
  appEntry: { app: "spreadsheet-data", mode: "convert", lockedFormat: "tsv", outputFormat: "csv" },
  relatedTools: ["csv-to-excel", "csv-to-json", "excel-to-csv"],
  seo: {
    title: "TSV to CSV Converter — Free, Private & No Upload",
    description: "Convert tab-separated values to CSV in your browser, with fields containing commas quoted properly. Nothing is uploaded.",
  },
  faq: [
    {
      question: "Is my file uploaded?",
      answer:
        "No. The conversion runs on your device.",
    },
    {
      question: "What happens to fields that contain a comma?",
      answer:
        "They're quoted, and any quote characters inside them are escaped. This is the part a find-and-replace of tabs for commas gets wrong and silently corrupts.",
    },
    {
      question: "Are line breaks inside a field preserved?",
      answer:
        "Yes. A field containing a newline is quoted so it stays one field rather than splitting into two rows.",
    },
    {
      question: "Can I convert TSV to something other than CSV?",
      answer:
        "Yes — once the file is loaded, the Converter can also produce Excel, JSON, XML, YAML or Parquet from it.",
    },
  ],
};

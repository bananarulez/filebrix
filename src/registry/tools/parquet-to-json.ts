import type { ToolDefinition } from "../types";

export const parquetToJsonTool: ToolDefinition = {
  id: "parquet-to-json",
  slug: "parquet-to-json",
  name: "Parquet to JSON Converter",
  routeGroup: "convert",
  category: "convert",
  engine: "parquet",
  description: "Convert Apache Parquet files to JSON locally in your browser, with no Python, pandas or command-line tools needed.",
  keywords: ["parquet to json", "convert parquet to json", "parquet json converter"],
  acceptedFileTypes: ["parquet"],
  outputFileTypes: ["json"],
  // Data Studio's Converter already handled this pair in-app (any of its 8
  // formats to any other); it simply had no URL, so nothing could link to or
  // find it. Same fix as the image Edit actions and the geo Analyze pages.
  appEntry: { app: "spreadsheet-data", mode: "convert", lockedFormat: "parquet", outputFormat: "json" },
  relatedTools: ["parquet-to-csv", "csv-to-parquet", "parquet-viewer"],
  seo: {
    title: "Parquet to JSON Converter — Free, Private & No Upload",
    description: "Convert Parquet to JSON in your browser with a WebAssembly SQL engine. Your data never leaves the tab.",
  },
  faq: [
    {
      question: "Does my file leave my device?",
      answer:
        "No. The Parquet file is read entirely in your browser by DuckDB compiled to WebAssembly.",
    },
    {
      question: "What shape is the JSON?",
      answer:
        "An array of objects by default, with column names as keys — the form most tools and APIs expect. An array of arrays is also available.",
    },
    {
      question: "How are Parquet's typed columns represented?",
      answer:
        "Numbers and booleans stay as JSON numbers and booleans rather than becoming strings; timestamps are written in a readable textual form.",
    },
    {
      question: "Is JSON a good choice for a large Parquet file?",
      answer:
        "Often not. JSON repeats every key on every row, so the output can be several times the size of the Parquet input. CSV is usually the better export for wide or long datasets.",
    },
  ],
};

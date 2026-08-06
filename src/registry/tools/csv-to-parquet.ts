import type { ToolDefinition } from "../types";

export const csvToParquetTool: ToolDefinition = {
  id: "csv-to-parquet",
  slug: "csv-to-parquet",
  name: "CSV to Parquet Converter",
  routeGroup: "convert",
  category: "convert",
  engine: "parquet",
  description: "Convert CSV files to compressed Apache Parquet in your browser, using a SQL engine that runs on your own device.",
  keywords: ["csv to parquet", "convert csv to parquet", "make parquet file", "parquet writer"],
  acceptedFileTypes: ["csv"],
  outputFileTypes: ["parquet"],
  // Data Studio's Converter already handled this pair in-app (any of its 8
  // formats to any other); it simply had no URL, so nothing could link to or
  // find it. Same fix as the image Edit actions and the geo Analyze pages.
  appEntry: { app: "spreadsheet-data", mode: "convert", lockedFormat: "csv", outputFormat: "parquet" },
  relatedTools: ["parquet-to-csv", "parquet-to-json", "csv-to-excel"],
  seo: {
    title: "CSV to Parquet Converter — Free, Private & No Upload",
    description: "Turn a CSV into a compressed, columnar Parquet file in your browser. No Python, no upload, no install.",
  },
  faq: [
    {
      question: "Is my CSV uploaded to generate the Parquet file?",
      answer:
        "No. The Parquet file is written on your device by DuckDB compiled to WebAssembly.",
    },
    {
      question: "Why convert CSV to Parquet at all?",
      answer:
        "Parquet stores data by column and compresses it, so the same dataset is usually far smaller than the CSV and much faster for analytical tools to read. It also records column types, which CSV cannot.",
    },
    {
      question: "Are column types detected?",
      answer:
        "Yes — the engine infers types from the data rather than storing everything as text, which is most of where the size saving comes from.",
    },
    {
      question: "Which tools can read the result?",
      answer:
        "Any standard Parquet reader: pandas, Polars, DuckDB, Spark, BigQuery and the Parquet Viewer here.",
    },
  ],
};

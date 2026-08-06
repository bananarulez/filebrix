import type { ToolDefinition } from "../types";

export const parquetToCsvTool: ToolDefinition = {
  id: "parquet-to-csv",
  slug: "parquet-to-csv",
  name: "Parquet to CSV Converter",
  routeGroup: "convert",
  category: "convert",
  engine: "parquet",
  description: "Convert Apache Parquet files to CSV entirely in your browser, without installing Python, pandas or DuckDB.",
  keywords: ["parquet to csv", "convert parquet to csv", "open parquet file", "parquet converter"],
  acceptedFileTypes: ["parquet"],
  outputFileTypes: ["csv"],
  // Data Studio's Converter already handled this pair in-app (any of its 8
  // formats to any other); it simply had no URL, so nothing could link to or
  // find it. Same fix as the image Edit actions and the geo Analyze pages.
  appEntry: { app: "spreadsheet-data", mode: "convert", lockedFormat: "parquet", outputFormat: "csv" },
  relatedTools: ["parquet-to-json", "csv-to-parquet", "parquet-viewer"],
  seo: {
    title: "Parquet to CSV Converter — Free, Private & No Upload",
    description: "Convert a Parquet file to CSV in your browser using a real SQL engine compiled to WebAssembly. Nothing is uploaded.",
  },
  faq: [
    {
      question: "Is my Parquet file uploaded?",
      answer:
        "No. Parquet is read on your device by DuckDB compiled to WebAssembly — a real analytical database engine running inside the browser tab, not a server.",
    },
    {
      question: "Why is this unusual?",
      answer:
        "Parquet is a columnar binary format, so opening one normally means installing Python with pandas, or DuckDB, or a cloud tool. Doing it in a browser tab without uploading is the part most alternatives can't offer.",
    },
    {
      question: "Is there a size limit?",
      answer:
        "Converting to CSV materializes the whole dataset in memory, so it's bounded by your device's RAM rather than a fixed cap. If you only want to look at a large file, the Parquet Viewer pages through it without materializing it.",
    },
    {
      question: "Are compressed Parquet files supported?",
      answer:
        "Yes. Snappy, gzip and zstd compression are handled by the engine automatically — you don't need to decompress anything first.",
    },
  ],
};

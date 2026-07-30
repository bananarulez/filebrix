import type { ToolDefinition } from "../types";

export const parquetViewerTool: ToolDefinition = {
  id: "parquet-viewer",
  slug: "parquet-viewer",
  name: "Parquet Viewer",
  routeGroup: "tools",
  category: "view",
  engine: "parquet",
  description:
    "View Parquet files instantly in your browser — schema, row counts and a searchable, sortable data preview. Nothing is uploaded.",
  keywords: [
    "parquet viewer",
    "view parquet",
    "open parquet",
    "read parquet",
    "parquet",
    "parquet online",
  ],
  acceptedFileTypes: ["parquet"],
  // Viewer, not a converter — correctly contributes nothing to the
  // conversion matrix.
  outputFileTypes: [],
  // Rendered by the same shared SpreadsheetDataApp as csv-viewer/excel-viewer
  // (see appEntry and app/tools/parquet-viewer/page.tsx) since Data Studio
  // unified Parquet in, but `engine` here stays "parquet" — it reflects which
  // engine code actually powers this tool (src/engines/parquet/), independent
  // of which UI/category page renders it. The /data-tools category page that
  // used to list this tool separately was retired (redirects to /data-studio
  // — see next.config.ts) once Data Studio covered the same ground directly.
  appEntry: { app: "spreadsheet-data", mode: "view", lockedFormat: "parquet" },
  relatedTools: ["csv-viewer", "csv-to-json", "excel-viewer"],
  seo: {
    title: "Parquet Viewer Online — Free, Private & No Upload",
    description:
      "Open and inspect Parquet files directly in your browser. See row counts, column types and a searchable, sortable preview — your file is never uploaded.",
  },
  faq: [
    {
      question: "Is my Parquet file uploaded anywhere?",
      answer:
        "No. The file is read and queried entirely on your device using DuckDB compiled to WebAssembly. It is never sent to a server or any third party.",
    },
    {
      question: "How large a Parquet file can I open?",
      answer:
        "There's no server upload limit, since nothing is uploaded. The practical maximum depends on your device's memory, your browser, and how the file is organized.",
    },
    {
      question: "What Parquet features are supported?",
      answer:
        "Standard Parquet files, including nested types like lists and structs, are supported. Encrypted files or unusual/corrupted files may show an error instead of a preview.",
    },
    {
      question: "Can I sort or search the data?",
      answer:
        "Yes. Click a column header to sort by that column, and use the search box to filter rows — both run locally against the file, without loading the whole dataset into memory.",
    },
    {
      question: "Does this work with very wide tables (many columns)?",
      answer:
        "Yes. The preview scrolls horizontally for wide tables, and search checks the first 30 columns to stay fast on very wide datasets.",
    },
  ],
};

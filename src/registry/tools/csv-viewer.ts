import type { ToolDefinition } from "../types";

export const csvViewerTool: ToolDefinition = {
  id: "csv-viewer",
  slug: "csv-viewer",
  name: "CSV Viewer",
  routeGroup: "tools",
  category: "view",
  engine: "spreadsheet",
  description:
    "Open and browse CSV or TSV files directly in your browser — delimiter auto-detected, nothing uploaded.",
  keywords: ["csv viewer", "view csv", "open csv", "tsv viewer", "read csv online"],
  acceptedFileTypes: ["csv"],
  outputFileTypes: [],
  relatedTools: ["csv-to-excel", "csv-to-json"],
  appEntry: { app: "spreadsheet-data", mode: "view", lockedFormat: "csv" },
  seo: {
    title: "CSV Viewer Online — Free, Private & No Upload",
    description:
      "View CSV and TSV files in your browser with automatic delimiter detection and a fast, scrollable preview. Your file is never uploaded.",
  },
  faq: [
    {
      question: "Does this upload my CSV file?",
      answer:
        "No. The file is read and parsed locally in your browser. It's never sent to a server or any third party.",
    },
    {
      question: "How is the delimiter detected?",
      answer:
        "The viewer automatically detects the most likely delimiter — comma, tab, semicolon or pipe — from the file's content, so tab-separated (TSV) files work the same as comma-separated ones.",
    },
    {
      question: "Can it handle quoted fields and values with line breaks in them?",
      answer:
        "Yes. Quoted fields, embedded commas inside quotes, and multi-line quoted values all parse correctly.",
    },
    {
      question: "How large a CSV file can I open?",
      answer:
        "There's no server upload limit, since nothing is uploaded. The practical maximum depends on your device's memory and browser — large files are parsed off the main thread so the page stays responsive, and only the visible rows are ever rendered.",
    },
    {
      question: "What if my file uses a different text encoding?",
      answer:
        "UTF-8 files, including those with a leading byte-order mark (BOM), are handled automatically.",
    },
  ],
};

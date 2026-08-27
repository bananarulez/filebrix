import type { ToolDefinition } from "../types";

export const excelToJsonTool: ToolDefinition = {
  id: "excel-to-json",
  slug: "excel-to-json",
  name: "Excel to JSON Converter",
  routeGroup: "convert",
  category: "convert",
  engine: "spreadsheet",
  description: "Convert Excel .xlsx and .xls workbooks to JSON in your browser, choosing between an array of objects or an array of arrays.",
  keywords: [
    "excel to json",
    "xlsx to json",
    "xls to json",
    "convert excel to json",
    "spreadsheet to json",
  ],
  acceptedFileTypes: ["xlsx"],
  outputFileTypes: ["json"],
  // Data Studio's Converter already handled this pair in-app (any of its 8
  // formats to any other); it simply had no URL, so nothing could link to or
  // find it. Same fix as the image Edit actions and the geo Analyze pages.
  appEntry: { app: "spreadsheet-data", mode: "convert", lockedFormat: "xlsx", outputFormat: "json" },
  relatedTools: ["json-to-excel", "excel-to-csv", "csv-to-json"],
  // See json-validator.ts for why the shared "— Free, Private & No Upload"
  // suffix was dropped.
  seo: {
    title: "Excel to JSON Converter — XLSX & XLS to JSON",
    description:
      "Convert an Excel workbook to JSON in your browser. Pick the sheet, choose the JSON shape, and get real dates instead of Excel serial numbers. Nothing is uploaded.",
  },
  faq: [
    {
      question: "What shape is the JSON?",
      answer:
        "Your choice. An array of objects uses the header row as keys, which is what most APIs expect; an array of arrays preserves the raw grid including the header row.",
    },
    {
      question: "Which sheet does it convert?",
      answer:
        "The first one by default, and you can switch sheets before converting — each sheet becomes its own JSON document rather than being merged.",
    },
    {
      question: "How are dates handled?",
      answer:
        "Excel stores a date as a number counting days from 1900, so a naive conversion produces values like 45678 instead of a date. Dates are read as the workbook stores them and written in a readable form instead.",
    },
    {
      question: "Do I get formulas or their results?",
      answer:
        "The results. A workbook caches the last computed value of every formula, and that value is what ends up in the JSON — the formula text itself is not carried over.",
    },
    {
      question: "What happens to merged cells?",
      answer:
        "Only the top-left cell of a merged range holds the value; the rest are genuinely empty in the file. Merged headers are the usual reason a converted sheet has blank-looking columns.",
    },
    {
      question: "Will leading zeros survive?",
      answer:
        "Only if the column is stored as text in the workbook. If Excel stored a postcode or product code as a number, the zeros were already gone before the file reached this tool.",
    },
    {
      question: "Is my workbook uploaded to a server?",
      answer:
        "No. The file is read and converted by your browser, on your device. This matters for spreadsheets in particular, which routinely hold payroll, customer lists or financial figures.",
    },
  ],
};

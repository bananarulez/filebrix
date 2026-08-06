import type { ToolDefinition } from "../types";

export const excelToJsonTool: ToolDefinition = {
  id: "excel-to-json",
  slug: "excel-to-json",
  name: "Excel to JSON Converter",
  routeGroup: "convert",
  category: "convert",
  engine: "spreadsheet",
  description: "Convert Excel .xlsx and .xls workbooks to JSON in your browser, choosing between an array of objects or an array of arrays.",
  keywords: ["excel to json", "xlsx to json", "convert excel to json", "spreadsheet to json"],
  acceptedFileTypes: ["xlsx"],
  outputFileTypes: ["json"],
  // Data Studio's Converter already handled this pair in-app (any of its 8
  // formats to any other); it simply had no URL, so nothing could link to or
  // find it. Same fix as the image Edit actions and the geo Analyze pages.
  appEntry: { app: "spreadsheet-data", mode: "convert", lockedFormat: "xlsx", outputFormat: "json" },
  relatedTools: ["json-to-excel", "excel-to-csv", "csv-to-json"],
  seo: {
    title: "Excel to JSON Converter — Free, Private & No Upload",
    description: "Convert an Excel workbook to JSON directly in your browser. Pick the sheet, choose the JSON shape, and download — nothing is uploaded.",
  },
  faq: [
    {
      question: "Is my workbook uploaded to a server?",
      answer:
        "No. The file is read and converted by your browser, on your device. This matters for spreadsheets in particular, which routinely hold payroll, customer lists or financial figures.",
    },
    {
      question: "Which sheet does it convert?",
      answer:
        "The first one by default, and you can switch sheets before converting — each sheet becomes its own JSON document rather than being merged.",
    },
    {
      question: "What shape is the JSON?",
      answer:
        "Your choice. An array of objects uses the header row as keys, which is what most APIs expect; an array of arrays preserves the raw grid including a header row.",
    },
    {
      question: "How are dates and numbers handled?",
      answer:
        "Numbers stay numbers. Dates are read as the workbook stores them and written in a readable form rather than as Excel's internal serial number.",
    },
  ],
};

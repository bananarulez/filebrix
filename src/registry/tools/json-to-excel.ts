import type { ToolDefinition } from "../types";

export const jsonToExcelTool: ToolDefinition = {
  id: "json-to-excel",
  slug: "json-to-excel",
  name: "JSON to Excel Converter",
  routeGroup: "convert",
  category: "convert",
  engine: "spreadsheet",
  description: "Convert JSON to a downloadable Excel .xlsx workbook in your browser, with object keys becoming column headers.",
  keywords: ["json to excel", "json to xlsx", "convert json to spreadsheet", "json to xls"],
  acceptedFileTypes: ["json"],
  outputFileTypes: ["xlsx"],
  // Data Studio's Converter already handled this pair in-app (any of its 8
  // formats to any other); it simply had no URL, so nothing could link to or
  // find it. Same fix as the image Edit actions and the geo Analyze pages.
  appEntry: { app: "spreadsheet-data", mode: "convert", lockedFormat: "json", outputFormat: "xlsx" },
  relatedTools: ["excel-to-json", "json-to-csv", "csv-to-excel"],
  seo: {
    title: "JSON to Excel Converter — Free, Private & No Upload",
    description: "Turn a JSON array into a real .xlsx workbook in your browser, with keys as column headers. Nothing is uploaded.",
  },
  faq: [
    {
      question: "Is my JSON sent anywhere?",
      answer:
        "No. Parsing and workbook generation both happen locally in your browser.",
    },
    {
      question: "What JSON shape does it expect?",
      answer:
        "An array of objects, where each object is a row and its keys become the column headers. An array of arrays also works and is treated as a raw grid.",
    },
    {
      question: "What happens to nested objects and arrays?",
      answer:
        "A spreadsheet cell holds one value, so nested structures can't be represented as a grid. Deeply nested JSON is better suited to the JSON to XML or JSON to YAML tools, which keep the hierarchy.",
    },
    {
      question: "Can I get .xls instead of .xlsx?",
      answer:
        "No. The output is .xlsx, the current Excel format, which Excel, LibreOffice, Numbers and Google Sheets all open.",
    },
  ],
};

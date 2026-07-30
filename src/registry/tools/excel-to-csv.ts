import type { ToolDefinition } from "../types";

export const excelToCsvTool: ToolDefinition = {
  id: "excel-to-csv",
  slug: "excel-to-csv",
  name: "Excel to CSV Converter",
  routeGroup: "convert",
  category: "convert",
  engine: "spreadsheet",
  description: "Convert an XLSX workbook sheet to a CSV file, entirely in your browser.",
  keywords: ["excel to csv", "xlsx to csv", "convert excel to csv", "spreadsheet to csv"],
  acceptedFileTypes: ["xlsx"],
  outputFileTypes: ["csv"],
  relatedTools: ["csv-to-excel", "excel-viewer"],
  appEntry: { app: "spreadsheet-data", mode: "convert", lockedFormat: "xlsx", outputFormat: "csv" },
  seo: {
    title: "Excel to CSV Converter — Free, Private & No Upload",
    description:
      "Convert an Excel XLSX sheet to CSV directly in your browser. Choose the sheet if your workbook has more than one — your file never leaves your device.",
  },
  faq: [
    {
      question: "Is my Excel file uploaded to a server?",
      answer:
        "No. The workbook is read and converted entirely on your device using WebAssembly-based processing — nothing is sent anywhere.",
    },
    {
      question: "What if my workbook has multiple sheets?",
      answer:
        "You'll be able to choose which sheet to convert; only one sheet becomes the output CSV.",
    },
    {
      question: "What happens to formulas and dates?",
      answer:
        "Formulas are converted using their last calculated value, and dates are written out in a standard format — both are called out with a notice so you know before downloading.",
    },
    {
      question: "Are merged cells preserved?",
      answer:
        "A merged range is flattened into its top-left cell's value in the CSV output, since CSV has no concept of merged cells. You'll see a warning when this happens.",
    },
    {
      question: "Is there a file size limit?",
      answer:
        "There's no server upload limit. The practical maximum depends on your device's memory and browser.",
    },
  ],
};

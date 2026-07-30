import type { ToolDefinition } from "../types";

export const csvToExcelTool: ToolDefinition = {
  id: "csv-to-excel",
  slug: "csv-to-excel",
  name: "CSV to Excel Converter",
  routeGroup: "convert",
  category: "convert",
  engine: "spreadsheet",
  description: "Convert a CSV or TSV file into an XLSX workbook, entirely in your browser.",
  keywords: ["csv to excel", "csv to xlsx", "convert csv to excel", "csv to spreadsheet"],
  acceptedFileTypes: ["csv"],
  outputFileTypes: ["xlsx"],
  relatedTools: ["excel-to-csv", "csv-viewer", "csv-to-json"],
  appEntry: { app: "spreadsheet-data", mode: "convert", lockedFormat: "csv", outputFormat: "xlsx" },
  seo: {
    title: "CSV to Excel Converter — Free, Private & No Upload",
    description:
      "Convert CSV files to XLSX directly in your browser. Delimiter auto-detected, quoted and multi-line fields handled correctly — your file never leaves your device.",
  },
  faq: [
    {
      question: "Is my CSV file uploaded to a server?",
      answer:
        "No. The conversion — parsing the CSV and building the XLSX file — happens entirely on your device.",
    },
    {
      question: "Does it handle different delimiters?",
      answer:
        "Yes. The delimiter (comma, tab, semicolon or pipe) is auto-detected from the file's content before conversion.",
    },
    {
      question: "Will number and date-like text be converted to real Excel values?",
      answer:
        "Values are written into the workbook as the text your CSV contained. If you need them recognized as native Excel numbers or dates, format the column in Excel afterwards using its data type tools.",
    },
    {
      question: "Is there a file size limit?",
      answer:
        "There's no server upload limit, since nothing is uploaded. The practical maximum depends on your device's memory and browser.",
    },
    {
      question: "What if my CSV has malformed rows?",
      answer:
        "Rows with more or fewer values than the header are handled gracefully — extra values are dropped and a warning is shown — rather than failing the whole conversion.",
    },
  ],
};

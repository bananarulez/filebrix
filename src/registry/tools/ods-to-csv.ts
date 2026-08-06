import type { ToolDefinition } from "../types";

export const odsToCsvTool: ToolDefinition = {
  id: "ods-to-csv",
  slug: "ods-to-csv",
  name: "ODS to CSV Converter",
  routeGroup: "convert",
  category: "convert",
  engine: "spreadsheet",
  description: "Convert OpenDocument .ods spreadsheets from LibreOffice or OpenOffice to CSV in your browser.",
  keywords: ["ods to csv", "convert ods to csv", "libreoffice calc to csv", "opendocument spreadsheet to csv"],
  acceptedFileTypes: ["ods"],
  outputFileTypes: ["csv"],
  // Data Studio's Converter already handled this pair in-app (any of its 8
  // formats to any other); it simply had no URL, so nothing could link to or
  // find it. Same fix as the image Edit actions and the geo Analyze pages.
  appEntry: { app: "spreadsheet-data", mode: "convert", lockedFormat: "ods", outputFormat: "csv" },
  relatedTools: ["excel-to-csv", "csv-to-excel", "excel-to-json"],
  seo: {
    title: "ODS to CSV Converter — Free, Private & No Upload",
    description: "Convert a LibreOffice or OpenOffice .ods spreadsheet to CSV directly in your browser. Nothing is uploaded.",
  },
  faq: [
    {
      question: "Is my spreadsheet uploaded?",
      answer:
        "No. The .ods file is read and converted on your device.",
    },
    {
      question: "Do I need LibreOffice installed?",
      answer:
        "No. The format is read directly in the browser, so this works on a machine that has no spreadsheet application at all.",
    },
    {
      question: "What about multiple sheets?",
      answer:
        "CSV holds one table, so you choose which sheet to export and convert the others separately if you need them.",
    },
    {
      question: "Are formulas exported?",
      answer:
        "The calculated values are exported, not the formula text — which is what a CSV consumer almost always wants.",
    },
  ],
};

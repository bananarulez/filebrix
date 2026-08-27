import type { ToolDefinition } from "../types";

export const jsonToExcelTool: ToolDefinition = {
  id: "json-to-excel",
  slug: "json-to-excel",
  name: "JSON to Excel Converter",
  routeGroup: "convert",
  category: "convert",
  engine: "spreadsheet",
  description: "Convert JSON to a downloadable Excel .xlsx workbook in your browser, with object keys becoming column headers.",
  keywords: [
    "json to excel",
    "json to xlsx",
    "convert json to excel",
    "json to spreadsheet",
    "json to xls",
    "json into excel",
  ],
  acceptedFileTypes: ["json"],
  outputFileTypes: ["xlsx"],
  // Data Studio's Converter already handled this pair in-app (any of its 8
  // formats to any other); it simply had no URL, so nothing could link to or
  // find it. Same fix as the image Edit actions and the geo Analyze pages.
  appEntry: { app: "spreadsheet-data", mode: "convert", lockedFormat: "json", outputFormat: "xlsx" },
  relatedTools: ["excel-to-json", "json-to-csv", "csv-to-excel"],
  // See json-validator.ts for why the shared "— Free, Private & No Upload"
  // suffix was dropped: it was identical across all 139 tool pages and
  // matched almost none of the real search demand.
  seo: {
    title: "JSON to Excel Converter — JSON to XLSX Online",
    description:
      "Turn a JSON array into a real .xlsx workbook, with keys as column headers. Handles nested data predictably and runs in your browser — nothing is uploaded.",
  },
  faq: [
    {
      question: "What JSON shape does it expect?",
      answer:
        "An array of objects, where each object is a row and its keys become the column headers. An array of arrays also works and is treated as a raw grid.",
    },
    {
      question: "My JSON is one object, not an array. Will it work?",
      answer:
        "A single object converts to a one-row sheet. If the rows you want are nested inside it under a key like results or data, take that inner array as your input — that is the part that is table-shaped.",
    },
    {
      question: "What happens to nested objects and arrays?",
      answer:
        "A spreadsheet cell holds one value, so nested structures cannot be represented as a grid. Flatten them first, or keep the hierarchy with the JSON to XML or JSON to YAML tools instead.",
    },
    {
      question: "What if some objects have keys the others don't?",
      answer:
        "The columns are the union of every key seen, so no data is dropped. Rows missing a key get an empty cell for it.",
    },
    {
      question: "Can I get .xls instead of .xlsx?",
      answer:
        "No. The output is .xlsx, the current Excel format, which Excel, LibreOffice, Numbers and Google Sheets all open. The old .xls binary format has a hard limit of 65,536 rows and is not worth writing new files in.",
    },
    {
      question: "How are dates handled?",
      answer:
        "JSON has no date type, so dates arrive as strings. They are written as text rather than being guessed at and converted, because a wrong guess about day/month order silently corrupts data. Format the column in Excel once it is open.",
    },
    {
      question: "Is my JSON sent anywhere?",
      answer:
        "No. Parsing and workbook generation both happen locally in your browser, which also means there is no upload size limit or request timeout to work around.",
    },
  ],
};

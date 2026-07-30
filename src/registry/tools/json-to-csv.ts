import type { ToolDefinition } from "../types";

export const jsonToCsvTool: ToolDefinition = {
  id: "json-to-csv",
  slug: "json-to-csv",
  name: "JSON to CSV Converter",
  routeGroup: "convert",
  category: "convert",
  engine: "spreadsheet",
  description: "Convert a JSON array of objects, array of arrays, or single object into a CSV file.",
  keywords: ["json to csv", "convert json to csv", "json array to csv", "flatten json"],
  acceptedFileTypes: ["json"],
  outputFileTypes: ["csv"],
  relatedTools: ["csv-to-json", "csv-viewer"],
  appEntry: { app: "spreadsheet-data", mode: "convert", lockedFormat: "json", outputFormat: "csv" },
  seo: {
    title: "JSON to CSV Converter — Free, Private & No Upload",
    description:
      "Convert JSON to CSV directly in your browser — supports an array of objects, an array of arrays, or a single object. Your file never leaves your device.",
  },
  faq: [
    {
      question: "Is my JSON file uploaded anywhere?",
      answer: "No. Parsing and conversion both happen locally in your browser.",
    },
    {
      question: "What JSON shapes are supported?",
      answer:
        "An array of objects (columns come from the union of all keys used across the objects), an array of arrays, a single object (converted to a one-row CSV), and an array of plain values (a single-column CSV).",
    },
    {
      question: "What if my JSON doesn't fit one of those shapes?",
      answer:
        "Rather than guessing and producing a broken CSV, the tool shows a clear message explaining what shape it found and why it can't become a table — for example, a JSON array that mixes objects, arrays and plain values.",
    },
    {
      question: "What happens to nested objects or arrays inside a field?",
      answer:
        "A nested value is converted to a JSON text string for that cell, with a warning, rather than being silently dropped or breaking the conversion.",
    },
    {
      question: "Is there a file size limit?",
      answer:
        "There's no server upload limit. The practical maximum depends on your device's memory and browser.",
    },
  ],
};

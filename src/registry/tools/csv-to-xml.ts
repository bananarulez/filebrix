import type { ToolDefinition } from "../types";

export const csvToXmlTool: ToolDefinition = {
  id: "csv-to-xml",
  slug: "csv-to-xml",
  name: "CSV to XML Converter",
  routeGroup: "convert",
  category: "convert",
  engine: "spreadsheet",
  description: "Convert a CSV file to XML, one <row> element per record — entirely in your browser.",
  keywords: ["csv to xml", "convert csv to xml", "csv to xml online"],
  acceptedFileTypes: ["csv"],
  outputFileTypes: ["xml"],
  relatedTools: ["xml-to-csv", "csv-to-json"],
  appEntry: { app: "spreadsheet-data", mode: "convert", lockedFormat: "csv", outputFormat: "xml" },
  seo: {
    title: "CSV to XML Converter — Free, Private & No Upload",
    description:
      "Convert CSV to XML directly in your browser, with each row becoming a <row> element and each column a child element. Nothing is uploaded.",
  },
  faq: [
    {
      question: "Is my CSV file uploaded anywhere?",
      answer: "No. Parsing and conversion both happen locally in your browser.",
    },
    {
      question: "What does the XML output look like?",
      answer:
        "A <rows> root element containing one <row> element per CSV row, with each column becoming a child element named after its header (for example <name>Alice</name>). An empty cell becomes an empty element.",
    },
    {
      question: "What if a column header isn't a valid XML element name?",
      answer: "It's automatically adjusted into a valid one — for example, spaces become underscores.",
    },
    {
      question: "Does it handle quoted fields and different delimiters?",
      answer: "Yes — the delimiter is auto-detected, and quoted fields (including ones with embedded commas or line breaks) parse correctly.",
    },
    {
      question: "Is there a file size limit?",
      answer: "There's no server upload limit, since nothing is uploaded.",
    },
  ],
};

import type { ToolDefinition } from "../types";

export const xmlToCsvTool: ToolDefinition = {
  id: "xml-to-csv",
  slug: "xml-to-csv",
  name: "XML to CSV Converter",
  routeGroup: "convert",
  category: "convert",
  engine: "spreadsheet",
  description: "Convert a repeating-record XML file to CSV — entirely in your browser.",
  keywords: ["xml to csv", "convert xml to csv", "xml to csv online"],
  acceptedFileTypes: ["xml"],
  outputFileTypes: ["csv"],
  relatedTools: ["csv-to-xml", "json-to-csv"],
  appEntry: { app: "spreadsheet-data", mode: "convert", lockedFormat: "xml", outputFormat: "csv" },
  seo: {
    title: "XML to CSV Converter — Free, Private & No Upload",
    description:
      "Convert XML to CSV directly in your browser, using your browser's own secure XML parser. Requires a repeating record structure — nothing is uploaded.",
  },
  faq: [
    {
      question: "Is my XML file uploaded anywhere?",
      answer:
        "No, and it's parsed with your browser's own built-in XML parser, which never fetches external files or resolves external entities.",
    },
    {
      question: "What XML structure does this expect?",
      answer:
        "A root element whose children all share the same tag name, like <rows><row>...</row><row>...</row></rows> — the shape this tool's own CSV to XML converter produces. Each record's child elements become columns, and its attributes become columns prefixed with @.",
    },
    {
      question: "What happens if my XML doesn't have that shape?",
      answer:
        "You'll get a specific error explaining what was expected and what was found instead — for example, if the root's children have several different tag names — rather than a silently wrong CSV.",
    },
    {
      question: "What if a record has deeply nested elements?",
      answer: "A nested element's content is flattened into that cell as an XML string, with a warning, rather than being dropped.",
    },
    {
      question: "Is there a file size limit?",
      answer: "There's no server upload limit, since nothing is uploaded.",
    },
  ],
};

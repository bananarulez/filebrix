import type { ToolDefinition } from "../types";

export const xmlToJsonTool: ToolDefinition = {
  id: "xml-to-json",
  slug: "xml-to-json",
  name: "XML to JSON Converter",
  routeGroup: "convert",
  category: "convert",
  engine: "spreadsheet",
  // Deep-links into Data Studio: the page renders the shared Studio app
  // in "convert" mode with this tool preselected, rather than owning bespoke UI.
  appEntry: {
    app: "spreadsheet-data",
    mode: "convert",
  },
  description: "Convert XML to JSON using documented, deterministic rules — entirely in your browser.",
  keywords: ["xml to json", "convert xml to json", "xml to json online"],
  acceptedFileTypes: ["xml"],
  outputFileTypes: ["json"],
  relatedTools: ["json-to-xml", "xml-formatter"],
  seo: {
    title: "XML to JSON Converter — Free, Private & No Upload",
    description:
      "Convert XML to JSON directly in your browser using your browser's own secure XML parser. Structural limitations are explained clearly — nothing is uploaded.",
  },
  faq: [
    {
      question: "Is my XML uploaded anywhere?",
      answer:
        "No, and it's parsed using your browser's own built-in XML parser, which doesn't fetch external files or resolve external entities — safe even for XML from an untrusted source.",
    },
    {
      question: "How are elements and attributes converted?",
      answer:
        "An element with only text becomes a plain string. Attributes become \"@name\" keys. An element with child elements becomes an object, one key per distinct child tag name.",
    },
    {
      question: "Can every XML document be converted perfectly?",
      answer:
        "No — and we won't pretend otherwise. A repeated child tag becomes a JSON array, but a single occurrence stays a plain value rather than a 1-item array, so round-tripping can't always tell \"always a list\" apart from \"happened once here.\" Mixed content (text interleaved between child elements) collapses into one #text value, losing its exact position. Comments and processing instructions are dropped. Namespace prefixes (like ns:tag) are kept literally, not resolved.",
    },
    {
      question: "What happens with malformed XML?",
      answer: "You'll see a specific parse error instead of a best-effort, possibly-wrong result.",
    },
    {
      question: "Can I open a file instead of pasting?",
      answer: "Yes, there's an Open file button, or you can paste text directly.",
    },
  ],
};

import type { ToolDefinition } from "../types";

export const xmlFormatterTool: ToolDefinition = {
  id: "xml-formatter",
  slug: "xml-formatter",
  name: "XML Formatter",
  routeGroup: "tools",
  category: "utility",
  engine: "spreadsheet",
  // Deep-links into Data Studio: the page renders the shared Studio app
  // in "edit" mode with this tool preselected, rather than owning bespoke UI.
  appEntry: {
    app: "spreadsheet-data",
    mode: "edit",
  },
  description: "Pretty-print XML with proper indentation — entirely in your browser, using your browser's own XML parser.",
  keywords: ["xml formatter", "xml pretty print", "format xml online", "indent xml"],
  acceptedFileTypes: ["xml"],
  outputFileTypes: ["xml"],
  relatedTools: ["xml-validator", "xml-to-json"],
  seo: {
    title: "XML Formatter Online — Free, Private & No Upload",
    description:
      "Pretty-print XML directly in your browser with correct indentation. Comments, CDATA and processing instructions are preserved. Nothing is uploaded.",
  },
  faq: [
    {
      question: "Is my XML uploaded anywhere?",
      answer:
        "No. Parsing and formatting both happen locally using your browser's own built-in XML parser (DOMParser) — never a server, never a third party.",
    },
    {
      question: "Is this safe to use on XML from an untrusted source?",
      answer:
        "Yes. Browsers' built-in XML parser does not fetch external files or resolve external entities, which is the main risk with untrusted XML (an attack technique called XXE). Nothing this tool parses can reach outside your browser tab.",
    },
    {
      question: "Does formatting change my content?",
      answer:
        "Only insignificant whitespace changes. Elements, attributes, comments, processing instructions and CDATA sections are all preserved — this isn't a lossy conversion like XML to JSON.",
    },
    {
      question: "What if my XML isn't well-formed?",
      answer: "You'll see the specific parse error instead of a formatted result.",
    },
    {
      question: "Can I open a file instead of pasting?",
      answer: "Yes, there's an Open file button, or you can paste text directly.",
    },
  ],
};

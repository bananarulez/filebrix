import type { ToolDefinition } from "../types";

export const xmlValidatorTool: ToolDefinition = {
  id: "xml-validator",
  slug: "xml-validator",
  name: "XML Validator",
  routeGroup: "tools",
  category: "utility",
  engine: "spreadsheet",
  // Deep-links into Data Studio: the page renders the shared Studio app
  // in "analyze" mode with this tool preselected, rather than owning bespoke UI.
  appEntry: {
    app: "spreadsheet-data",
    mode: "analyze",
  },
  description: "Check whether XML is well-formed, with a clear error message if it isn't — entirely in your browser.",
  keywords: ["xml validator", "validate xml online", "check xml", "well-formed xml"],
  acceptedFileTypes: ["xml"],
  outputFileTypes: [],
  relatedTools: ["xml-formatter", "xml-to-json"],
  seo: {
    title: "XML Validator Online — Free, Private & No Upload",
    description:
      "Check whether XML is well-formed directly in your browser, with a specific error message when it isn't. Nothing is uploaded.",
  },
  faq: [
    {
      question: "Is my XML uploaded anywhere?",
      answer: "No. Validation happens locally using your browser's own built-in XML parser.",
    },
    {
      question: "What does 'well-formed' mean here?",
      answer:
        "It checks XML syntax — matching tags, proper nesting, correctly quoted attributes, valid character use — not validation against a specific schema (like an XSD or DTD content model).",
    },
    {
      question: "Is it safe to check XML from an untrusted source?",
      answer:
        "Yes. The browser's XML parser doesn't fetch external files or resolve external entities, so this tool can't be used to read files from your device or make network requests, even with a maliciously crafted file (an XXE attack).",
    },
    {
      question: "What do I get if the XML is invalid?",
      answer: "A specific message describing the problem, generally including its approximate location.",
    },
    {
      question: "Can I open a file instead of pasting?",
      answer: "Yes, there's an Open file button, or you can paste text directly.",
    },
  ],
};

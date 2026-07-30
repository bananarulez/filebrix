import type { ToolDefinition } from "../types";

export const jsonValidatorTool: ToolDefinition = {
  id: "json-validator",
  slug: "json-validator",
  name: "JSON Validator",
  routeGroup: "tools",
  category: "utility",
  engine: "spreadsheet",
  // Deep-links into Data Studio: the page renders the shared Studio app
  // in "analyze" mode with this tool preselected, rather than owning bespoke UI.
  appEntry: {
    app: "spreadsheet-data",
    mode: "analyze",
  },
  description: "Check whether JSON is valid, with a clear error message if it isn't — entirely in your browser.",
  keywords: ["json validator", "validate json online", "check json", "is my json valid"],
  acceptedFileTypes: ["json"],
  outputFileTypes: [],
  relatedTools: ["json-formatter", "json-minifier", "json-diff"],
  seo: {
    title: "JSON Validator Online — Free, Private & No Upload",
    description:
      "Check whether JSON is valid directly in your browser, with a specific parse error when it isn't. Nothing is uploaded.",
  },
  faq: [
    {
      question: "Is my JSON uploaded anywhere?",
      answer: "No. Validation happens locally using your browser's own built-in JSON parser.",
    },
    {
      question: "What do I get if the JSON is invalid?",
      answer: "The specific parse error (for example, a trailing comma or an unquoted key), rather than a generic failure message.",
    },
    {
      question: "Does this check against a schema?",
      answer: "No — it checks JSON syntax only, not the shape or types your application expects (that would need a JSON Schema validator).",
    },
    {
      question: "Can I open a file instead of pasting?",
      answer: "Yes, there's an Open file button, or you can paste text directly.",
    },
  ],
};

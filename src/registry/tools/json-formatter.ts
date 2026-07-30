import type { ToolDefinition } from "../types";

export const jsonFormatterTool: ToolDefinition = {
  id: "json-formatter",
  slug: "json-formatter",
  name: "JSON Formatter",
  routeGroup: "tools",
  category: "utility",
  engine: "spreadsheet",
  // Deep-links into Data Studio: the page renders the shared Studio app
  // in "edit" mode with this tool preselected, rather than owning bespoke UI.
  appEntry: {
    app: "spreadsheet-data",
    mode: "edit",
  },
  description: "Pretty-print JSON with configurable indentation — paste text or open a file, entirely in your browser.",
  keywords: ["json formatter", "json pretty print", "format json online", "json beautifier"],
  acceptedFileTypes: ["json"],
  outputFileTypes: ["json"],
  relatedTools: ["json-validator", "json-minifier", "json-diff", "xml-formatter"],
  seo: {
    title: "JSON Formatter Online — Free, Private & No Upload",
    description:
      "Pretty-print JSON directly in your browser with 2-space, 4-space or tab indentation. Paste text or open a file — nothing is uploaded.",
  },
  faq: [
    {
      question: "Is my JSON uploaded anywhere?",
      answer: "No. Formatting happens locally in your browser, using only JavaScript's own JSON parser.",
    },
    {
      question: "What happens if my JSON is invalid?",
      answer:
        "You'll see the specific parse error instead of a formatted result. For a dedicated pass/fail check, use the JSON Validator.",
    },
    {
      question: "Can I control the indentation?",
      answer: "Yes — choose 2 spaces, 4 spaces, or tabs before formatting.",
    },
    {
      question: "Can I open a file instead of pasting?",
      answer: "Yes, there's an Open file button, or you can just paste text directly into the input box.",
    },
    {
      question: "Is there a size limit?",
      answer: "There's no server upload limit, since nothing is uploaded. Very large pasted text may be slower to format, since it all happens in your browser tab.",
    },
  ],
};

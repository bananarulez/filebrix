import type { ToolDefinition } from "../types";

export const jsonMinifierTool: ToolDefinition = {
  id: "json-minifier",
  slug: "json-minifier",
  name: "JSON Minifier",
  routeGroup: "tools",
  category: "utility",
  engine: "spreadsheet",
  // Deep-links into Data Studio: the page renders the shared Studio app
  // in "edit" mode with this tool preselected, rather than owning bespoke UI.
  appEntry: {
    app: "spreadsheet-data",
    mode: "edit",
  },
  description: "Remove whitespace from JSON to produce a compact, minified version — entirely in your browser.",
  keywords: ["json minifier", "minify json", "compact json", "compress json online"],
  acceptedFileTypes: ["json"],
  outputFileTypes: ["json"],
  relatedTools: ["json-formatter", "csv-to-json"],
  seo: {
    title: "JSON Minifier Online — Free, Private & No Upload",
    description:
      "Minify JSON directly in your browser, removing all insignificant whitespace. Paste text or open a file — nothing is uploaded.",
  },
  faq: [
    {
      question: "Is my JSON uploaded anywhere?",
      answer: "No. Minifying happens locally in your browser.",
    },
    {
      question: "Does minifying change the data?",
      answer:
        "No — only whitespace between tokens is removed. Keys, values, and their order are all preserved exactly.",
    },
    {
      question: "What if my JSON is invalid?",
      answer: "You'll see a clear error describing the problem instead of a minified result.",
    },
    {
      question: "Can I open a file instead of pasting?",
      answer: "Yes, there's an Open file button, or you can paste text directly.",
    },
    {
      question: "How much smaller will my file be?",
      answer:
        "It depends on how it was formatted originally — heavily indented JSON with long property names benefits the most from minifying.",
    },
  ],
};

import type { ToolDefinition } from "../types";

export const trimWhitespaceTool: ToolDefinition = {
  id: "trim-whitespace",
  slug: "trim-whitespace",
  name: "Trim Whitespace",
  routeGroup: "tools",
  category: "utility",
  engine: "developer",
  devCategory: "text",
  description: "Trim leading and trailing whitespace from every line of text — entirely in your browser.",
  keywords: ["trim whitespace", "strip whitespace online", "remove leading trailing spaces"],
  acceptedFileTypes: [],
  outputFileTypes: [],
  relatedTools: ["remove-empty-lines", "normalize-line-endings"],
  seo: {
    title: "Trim Whitespace — Free, Private & No Upload",
    description:
      "Trim leading and trailing whitespace from every line of text directly in your browser. Paste, process, copy or download. Nothing is uploaded.",
  },
  faq: [
    {
      question: "Is my text sent anywhere?",
      answer: "No. Processing happens entirely on your device.",
    },
    {
      question: "Does this affect whitespace in the middle of a line?",
      answer: "No — only leading and trailing whitespace on each line is removed; internal spacing is untouched.",
    },
  ],
};

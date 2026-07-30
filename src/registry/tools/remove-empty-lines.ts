import type { ToolDefinition } from "../types";

export const removeEmptyLinesTool: ToolDefinition = {
  id: "remove-empty-lines",
  slug: "remove-empty-lines",
  name: "Remove Empty Lines",
  routeGroup: "tools",
  category: "utility",
  engine: "developer",
  devCategory: "text",
  description: "Strip blank and whitespace-only lines from a block of text — entirely in your browser.",
  keywords: ["remove empty lines", "remove blank lines", "strip blank lines online"],
  acceptedFileTypes: [],
  outputFileTypes: [],
  relatedTools: ["remove-duplicate-lines", "line-counter", "trim-whitespace"],
  seo: {
    title: "Remove Empty Lines — Free, Private & No Upload",
    description:
      "Remove blank and whitespace-only lines from text directly in your browser. Paste, process, copy or download. Nothing is uploaded.",
  },
  faq: [
    {
      question: "Is my text sent anywhere?",
      answer: "No. Processing happens entirely on your device.",
    },
    {
      question: "What counts as an empty line?",
      answer: "A line that's either completely empty or contains only whitespace (spaces, tabs).",
    },
    {
      question: "Are non-blank lines changed in any way?",
      answer: "No — every other line is kept exactly as-is, in its original order.",
    },
  ],
};

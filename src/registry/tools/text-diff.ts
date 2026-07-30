import type { ToolDefinition } from "../types";

export const textDiffTool: ToolDefinition = {
  id: "text-diff",
  slug: "text-diff",
  name: "Text Diff",
  routeGroup: "tools",
  category: "utility",
  engine: "developer",
  devCategory: "text",
  description: "Compare two blocks of text line by line, entirely in your browser.",
  keywords: ["text diff", "compare text online", "diff checker", "text comparison tool"],
  acceptedFileTypes: [],
  outputFileTypes: [],
  relatedTools: ["json-diff", "json-formatter", "case-converter", "word-counter"],
  seo: {
    title: "Text Diff Checker — Free, Private & No Upload",
    description: "Compare two texts line by line directly in your browser, with additions and deletions highlighted. Nothing is uploaded.",
  },
  faq: [
    {
      question: "Is my text sent anywhere?",
      answer: "No. The comparison runs entirely on your device.",
    },
    {
      question: "What kind of diff is this?",
      answer: "A line-level diff — it shows which whole lines were added, removed, or left unchanged, not individual word or character changes within a line.",
    },
    {
      question: "Can I download the result?",
      answer: "Yes, as a plain text file with +/- prefixes marking additions and deletions.",
    },
  ],
};

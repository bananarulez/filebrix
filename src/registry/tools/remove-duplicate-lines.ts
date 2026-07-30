import type { ToolDefinition } from "../types";

export const removeDuplicateLinesTool: ToolDefinition = {
  id: "remove-duplicate-lines",
  slug: "remove-duplicate-lines",
  name: "Remove Duplicate Lines",
  routeGroup: "tools",
  category: "utility",
  engine: "developer",
  devCategory: "text",
  description: "Remove repeated lines from a block of text, keeping the first occurrence — entirely in your browser.",
  keywords: ["remove duplicate lines", "unique lines", "dedupe lines online", "remove repeated lines"],
  acceptedFileTypes: [],
  outputFileTypes: [],
  relatedTools: ["remove-empty-lines", "sort-lines"],
  seo: {
    title: "Remove Duplicate Lines — Free, Private & No Upload",
    description:
      "Remove duplicate lines from text directly in your browser, keeping each line's first occurrence and original order. Nothing is uploaded.",
  },
  faq: [
    {
      question: "Is my text sent anywhere?",
      answer: "No. Processing happens entirely on your device.",
    },
    {
      question: "Which occurrence is kept?",
      answer: "The first one — later duplicates are removed, and the remaining lines keep their original order.",
    },
    {
      question: "Is the comparison case-sensitive?",
      answer: "Yes — \"Line\" and \"line\" are treated as different lines.",
    },
  ],
};

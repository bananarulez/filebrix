import type { ToolDefinition } from "../types";

export const sortLinesTool: ToolDefinition = {
  id: "sort-lines",
  slug: "sort-lines",
  name: "Sort Lines",
  routeGroup: "tools",
  category: "utility",
  engine: "developer",
  devCategory: "text",
  description: "Sort the lines of a block of text alphabetically, ascending or descending — entirely in your browser.",
  keywords: ["sort lines", "alphabetize lines online", "sort text lines a-z"],
  acceptedFileTypes: [],
  outputFileTypes: [],
  relatedTools: ["reverse-lines", "remove-duplicate-lines"],
  seo: {
    title: "Sort Lines — Free, Private & No Upload",
    description:
      "Sort the lines of a block of text alphabetically, A→Z or Z→A, directly in your browser. Paste, sort, copy or download. Nothing is uploaded.",
  },
  faq: [
    {
      question: "Is my text sent anywhere?",
      answer: "No. Sorting happens entirely on your device.",
    },
    {
      question: "How is the sort order determined?",
      answer: "A standard locale-aware alphabetical comparison, in either ascending (A→Z) or descending (Z→A) order.",
    },
  ],
};

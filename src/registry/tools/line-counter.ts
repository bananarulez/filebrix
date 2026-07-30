import type { ToolDefinition } from "../types";

export const lineCounterTool: ToolDefinition = {
  id: "line-counter",
  slug: "line-counter",
  name: "Line Counter",
  routeGroup: "tools",
  category: "view",
  engine: "developer",
  devCategory: "text",
  description: "Count lines, along with words and characters, live as you type — entirely in your browser.",
  keywords: ["line counter", "count lines", "line count online", "number of lines"],
  acceptedFileTypes: [],
  outputFileTypes: [],
  relatedTools: ["word-counter", "character-counter", "remove-empty-lines"],
  seo: {
    title: "Line Counter — Free, Private & No Upload",
    description:
      "Count lines in a block of text directly in your browser, updated live as you type. Nothing is uploaded.",
  },
  faq: [
    {
      question: "Is my text sent anywhere?",
      answer: "No. Counting happens entirely on your device, recomputed as you type.",
    },
    {
      question: "Does an empty line still count?",
      answer: "Yes — every line break increases the line count, including blank lines.",
    },
    {
      question: "Can I strip blank lines before counting?",
      answer: "Yes — use Remove Empty Lines first, then check the count here.",
    },
  ],
};

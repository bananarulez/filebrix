import type { ToolDefinition } from "../types";

export const characterCounterTool: ToolDefinition = {
  id: "character-counter",
  slug: "character-counter",
  name: "Character Counter",
  routeGroup: "tools",
  category: "view",
  engine: "developer",
  devCategory: "text",
  description: "Count characters, with and without spaces, live as you type — entirely in your browser.",
  keywords: ["character counter", "character count online", "count characters", "letter counter"],
  acceptedFileTypes: [],
  outputFileTypes: [],
  relatedTools: ["word-counter", "line-counter"],
  seo: {
    title: "Character Counter — Free, Private & No Upload",
    description:
      "Count characters, with and without spaces, directly in your browser, updated live as you type. Nothing is uploaded.",
  },
  faq: [
    {
      question: "Is my text sent anywhere?",
      answer: "No. Counting happens entirely on your device, recomputed as you type.",
    },
    {
      question: "Does the count include spaces?",
      answer: "Both figures are shown — total characters, and characters with whitespace removed.",
    },
    {
      question: "Are newlines counted as characters?",
      answer: "Yes — each line break counts as one character in the total.",
    },
  ],
};

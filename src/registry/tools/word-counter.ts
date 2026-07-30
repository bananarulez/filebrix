import type { ToolDefinition } from "../types";

export const wordCounterTool: ToolDefinition = {
  id: "word-counter",
  slug: "word-counter",
  name: "Word Counter",
  routeGroup: "tools",
  category: "view",
  engine: "developer",
  devCategory: "text",
  description: "Count words, characters, lines, sentences and paragraphs live as you type — entirely in your browser.",
  keywords: ["word counter", "word count online", "count words", "text word count"],
  acceptedFileTypes: [],
  outputFileTypes: [],
  relatedTools: ["character-counter", "line-counter", "trim-whitespace"],
  seo: {
    title: "Word Counter — Free, Private & No Upload",
    description:
      "Count words, characters, lines, sentences and paragraphs directly in your browser, updated live as you type. Nothing is uploaded.",
  },
  faq: [
    {
      question: "Is my text sent anywhere?",
      answer: "No. Counting happens entirely on your device, recomputed as you type.",
    },
    {
      question: "How is a word counted?",
      answer: "Any run of non-whitespace characters separated by whitespace — the same rule most word processors use.",
    },
    {
      question: "Does this also count characters and lines?",
      answer: "Yes — characters (with and without spaces), lines, sentences and paragraphs are all shown together.",
    },
  ],
};

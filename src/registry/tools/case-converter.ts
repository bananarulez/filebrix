import type { ToolDefinition } from "../types";

export const caseConverterTool: ToolDefinition = {
  id: "case-converter",
  slug: "case-converter",
  name: "Case Converter",
  routeGroup: "tools",
  category: "utility",
  engine: "developer",
  devCategory: "text",
  description: "Convert text to UPPERCASE, lowercase, Title Case or Sentence case — entirely in your browser.",
  keywords: ["case converter", "uppercase converter", "lowercase converter", "title case", "sentence case"],
  acceptedFileTypes: [],
  outputFileTypes: [],
  relatedTools: ["normalize-line-endings", "text-diff"],
  seo: {
    title: "Case Converter — Free, Private & No Upload",
    description:
      "Convert text to UPPERCASE, lowercase, Title Case or Sentence case directly in your browser. Paste, convert, copy or download. Nothing is uploaded.",
  },
  faq: [
    {
      question: "Is my text sent anywhere?",
      answer: "No. Conversion happens entirely on your device.",
    },
    {
      question: "How does Title Case decide which letters to capitalize?",
      answer: "It capitalizes the first letter of every word — it doesn't apply style-guide exceptions for short words like \"a\" or \"the\".",
    },
    {
      question: "How does Sentence case work?",
      answer: "It lowercases everything, then capitalizes the first letter of the text and of each new sentence (after a ., ! or ?).",
    },
  ],
};

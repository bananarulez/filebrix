import type { ToolDefinition } from "../types";

export const unicodeUnescapeTool: ToolDefinition = {
  id: "unicode-unescape",
  slug: "unicode-unescape",
  name: "Unicode Unescape",
  routeGroup: "tools",
  category: "utility",
  engine: "developer",
  devCategory: "encoding",
  description: "Convert \\uXXXX escape sequences back to their original characters entirely in your browser.",
  keywords: ["unicode unescape", "decode \\u escape", "unicode decode online", "javascript unicode decode"],
  acceptedFileTypes: [],
  outputFileTypes: [],
  relatedTools: ["unicode-escape", "html-decode", "base64-decode"],
  seo: {
    title: "Unicode Unescape — Free, Private & No Upload",
    description:
      "Convert \\uXXXX escape sequences back to their original characters directly in your browser. Nothing is uploaded.",
  },
  faq: [
    {
      question: "Is my text sent anywhere?",
      answer: "No. Decoding happens entirely on your device.",
    },
    {
      question: "What sequences does this recognize?",
      answer: "\\uXXXX, where XXXX is exactly 4 hex digits (case-insensitive) — the standard JavaScript Unicode escape format.",
    },
    {
      question: "Is this the exact inverse of Unicode Escape?",
      answer: "Yes — text round-trips through Unicode Escape then Unicode Unescape unchanged.",
    },
  ],
};

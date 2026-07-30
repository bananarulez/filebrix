import type { ToolDefinition } from "../types";

export const normalizeLineEndingsTool: ToolDefinition = {
  id: "normalize-line-endings",
  slug: "normalize-line-endings",
  name: "Normalize Line Endings",
  routeGroup: "tools",
  category: "utility",
  engine: "developer",
  devCategory: "text",
  description: "Convert line endings between LF, CRLF and CR — entirely in your browser.",
  keywords: ["normalize line endings", "crlf to lf", "line ending converter", "unix line endings"],
  acceptedFileTypes: [],
  outputFileTypes: [],
  relatedTools: ["trim-whitespace", "case-converter"],
  seo: {
    title: "Normalize Line Endings — Free, Private & No Upload",
    description:
      "Convert a text file's line endings between LF (Unix/macOS), CRLF (Windows) and CR directly in your browser. Nothing is uploaded.",
  },
  faq: [
    {
      question: "Is my text sent anywhere?",
      answer: "No. Conversion happens entirely on your device.",
    },
    {
      question: "What's the difference between LF, CRLF and CR?",
      answer:
        "LF (\\n) is used by Unix/Linux/macOS, CRLF (\\r\\n) by Windows, and CR (\\r) by classic Mac OS. Mismatched line endings can cause a file to look like one long line, or show extra characters, in some editors.",
    },
    {
      question: "Which should I pick?",
      answer: "LF is the most common default for source code and cross-platform text today; use CRLF if a specific Windows tool requires it.",
    },
  ],
};

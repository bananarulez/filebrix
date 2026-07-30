import type { ToolDefinition } from "../types";

export const unicodeEscapeTool: ToolDefinition = {
  id: "unicode-escape",
  slug: "unicode-escape",
  name: "Unicode Escape",
  routeGroup: "tools",
  category: "utility",
  engine: "developer",
  devCategory: "encoding",
  description: "Escape non-ASCII characters as \\uXXXX sequences entirely in your browser.",
  keywords: ["unicode escape", "\\u escape converter", "escape unicode characters", "javascript unicode escape"],
  acceptedFileTypes: [],
  outputFileTypes: [],
  relatedTools: ["unicode-unescape", "html-encode", "base64-encode"],
  seo: {
    title: "Unicode Escape — Free, Private & No Upload",
    description:
      "Escape non-ASCII characters as \\uXXXX sequences directly in your browser — the same format JavaScript string literals use. Nothing is uploaded.",
  },
  faq: [
    {
      question: "Is my text sent anywhere?",
      answer: "No. Escaping happens entirely on your device.",
    },
    {
      question: "Which characters are escaped?",
      answer:
        "Any character outside the printable ASCII range (code point above 127). Plain ASCII text is left untouched.",
    },
    {
      question: "What happens to characters outside the Basic Multilingual Plane, like emoji?",
      answer:
        "They're represented as a surrogate pair — two \\uXXXX sequences — the same way JavaScript string literals encode them internally.",
    },
  ],
};

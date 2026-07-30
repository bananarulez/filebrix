import type { ToolDefinition } from "../types";

export const uuidGeneratorTool: ToolDefinition = {
  id: "uuid-generator",
  slug: "uuid-generator",
  name: "UUID Generator",
  routeGroup: "tools",
  category: "utility",
  engine: "developer",
  devCategory: "utilities",
  description: "Generate random UUIDs (v4) entirely in your browser — one or a whole batch at once.",
  keywords: ["uuid generator", "guid generator", "generate uuid online", "random uuid v4"],
  acceptedFileTypes: [],
  outputFileTypes: [],
  relatedTools: ["hash-generator", "json-formatter"],
  seo: {
    title: "UUID Generator — Free, Private & No Upload",
    description: "Generate cryptographically random UUID v4 values directly in your browser, one at a time or in bulk. Nothing is uploaded.",
  },
  faq: [
    {
      question: "Are these UUIDs generated on a server?",
      answer: "No. They're generated locally using your browser's own cryptographically secure random number generator (crypto.randomUUID).",
    },
    {
      question: "Which UUID version is this?",
      answer: "Version 4 — randomly generated, the most common choice for general-purpose unique identifiers.",
    },
    {
      question: "How many can I generate at once?",
      answer: "Up to 1000 per click.",
    },
  ],
};

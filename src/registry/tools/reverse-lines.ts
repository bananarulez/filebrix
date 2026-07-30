import type { ToolDefinition } from "../types";

export const reverseLinesTool: ToolDefinition = {
  id: "reverse-lines",
  slug: "reverse-lines",
  name: "Reverse Lines",
  routeGroup: "tools",
  category: "utility",
  engine: "developer",
  devCategory: "text",
  description: "Reverse the order of lines in a block of text — entirely in your browser.",
  keywords: ["reverse lines", "flip line order online", "reverse text lines"],
  acceptedFileTypes: [],
  outputFileTypes: [],
  relatedTools: ["sort-lines", "remove-duplicate-lines"],
  seo: {
    title: "Reverse Lines — Free, Private & No Upload",
    description:
      "Reverse the order of lines in a block of text directly in your browser. Paste, process, copy or download. Nothing is uploaded.",
  },
  faq: [
    {
      question: "Is my text sent anywhere?",
      answer: "No. Processing happens entirely on your device.",
    },
    {
      question: "Does this reverse the characters within each line?",
      answer: "No — it reverses the order of the lines themselves; the text within each line is unchanged.",
    },
  ],
};

import type { ToolDefinition } from "../types";

export const jsonDiffTool: ToolDefinition = {
  id: "json-diff",
  slug: "json-diff",
  name: "JSON Diff",
  routeGroup: "tools",
  category: "utility",
  engine: "developer",
  devCategory: "text",
  description: "Compare two JSON documents structurally, entirely in your browser.",
  keywords: ["json diff", "compare json online", "json comparison tool", "diff two json files"],
  acceptedFileTypes: [],
  outputFileTypes: [],
  relatedTools: ["text-diff", "json-formatter", "json-validator"],
  seo: {
    title: "JSON Diff Checker — Free, Private & No Upload",
    description:
      "Compare two JSON documents directly in your browser, independent of key order or whitespace, with additions and deletions highlighted. Nothing is uploaded.",
  },
  faq: [
    {
      question: "Is my JSON sent anywhere?",
      answer: "No. The comparison runs entirely on your device.",
    },
    {
      question: "Does key order matter?",
      answer: "No — both documents are normalized (keys sorted, consistently indented) before comparing, so re-ordering keys alone won't show up as a difference.",
    },
    {
      question: "What if one of the inputs isn't valid JSON?",
      answer: "You'll see a clear parse error identifying which side failed, instead of a confusing diff.",
    },
  ],
};

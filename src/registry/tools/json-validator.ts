import type { ToolDefinition } from "../types";

export const jsonValidatorTool: ToolDefinition = {
  id: "json-validator",
  slug: "json-validator",
  name: "JSON Validator",
  routeGroup: "tools",
  category: "utility",
  engine: "spreadsheet",
  // Deep-links into Data Studio: the page renders the shared Studio app
  // in "analyze" mode with this tool preselected, rather than owning bespoke UI.
  appEntry: {
    app: "spreadsheet-data",
    mode: "analyze",
  },
  description: "Check whether JSON is valid, with a clear error message if it isn't — entirely in your browser.",
  keywords: [
    "json validator",
    "json checker",
    "validate json online",
    "check json online",
    "json verify",
    "is my json valid",
  ],
  acceptedFileTypes: ["json"],
  outputFileTypes: [],
  relatedTools: ["json-formatter", "json-minifier", "json-diff"],
  // Title leads with the term people actually search ("json validator",
  // "json checker") and spends the rest on what the tool gives them. The
  // former "— Free, Private & No Upload" suffix was identical on all 139
  // tool pages and matched 3 of 1402 real impressions; privacy converts
  // once someone lands, but nobody searches for it. See PROJECT_LOG.
  seo: {
    title: "JSON Validator Online — Check JSON & Find the Error",
    description:
      "Check whether your JSON is valid and see the exact parse error and its position, not just “invalid”. Runs in your browser — nothing is uploaded.",
  },
  faq: [
    {
      question: "What are the most common reasons JSON is invalid?",
      answer:
        "A trailing comma after the last item, single quotes instead of double, unquoted keys, a missing closing bracket or brace, and comments. Together those account for the overwhelming majority of parse failures.",
    },
    {
      question: "Why does my JSON fail here when it works in my JavaScript file?",
      answer:
        "Because a JavaScript object literal is not JSON. JavaScript accepts unquoted keys, single quotes, trailing commas, comments and values like NaN or undefined; JSON accepts none of them. Code that runs fine is still invalid JSON.",
    },
    {
      question: "What do I get if the JSON is invalid?",
      answer:
        "The specific parse error together with the position it was found at (for example, a trailing comma or an unquoted key), rather than a generic failure message.",
    },
    {
      question: "Does this check against a JSON Schema?",
      answer:
        "No — it checks syntax only: whether the document parses at all. It does not check that a field is present, is a number, or matches a pattern your application expects. That is JSON Schema validation, a separate job.",
    },
    {
      question: "Does it accept JSON5, JSONC or comments?",
      answer:
        "No, and that is the point of a validator. Comments and trailing commas are valid in JSONC (used by tsconfig.json and VS Code settings) and in JSON5, but neither is JSON. A file your editor accepts can still be rejected by a strict parser elsewhere.",
    },
    {
      question: "Are duplicate keys reported as an error?",
      answer:
        "No. The JSON specification does not forbid them, so the document parses — the last value silently wins. It is worth knowing, because parsers in different languages disagree about which value that is.",
    },
    {
      question: "Is my JSON uploaded anywhere?",
      answer:
        "No. Validation happens locally using your browser's own built-in JSON parser, which is also why there is no size limit imposed by a server or a request timeout.",
    },
    {
      question: "Can I open a file instead of pasting?",
      answer: "Yes, there's an Open file button, or you can paste text directly.",
    },
  ],
};

import type { ToolDefinition } from "../types";

export const yamlToJsonTool: ToolDefinition = {
  id: "yaml-to-json",
  slug: "yaml-to-json",
  name: "YAML to JSON Converter",
  routeGroup: "convert",
  category: "convert",
  engine: "spreadsheet",
  // Deep-links into Data Studio: the page renders the shared Studio app
  // in "convert" mode with this tool preselected, rather than owning bespoke UI.
  appEntry: {
    app: "spreadsheet-data",
    mode: "convert",
  },
  description: "Convert YAML to JSON, entirely in your browser.",
  keywords: ["yaml to json", "convert yaml to json", "yaml to json online"],
  acceptedFileTypes: ["yaml"],
  outputFileTypes: ["json"],
  relatedTools: ["json-to-yaml", "json-formatter"],
  seo: {
    title: "YAML to JSON Converter — Free, Private & No Upload",
    description:
      "Convert YAML to JSON directly in your browser using a safe YAML parser that never executes or instantiates arbitrary content from the file. Nothing is uploaded.",
  },
  faq: [
    {
      question: "Is my YAML uploaded anywhere?",
      answer: "No. Conversion happens locally in your browser.",
    },
    {
      question: "Is it safe to parse YAML from an untrusted source?",
      answer:
        "Yes. Some YAML parsers in other languages support tags that can instantiate arbitrary types or even execute code — this tool uses a safe-by-default parser that only ever produces plain objects, arrays, strings, numbers, booleans and null, never anything else.",
    },
    {
      question: "What if my YAML is invalid?",
      answer: "You'll see a clear error describing the problem instead of a result.",
    },
    {
      question: "Can I open a file instead of pasting?",
      answer: "Yes, there's an Open file button, or you can paste text directly.",
    },
    {
      question: "Does it support YAML anchors and aliases?",
      answer:
        "Yes, within a conservative limit — an excessive number of anchor/alias references (a known YAML denial-of-service pattern) is rejected rather than expanded.",
    },
  ],
};

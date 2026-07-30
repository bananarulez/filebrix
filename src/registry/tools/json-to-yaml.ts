import type { ToolDefinition } from "../types";

export const jsonToYamlTool: ToolDefinition = {
  id: "json-to-yaml",
  slug: "json-to-yaml",
  name: "JSON to YAML Converter",
  routeGroup: "convert",
  category: "convert",
  engine: "spreadsheet",
  // Deep-links into Data Studio: the page renders the shared Studio app
  // in "convert" mode with this tool preselected, rather than owning bespoke UI.
  appEntry: {
    app: "spreadsheet-data",
    mode: "convert",
  },
  description: "Convert JSON to YAML, entirely in your browser.",
  keywords: ["json to yaml", "convert json to yaml", "json to yaml online"],
  acceptedFileTypes: ["json"],
  outputFileTypes: ["yaml"],
  relatedTools: ["yaml-to-json", "json-formatter"],
  seo: {
    title: "JSON to YAML Converter — Free, Private & No Upload",
    description: "Convert JSON to YAML directly in your browser. Paste text or open a file — nothing is uploaded.",
  },
  faq: [
    {
      question: "Is my JSON uploaded anywhere?",
      answer: "No. Conversion happens locally in your browser.",
    },
    {
      question: "Does the conversion preserve my data exactly?",
      answer:
        "Yes — objects, arrays, strings, numbers, booleans and null all map directly to their YAML equivalents, since YAML is a superset of JSON's data model.",
    },
    {
      question: "What if my JSON is invalid?",
      answer: "You'll see a clear parse error instead of a result.",
    },
    {
      question: "Can I open a file instead of pasting?",
      answer: "Yes, there's an Open file button, or you can paste text directly.",
    },
    {
      question: "Is there a size limit?",
      answer: "There's no server upload limit, since nothing is uploaded.",
    },
  ],
};

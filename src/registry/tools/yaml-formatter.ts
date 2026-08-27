import type { ToolDefinition } from "../types";

export const yamlFormatterTool: ToolDefinition = {
  id: "yaml-formatter",
  slug: "yaml-formatter",
  name: "YAML Formatter",
  routeGroup: "tools",
  category: "utility",
  engine: "spreadsheet",
  // Deep-links into Data Studio: the page renders the shared Studio app in
  // "edit" mode with this tool preselected, exactly like json-formatter and
  // xml-formatter. YAML lives here rather than in Developer Toolkit because
  // `engines/spreadsheet/` is what actually parses it (js-yaml), the same
  // reason the JSON/XML tools moved here.
  appEntry: {
    app: "spreadsheet-data",
    mode: "edit",
  },
  description:
    "Tidy up YAML indentation and spacing — paste text or open a file, entirely in your browser.",
  keywords: [
    "yaml formatter",
    "yaml beautifier",
    "format yaml online",
    "yaml pretty print",
    "yml formatter",
    "online yaml parser",
  ],
  acceptedFileTypes: ["yaml"],
  outputFileTypes: ["yaml"],
  relatedTools: ["yaml-validator", "yaml-to-json", "json-to-yaml", "json-formatter"],
  // See json-validator.ts for why the shared "— Free, Private & No Upload"
  // suffix was dropped.
  seo: {
    title: "YAML Formatter — Format & Beautify YAML Online",
    description:
      "Reformat YAML with consistent indentation and catch parse errors as you go. Built for CI configs and Kubernetes manifests, and runs entirely in your browser.",
  },
  faq: [
    {
      question: "Can I choose tabs for indentation?",
      answer:
        "No, and deliberately — the YAML specification forbids tabs as indentation, so offering the option would produce a file most parsers reject. Formatting uses spaces.",
    },
    {
      question: "Are my comments preserved?",
      answer:
        "No. Formatting parses the document into data and writes it back out, and comments aren't part of that data. If comments matter, keep the original — this tool never modifies your file, it produces a new result.",
    },
    {
      question: "Why did my value no become false?",
      answer:
        "Because older YAML treats no, yes, on and off as booleans. It is why a country code of NO can turn into false — the long-standing “Norway problem”. Quoting the value keeps it a string.",
    },
    {
      question: "Will it rewrite my values or add anchors?",
      answer:
        "No. Repeated values are written out in full rather than replaced with anchors and aliases, and long strings aren't folded across lines. Tidying shouldn't hand back a document you don't recognise.",
    },
    {
      question: "Does it handle multi-document files?",
      answer:
        "A file with several documents separated by --- is common in Kubernetes manifests. Formatting works on one document at a time, so split them first if a file contains more than one.",
    },
    {
      question: "Does it check whether the YAML is valid?",
      answer:
        "Formatting fails with a specific parse error if the document is malformed, so an invalid file can't format successfully. If checking is all you want, use the YAML Validator.",
    },
    {
      question: "Is my YAML uploaded anywhere?",
      answer:
        "No. It's parsed and re-emitted by your browser. That matters for the files people usually format: CI pipelines, Kubernetes manifests and deployment configs routinely contain internal hostnames and service names.",
    },
  ],
};

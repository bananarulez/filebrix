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
  keywords: ["yaml formatter", "format yaml online", "yaml beautifier", "yaml pretty print", "yml formatter"],
  acceptedFileTypes: ["yaml"],
  outputFileTypes: ["yaml"],
  relatedTools: ["yaml-validator", "yaml-to-json", "json-to-yaml", "json-formatter"],
  seo: {
    title: "YAML Formatter Online — Free, Private & No Upload",
    description:
      "Reformat YAML with consistent indentation directly in your browser. Nothing is uploaded — useful for CI configs and Kubernetes manifests.",
  },
  faq: [
    {
      question: "Is my YAML uploaded anywhere?",
      answer:
        "No. It's parsed and re-emitted by your browser. That matters for the files people usually format: CI pipelines, Kubernetes manifests and deployment configs routinely contain internal hostnames and service names.",
    },
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
      question: "Will it rewrite my values or add anchors?",
      answer:
        "No. Repeated values are written out in full rather than replaced with anchors and aliases, and long strings aren't folded across lines. Tidying shouldn't hand back a document you don't recognise.",
    },
    {
      question: "Does it check whether the YAML is valid?",
      answer:
        "Formatting fails with a specific parse error if the document is malformed, so an invalid file can't format successfully. If checking is all you want, use the YAML Validator.",
    },
  ],
};

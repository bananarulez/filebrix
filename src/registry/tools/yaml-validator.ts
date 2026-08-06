import type { ToolDefinition } from "../types";

export const yamlValidatorTool: ToolDefinition = {
  id: "yaml-validator",
  slug: "yaml-validator",
  name: "YAML Validator",
  routeGroup: "tools",
  category: "utility",
  engine: "spreadsheet",
  // Deep-links into Data Studio's "analyze" mode, alongside json-validator
  // and xml-validator — a validator reports on a document rather than
  // producing a new one, which is what separates Analyzer from Editor.
  appEntry: {
    app: "spreadsheet-data",
    mode: "analyze",
  },
  description:
    "Check whether YAML is valid, with a clear message and location if it isn't — entirely in your browser.",
  keywords: ["yaml validator", "validate yaml online", "check yaml syntax", "yaml lint", "yml validator"],
  acceptedFileTypes: ["yaml"],
  outputFileTypes: [],
  relatedTools: ["yaml-formatter", "yaml-to-json", "json-validator", "xml-validator"],
  seo: {
    title: "YAML Validator Online — Free, Private & No Upload",
    description:
      "Check YAML syntax directly in your browser, with a specific parse error when it's wrong. Nothing is uploaded.",
  },
  faq: [
    {
      question: "Is my YAML sent to a server to be checked?",
      answer:
        "No. Validation runs in your browser. This is the difference that matters for a Kubernetes manifest or a CI config, which often carries internal hostnames, image registries and job names.",
    },
    {
      question: "What does it check?",
      answer:
        "YAML syntax: indentation, structure, quoting, anchors and aliases. A file that parses is well-formed YAML.",
    },
    {
      question: "Does it validate against a schema?",
      answer:
        "No. It checks that the document is valid YAML, not that it matches what a particular tool expects. A syntactically perfect Kubernetes manifest with a misspelled field passes here and is still rejected by Kubernetes.",
    },
    {
      question: "Why does my file with tabs fail?",
      answer:
        "The YAML specification forbids tab characters as indentation. Replacing leading tabs with spaces resolves it — this is the single most common cause of a file that looks correct but won't parse.",
    },
    {
      question: "Is it safe to check YAML from an untrusted source?",
      answer:
        "Yes. The parser uses a safe schema that cannot instantiate arbitrary types or execute code, and alias expansion is capped so a maliciously crafted file can't exhaust memory.",
    },
  ],
};

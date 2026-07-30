import type { ToolDefinition } from "../types";

export const jsonToXmlTool: ToolDefinition = {
  id: "json-to-xml",
  slug: "json-to-xml",
  name: "JSON to XML Converter",
  routeGroup: "convert",
  category: "convert",
  engine: "spreadsheet",
  // Deep-links into Data Studio: the page renders the shared Studio app
  // in "convert" mode with this tool preselected, rather than owning bespoke UI.
  appEntry: {
    app: "spreadsheet-data",
    mode: "convert",
  },
  description: "Convert JSON to XML using documented, deterministic rules — entirely in your browser.",
  keywords: ["json to xml", "convert json to xml", "json to xml online"],
  acceptedFileTypes: ["json"],
  outputFileTypes: ["xml"],
  relatedTools: ["xml-to-json", "json-to-yaml"],
  seo: {
    title: "JSON to XML Converter — Free, Private & No Upload",
    description:
      "Convert JSON to XML directly in your browser, with clear, documented rules for objects, arrays and attributes. Nothing is uploaded.",
  },
  faq: [
    {
      question: "Is my JSON uploaded anywhere?",
      answer: "No. Conversion happens entirely on your device, building the XML via your browser's own DOM APIs.",
    },
    {
      question: "How are JSON objects and arrays converted?",
      answer:
        "Object keys become child elements. A key starting with @ becomes an attribute instead (e.g. \"@id\" becomes id=\"...\"). A key named #text becomes the element's direct text. An array value becomes repeated sibling elements sharing that key's tag name. The output's root element is always named <root>.",
    },
    {
      question: "Can every JSON value be converted?",
      answer:
        "Yes — objects, arrays, strings, numbers, booleans and null all produce valid XML (null becomes an empty element). Unlike JSON to CSV, there's no JSON shape this tool has to reject.",
    },
    {
      question: "What if a JSON key isn't a valid XML element name?",
      answer:
        "It's automatically renamed to a valid one (invalid characters replaced), and you'll see a warning telling you exactly which key was renamed.",
    },
    {
      question: "Will converting back to JSON give me the exact same data?",
      answer:
        "The structure round-trips, but XML has no native number, boolean or null type — after converting to XML and back, values like 5 or true become the strings \"5\" and \"true\". This is a fundamental limitation of XML, not a bug.",
    },
  ],
};

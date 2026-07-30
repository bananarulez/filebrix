import type { ToolDefinition } from "../types";

export const urlEncodeTool: ToolDefinition = {
  id: "url-encode",
  slug: "url-encode",
  name: "URL Encode",
  routeGroup: "tools",
  category: "utility",
  engine: "developer",
  devCategory: "encoding",
  description: "Percent-encode text for safe use in a URL — entirely in your browser.",
  keywords: ["url encode", "url encoder", "percent encode", "encodeuricomponent online"],
  acceptedFileTypes: [],
  outputFileTypes: [],
  relatedTools: ["url-decode", "base64-encode", "html-encode"],
  seo: {
    title: "URL Encoder — Free, Private & No Upload",
    description: "Percent-encode text for a URL query string or path segment directly in your browser. Nothing is uploaded.",
  },
  faq: [
    {
      question: "Is my text sent anywhere?",
      answer: "No. Encoding happens entirely on your device, using your browser's own encodeURIComponent.",
    },
    {
      question: "Which characters get encoded?",
      answer:
        "Everything that isn't a letter, digit, or one of - _ . ! ~ * ' ( ) is percent-encoded — including reserved characters like & = / ? #, which is what makes the result safe to use as a single query parameter value.",
    },
    {
      question: "Can I open a file instead of pasting?",
      answer: "Yes, there's an Open file button, or you can paste text directly.",
    },
  ],
};

import type { ToolDefinition } from "../types";

export const urlDecodeTool: ToolDefinition = {
  id: "url-decode",
  slug: "url-decode",
  name: "URL Decode",
  routeGroup: "tools",
  category: "utility",
  engine: "developer",
  devCategory: "encoding",
  description: "Decode percent-encoded URL text back to plain text — entirely in your browser.",
  keywords: ["url decode", "url decoder", "percent decode", "decodeuricomponent online"],
  acceptedFileTypes: [],
  outputFileTypes: [],
  relatedTools: ["url-encode", "base64-decode", "html-decode"],
  seo: {
    title: "URL Decoder — Free, Private & No Upload",
    description: "Decode percent-encoded (URL-encoded) text directly in your browser. Nothing is uploaded.",
  },
  faq: [
    {
      question: "Is my text sent anywhere?",
      answer: "No. Decoding happens entirely on your device.",
    },
    {
      question: "What if the input has a malformed % sequence?",
      answer: "You'll see a clear error rather than a silently wrong result.",
    },
    {
      question: "Can I open a file instead of pasting?",
      answer: "Yes, there's an Open file button, or you can paste text directly.",
    },
  ],
};

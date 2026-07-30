import type { ToolDefinition } from "../types";

export const base64DecodeTool: ToolDefinition = {
  id: "base64-decode",
  slug: "base64-decode",
  name: "Base64 Decode",
  routeGroup: "tools",
  category: "utility",
  engine: "developer",
  devCategory: "encoding",
  description: "Decode Base64 to text entirely in your browser — paste, decode, copy or download.",
  keywords: ["base64 decode", "base64 decoder", "base64 to text", "decode base64 online"],
  acceptedFileTypes: [],
  outputFileTypes: [],
  relatedTools: ["base64-encode", "url-decode", "unicode-unescape"],
  seo: {
    title: "Base64 Decoder — Free, Private & No Upload",
    description: "Decode Base64 text back to its original text directly in your browser. Nothing is uploaded.",
  },
  faq: [
    {
      question: "Is my Base64 text sent anywhere?",
      answer: "No. Decoding happens entirely on your device.",
    },
    {
      question: "What if the text isn't valid Base64?",
      answer: "You'll see a clear error rather than garbled output — the tool checks both the Base64 alphabet and that the decoded bytes are valid UTF-8 text.",
    },
    {
      question: "Can this decode binary data, like an image?",
      answer: "No — it decodes to text specifically. Base64-encoded binary data (like an image) would fail the UTF-8 text check by design.",
    },
  ],
};

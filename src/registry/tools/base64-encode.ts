import type { ToolDefinition } from "../types";

export const base64EncodeTool: ToolDefinition = {
  id: "base64-encode",
  slug: "base64-encode",
  name: "Base64 Encode",
  routeGroup: "tools",
  category: "utility",
  engine: "developer",
  devCategory: "encoding",
  description: "Encode text to Base64 entirely in your browser — paste, encode, copy or download.",
  keywords: ["base64 encode", "base64 encoder", "text to base64", "encode base64 online"],
  acceptedFileTypes: [],
  outputFileTypes: [],
  relatedTools: ["base64-decode", "url-encode", "unicode-escape"],
  seo: {
    title: "Base64 Encoder — Free, Private & No Upload",
    description: "Encode text to Base64 directly in your browser. Unicode-safe — nothing is uploaded.",
  },
  faq: [
    {
      question: "Is my text sent anywhere?",
      answer: "No. Encoding happens entirely on your device.",
    },
    {
      question: "Does this handle non-English text and emoji?",
      answer: "Yes — text is first converted to UTF-8 bytes, so accented characters, CJK text and emoji all round-trip correctly.",
    },
    {
      question: "Is Base64 encryption?",
      answer: "No. Base64 is a reversible encoding, not encryption — anyone can decode it back to the original text. It doesn't provide any confidentiality.",
    },
  ],
};

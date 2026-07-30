import type { ToolDefinition } from "../types";

export const htmlDecodeTool: ToolDefinition = {
  id: "html-decode",
  slug: "html-decode",
  name: "HTML Decode",
  routeGroup: "tools",
  category: "utility",
  engine: "developer",
  devCategory: "encoding",
  description: "Decode HTML entities back to plain text entirely in your browser.",
  keywords: ["html decode", "html entity decoder", "unescape html online", "decode html entities"],
  acceptedFileTypes: [],
  outputFileTypes: [],
  relatedTools: ["html-encode", "url-decode", "unicode-unescape"],
  seo: {
    title: "HTML Decoder — Free, Private & No Upload",
    description:
      "Decode HTML entities (named and numeric) back to plain text directly in your browser. Nothing is uploaded.",
  },
  faq: [
    {
      question: "Is my text sent anywhere?",
      answer: "No. Decoding happens entirely on your device.",
    },
    {
      question: "Which entities are decoded?",
      answer:
        "The 5 predefined named entities (&amp; &lt; &gt; &quot; &apos;) plus numeric character references, both decimal (&#233;) and hex (&#xE9;). Other named entities like &copy; or &nbsp; are left as-is.",
    },
    {
      question: "Is this the exact inverse of HTML Encode?",
      answer: "Yes — text round-trips through HTML Encode then HTML Decode unchanged.",
    },
  ],
};

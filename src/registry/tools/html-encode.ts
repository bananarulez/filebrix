import type { ToolDefinition } from "../types";

export const htmlEncodeTool: ToolDefinition = {
  id: "html-encode",
  slug: "html-encode",
  name: "HTML Encode",
  routeGroup: "tools",
  category: "utility",
  engine: "developer",
  devCategory: "encoding",
  description: "Encode text to HTML entities (&, <, >, \", ') entirely in your browser.",
  keywords: ["html encode", "html entity encoder", "escape html online", "html special characters"],
  acceptedFileTypes: [],
  outputFileTypes: [],
  relatedTools: ["html-decode", "url-encode", "unicode-escape"],
  seo: {
    title: "HTML Encoder — Free, Private & No Upload",
    description:
      "Encode text to HTML entities directly in your browser — useful for safely embedding text inside HTML markup. Nothing is uploaded.",
  },
  faq: [
    {
      question: "Is my text sent anywhere?",
      answer: "No. Encoding happens entirely on your device.",
    },
    {
      question: "Which characters are encoded?",
      answer: "The 5 predefined HTML/XML entities: & → &amp;, < → &lt;, > → &gt;, \" → &quot;, and ' → &#39;.",
    },
    {
      question: "Why would I need this?",
      answer:
        "To safely include arbitrary text inside HTML markup without it being misread as tags or attributes — for example, showing a code sample or user-submitted text on a web page.",
    },
  ],
};

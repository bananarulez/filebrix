import type { ToolDefinition } from "../types";

export const jwtDecoderTool: ToolDefinition = {
  id: "jwt-decoder",
  slug: "jwt-decoder",
  name: "JWT Decoder",
  routeGroup: "tools",
  category: "utility",
  engine: "developer",
  devCategory: "encoding",
  description:
    "Decode a JSON Web Token's header and payload in your browser, with expiry and issued-at times shown as readable dates.",
  keywords: ["jwt decoder", "decode jwt", "jwt parser", "json web token decoder", "read jwt payload"],
  acceptedFileTypes: [],
  outputFileTypes: [],
  relatedTools: ["base64-decode", "json-formatter", "unix-timestamp-converter"],
  seo: {
    title: "JWT Decoder — Free, Private & No Upload",
    description:
      "Decode a JSON Web Token entirely in your browser and read its claims, including expiry. The token is never transmitted.",
  },
  faq: [
    {
      question: "Is my token sent anywhere?",
      answer:
        "No. Decoding happens in this tab and nothing is transmitted. This is the reason to prefer a local decoder: a JWT is usually a live credential, and pasting one into a page that sends it to a server hands over working access for as long as the token remains valid.",
    },
    {
      question: "Does it verify the signature?",
      answer:
        "No, and that's deliberate. Verifying requires the signing secret or the issuer's public key, and a web page asking you to paste a signing secret is a habit worth not building — whatever it promises to do with it. This decodes; it never claims a token is genuine.",
    },
    {
      question: "Is it safe that anyone can read my token's payload?",
      answer:
        "It's how JWTs work, and worth understanding: the payload is base64, not encryption. Anyone holding the token can read every claim in it. That's why tokens shouldn't carry secrets, and why they're signed — the signature stops them being altered, not read.",
    },
    {
      question: "Can I paste it straight from an Authorization header?",
      answer:
        "Yes. A leading \"Bearer \" is stripped automatically, so you can paste directly from a header or a curl command without editing it first.",
    },
    {
      question: "How do I read the exp and iat claims?",
      answer:
        "They're shown as readable UTC dates alongside their raw values, and exp is marked expired or valid against your device's current time. A token whose nbf is still in the future is marked as not valid yet.",
    },
    {
      question: "What does an algorithm of \"none\" mean?",
      answer:
        "It means the token carries no signature at all. Any system accepting such a token accepts anything anyone writes, so it's flagged here — it's a well-known vulnerability rather than a normal configuration.",
    },
  ],
};

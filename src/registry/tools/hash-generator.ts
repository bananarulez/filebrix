import type { ToolDefinition } from "../types";

export const hashGeneratorTool: ToolDefinition = {
  id: "hash-generator",
  slug: "hash-generator",
  name: "Hash Generator",
  routeGroup: "tools",
  category: "utility",
  engine: "developer",
  devCategory: "utilities",
  description: "Compute SHA-1, SHA-256, SHA-384 and SHA-512 hashes of text entirely in your browser.",
  keywords: ["hash generator", "sha256 online", "sha1 generator", "checksum generator", "text hash"],
  acceptedFileTypes: [],
  outputFileTypes: [],
  relatedTools: ["uuid-generator", "base64-encode"],
  seo: {
    title: "Hash Generator (SHA-1 / SHA-256 / SHA-384 / SHA-512) — Free, Private & No Upload",
    description:
      "Compute SHA-1, SHA-256, SHA-384 and SHA-512 hashes of text directly in your browser using the Web Crypto API. Nothing is uploaded.",
  },
  faq: [
    {
      question: "Is my text sent anywhere?",
      answer: "No. Hashing happens entirely on your device using the browser's built-in Web Crypto API.",
    },
    {
      question: "Is there a hash decoder to turn a hash back into text?",
      answer:
        "No — and no tool can have one. A hash is one-way by design: it maps input of any length onto a fixed-length fingerprint, throwing information away in the process, so the original text simply isn't in there to recover. Sites advertising a \"hash decoder\" are looking your hash up in a precomputed table of common inputs, which only ever works for short, already-known values. If you need something you can reverse, you want encoding, not hashing — see Base64 Encode / Decode, URL Encode / Decode, HTML Encode / Decode, or Unicode Escape / Unescape in the Developer Toolkit's Encoding section, which each come as a matched pair.",
    },
    {
      question: "Can I use this to hash and store passwords?",
      answer:
        "No — never store passwords with a fast general-purpose hash like SHA-256. Use a dedicated, slow, salted password hashing algorithm (bcrypt, scrypt, or Argon2) on your server instead. These hashes are meant for checksums, integrity checks and general-purpose fingerprinting, not password storage.",
    },
    {
      question: "Why isn't MD5 offered?",
      answer:
        "Browsers' native Web Crypto API doesn't implement MD5. It's also broken for any security-sensitive use, so it isn't worth adding a separate implementation for.",
    },
    {
      question: "Is SHA-1 safe to use?",
      answer:
        "It's no longer considered collision-resistant for security purposes, but it's still offered here for compatibility with legacy checksums. Prefer SHA-256 or better for anything new.",
    },
  ],
};

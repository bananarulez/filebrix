import type { ToolDefinition } from "../types";

export const unixTimestampConverterTool: ToolDefinition = {
  id: "unix-timestamp-converter",
  slug: "unix-timestamp-converter",
  name: "Unix Timestamp Converter",
  routeGroup: "tools",
  category: "utility",
  engine: "developer",
  devCategory: "utilities",
  description: "Convert between Unix timestamps and human-readable dates, entirely in your browser.",
  keywords: ["unix timestamp converter", "epoch converter", "timestamp to date", "date to unix timestamp"],
  acceptedFileTypes: [],
  outputFileTypes: [],
  relatedTools: ["uuid-generator", "hash-generator"],
  seo: {
    title: "Unix Timestamp Converter — Free, Private & No Upload",
    description:
      "Convert Unix timestamps to human-readable dates and back, in your local time zone and UTC, directly in your browser.",
  },
  faq: [
    {
      question: "Is anything sent to a server?",
      answer: "No. All conversion happens locally using your browser's own Date object and your device's clock.",
    },
    {
      question: "Does it handle both seconds and milliseconds?",
      answer: "Yes — a 13-or-more-digit number is treated as milliseconds; anything shorter is treated as seconds.",
    },
    {
      question: "What time zone are results shown in?",
      answer: "Both: the exact UTC time and your browser's local time zone are shown side by side, along with ISO 8601.",
    },
  ],
};

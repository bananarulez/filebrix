import type { DevCategorySlug, ToolFaqItem } from "./types";

export interface DevCategoryDefinition {
  slug: DevCategorySlug;
  name: string;
  description: string;
}

/**
 * The Developer Toolkit sub-categories, in landing-page display order. Each
 * `engine: "developer"` tool declares its `devCategory` on its own
 * `ToolDefinition` (see `registry/tools/*.ts`) — this array is just the
 * category metadata (name/description shown on the landing page card and
 * the category page header), not a second place tool membership is listed.
 *
 * A 5th sub-category, "JSON" (structured-data-format formatting, validation
 * and conversion — JSON/XML/YAML), lived here originally but was retired
 * once its tools moved to Data Studio, whose `engines/spreadsheet/`
 * implementation already powered every one of them; see PROJECT_LOG.md
 * "Data Studio absorbs JSON/XML/YAML tooling." JSON Diff, the one
 * `devCategory: "json"` tool that *isn't* Spreadsheet-engine-backed, moved
 * into "text" below instead, pairing it with Text Diff (its component
 * sibling) rather than being deleted or left in a dead category.
 */
export const DEV_CATEGORIES: DevCategoryDefinition[] = [
  {
    slug: "text",
    name: "Text",
    description: "Text manipulation and comparison utilities.",
  },
  {
    slug: "encoding",
    name: "Encoding",
    description: "Encoding and decoding utilities.",
  },
  {
    slug: "sql",
    name: "SQL",
    description: "Format SQL and generate SQL statements from CSV data.",
  },
  {
    slug: "utilities",
    name: "Utilities",
    description: "Generators and converters for everyday developer tasks.",
  },
];

/**
 * The Developer Toolkit hub's own FAQ — the counterpart to each Studio's
 * `faq` in `registry/studios.ts`, kept here because Developer Toolkit
 * deliberately isn't a Studio and so has no `StudioDefinition` to hold it.
 *
 * It exists because this page had none. Every other Application-level page
 * emits `SoftwareApplication` + `FAQPage` and renders a visible FAQ; this
 * one emitted a bare `BreadcrumbList` and showed four cards, which made the
 * top of one fifth of the site markedly thinner than everything below it.
 *
 * Answers state what's actually true of these tools specifically — that they
 * take pasted text rather than files, and that nothing is transmitted — not
 * a rewritten copy of a Studio's answers about file handling.
 */
export const DEVELOPER_TOOLKIT_FAQ: ToolFaqItem[] = [
  {
    question: "Is anything I paste into these tools sent to a server?",
    answer:
      "No. Every tool here runs entirely in your browser using JavaScript already loaded with the page. Nothing you type, paste or open is transmitted anywhere, and there is no server endpoint that could receive it.",
  },
  {
    question: "Do these tools work offline?",
    answer:
      "Yes, once the page has loaded. Because the processing happens on your device, you can disconnect from the internet and every tool still works — which is also the simplest way to verify the claim above for yourself.",
  },
  {
    question: "Why isn't this called a Studio like the other applications?",
    answer:
      "Because it genuinely isn't one. Data, PDF, Image and Geospatial Studio are each a single workspace where you load a file once and move between tabs. The Developer Toolkit is a collection of independent utilities that mostly don't share a document, so it's organized as categories of separate tools instead.",
  },
  {
    question: "Can I use these on confidential data?",
    answer:
      "That's what they're built for. Pasting a token, an internal query or a customer export into a conventional online formatter hands a copy to whoever runs it. Here the text stays in the tab, so the usual reason to hesitate doesn't apply.",
  },
  {
    question: "Do I need to create an account or pay?",
    answer: "No. There are no accounts, no sign-in and no paid tier — every tool is free and immediately usable.",
  },
];

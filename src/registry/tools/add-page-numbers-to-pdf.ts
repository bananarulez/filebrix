import type { ToolDefinition } from "../types";

export const addPageNumbersToPdfTool: ToolDefinition = {
  id: "add-page-numbers-to-pdf",
  slug: "page-numbers",
  name: "Add Page Numbers to PDF",
  routeGroup: "pdf",
  category: "edit",
  engine: "pdf",
  description:
    "Number the pages of a PDF in your browser, choosing the format, position and which page numbering starts on.",
  keywords: [
    "add page numbers to pdf",
    "pdf page numbers",
    "number pdf pages",
    "insert page numbers pdf",
  ],
  acceptedFileTypes: ["pdf"],
  outputFileTypes: ["pdf"],
  // Rendered by the shared PdfStudioApp (Edit tab, locked to "page-numbers").
  appEntry: { app: "pdf-studio", mode: "edit" },
  // Slugs, not ids — see watermark-pdf.ts.
  relatedTools: ["watermark", "merge", "reorder-pages"],
  seo: {
    title: "Add Page Numbers to a PDF — Free, Private & No Upload",
    description:
      "Add page numbers to a PDF in your browser, with a choice of format and position and the option to skip a cover page. Nothing is uploaded.",
  },
  faq: [
    {
      question: "Is my document uploaded?",
      answer: "No. The numbers are drawn onto the pages on your device, and the file never leaves the browser.",
    },
    {
      question: "Can I skip the cover page?",
      answer:
        "Yes. Set which page numbering starts on, and earlier pages are left untouched. The total shown in formats like \"Page 1 of 12\" counts only the numbered pages, so it matches what a reader actually sees.",
    },
    {
      question: "Can numbering start at something other than 1?",
      answer:
        "Yes. The first printed number is set separately from the page it starts on, which is what you need when a document continues the numbering of a previous part.",
    },
    {
      question: "What formats are available?",
      answer:
        "A bare number, \"Page N\", \"N / total\" and \"Page N of total\". They're drawn as text at the position you choose, in a font every PDF reader already has.",
    },
    {
      question: "Will numbers land correctly on rotated or mixed-size pages?",
      answer:
        "Yes. Each page's own size and rotation are read individually, so a landscape page in a portrait document gets its number in the right corner, the right way up.",
    },
    {
      question: "Does this replace numbers already in the document?",
      answer:
        "No. Existing numbers are part of the page content and can't be detected or removed, so a document that already has them will show both. Number a document that doesn't yet have them.",
    },
  ],
};

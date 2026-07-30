import type { ToolDefinition } from "../types";

export const reorderPdfPagesTool: ToolDefinition = {
  id: "reorder-pdf-pages",
  slug: "reorder-pages",
  name: "Reorder PDF Pages",
  routeGroup: "pdf",
  category: "edit",
  engine: "pdf",
  description: "Rearrange the pages of a PDF into a new order, entirely in your browser.",
  keywords: ["reorder pdf pages", "rearrange pdf pages", "change pdf page order", "sort pdf pages"],
  acceptedFileTypes: ["pdf"],
  outputFileTypes: ["pdf"],
  appEntry: { app: "pdf-studio", mode: "pages" },
  relatedTools: ["rotate", "extract-pages", "delete-pages"],
  seo: {
    title: "Reorder PDF Pages — Free, Private & No Upload",
    description:
      "Drag pages into a new order using move buttons on each thumbnail, directly in your browser. Your PDF is never uploaded.",
  },
  faq: [
    {
      question: "Is my PDF uploaded to a server?",
      answer: "No. Pages are rearranged and the new PDF is built entirely on your device.",
    },
    {
      question: "How do I change the page order?",
      answer:
        "Use the move-left/move-right buttons under each page thumbnail to shift it earlier or later in the document.",
    },
    {
      question: "Can I also remove pages while reordering?",
      answer:
        "This tool keeps every page — use Delete PDF Pages or Extract PDF Pages if you also want to drop pages.",
    },
    {
      question: "What happens to a digitally signed PDF?",
      answer:
        "It still works, but the result won't be signed. These tools rebuild the document, and a digital signature only covers the exact bytes it was applied to — so any edit invalidates it. Signed PDFs are detected and you'll see a warning before you process one; keep the original if you need the signature to stay valid.",
    },
  ],
};

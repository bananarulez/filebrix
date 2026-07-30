import type { ToolDefinition } from "../types";

export const deletePdfPagesTool: ToolDefinition = {
  id: "delete-pdf-pages",
  slug: "delete-pages",
  name: "Delete PDF Pages",
  routeGroup: "pdf",
  category: "edit",
  engine: "pdf",
  description: "Remove specific pages from a PDF and keep the rest, entirely in your browser.",
  keywords: ["delete pdf pages", "remove pdf pages", "delete page from pdf"],
  acceptedFileTypes: ["pdf"],
  outputFileTypes: ["pdf"],
  appEntry: { app: "pdf-studio", mode: "pages" },
  relatedTools: ["extract-pages", "reorder-pages", "split"],
  seo: {
    title: "Delete PDF Pages — Free, Private & No Upload",
    description:
      "Remove unwanted pages from a PDF directly in your browser. Preview every page as a thumbnail before choosing what to delete — your file is never uploaded.",
  },
  faq: [
    {
      question: "Is my PDF uploaded to a server?",
      answer: "No. Pages are removed and the new PDF is built entirely on your device.",
    },
    {
      question: "How do I choose which pages to delete?",
      answer:
        "Check the box under any page thumbnail to mark it for deletion. Every unchecked page is kept in the result.",
    },
    {
      question: "Can I delete every page by mistake?",
      answer:
        "No — if your selection would leave zero pages, you'll see a clear message asking you to leave at least one page.",
    },
    {
      question: "What happens to a digitally signed PDF?",
      answer:
        "It still works, but the result won't be signed. These tools rebuild the document, and a digital signature only covers the exact bytes it was applied to — so any edit invalidates it. Signed PDFs are detected and you'll see a warning before you process one; keep the original if you need the signature to stay valid.",
    },
  ],
};

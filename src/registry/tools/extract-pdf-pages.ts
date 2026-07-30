import type { ToolDefinition } from "../types";

export const extractPdfPagesTool: ToolDefinition = {
  id: "extract-pdf-pages",
  slug: "extract-pages",
  name: "Extract PDF Pages",
  routeGroup: "pdf",
  category: "edit",
  engine: "pdf",
  description: "Pull specific pages out of a PDF into a new file, entirely in your browser.",
  keywords: ["extract pdf pages", "pull pages from pdf", "save pdf pages", "get pdf page"],
  acceptedFileTypes: ["pdf"],
  outputFileTypes: ["pdf"],
  appEntry: { app: "pdf-studio", mode: "pages" },
  relatedTools: ["delete-pages", "split", "merge"],
  seo: {
    title: "Extract PDF Pages — Free, Private & No Upload",
    description:
      "Select and save specific pages from a PDF as a new file, directly in your browser. Preview every page as a thumbnail — your file is never uploaded.",
  },
  faq: [
    {
      question: "Is my PDF uploaded to a server?",
      answer: "No. The pages you select are copied into a new PDF entirely on your device.",
    },
    {
      question: "How do I choose which pages to extract?",
      answer:
        "Check the box under any page thumbnail to include it in the output. Only checked pages are kept.",
    },
    {
      question: "What's the difference between this and Delete PDF Pages?",
      answer:
        "Extract Pages keeps only the pages you check; Delete PDF Pages removes the pages you check and keeps the rest.",
    },
    {
      question: "What happens to a digitally signed PDF?",
      answer:
        "It still works, but the result won't be signed. These tools rebuild the document, and a digital signature only covers the exact bytes it was applied to — so any edit invalidates it. Signed PDFs are detected and you'll see a warning before you process one; keep the original if you need the signature to stay valid.",
    },
  ],
};

import type { ToolDefinition } from "../types";

export const mergePdfTool: ToolDefinition = {
  id: "merge-pdf",
  slug: "merge",
  name: "Merge PDF",
  routeGroup: "pdf",
  category: "edit",
  engine: "pdf",
  description:
    "Combine multiple PDF files into one document, in whatever page order you choose, entirely in your browser.",
  keywords: ["merge pdf", "combine pdf", "join pdf files", "pdf merger"],
  acceptedFileTypes: ["pdf"],
  outputFileTypes: ["pdf"],
  appEntry: { app: "pdf-studio", mode: "pages" },
  relatedTools: ["split", "reorder-pages", "extract-pages"],
  seo: {
    title: "Merge PDF Files — Free, Private & No Upload",
    description:
      "Combine two or more PDF files into a single document directly in your browser. Reorder pages before merging — your PDFs are never uploaded.",
  },
  faq: [
    {
      question: "Are my PDF files uploaded to a server?",
      answer:
        "No. Every page is read and the merged PDF is built entirely on your device — your files never leave your browser. This matters since PDFs often contain contracts, invoices, or other private documents.",
    },
    {
      question: "Can I control the order of pages in the merged file?",
      answer:
        "Yes. After adding your files, use the move-left/move-right buttons on any page thumbnail to rearrange them, or remove a page you don't want included.",
    },
    {
      question: "Can I merge password-protected PDFs?",
      answer:
        "Not currently. Encrypted PDFs can't be opened by these tools, and you'll see a clear message rather than a crash if you try.",
    },
    {
      question: "Is there a limit on how many files or pages I can merge?",
      answer:
        "There's no server-imposed limit, since nothing is uploaded. The practical maximum depends on your device's available memory.",
    },
    {
      question: "What happens to a digitally signed PDF?",
      answer:
        "It still works, but the result won't be signed. These tools rebuild the document, and a digital signature only covers the exact bytes it was applied to — so any edit invalidates it. Signed PDFs are detected and you'll see a warning before you process one; keep the original if you need the signature to stay valid.",
    },
  ],
};

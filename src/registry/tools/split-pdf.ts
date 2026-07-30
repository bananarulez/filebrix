import type { ToolDefinition } from "../types";

export const splitPdfTool: ToolDefinition = {
  id: "split-pdf",
  slug: "split",
  name: "Split PDF",
  routeGroup: "pdf",
  category: "edit",
  engine: "pdf",
  description:
    "Split a PDF into multiple files at the page breaks you choose, entirely in your browser.",
  keywords: ["split pdf", "divide pdf", "pdf splitter", "separate pdf pages"],
  acceptedFileTypes: ["pdf"],
  outputFileTypes: ["pdf"],
  appEntry: { app: "pdf-studio", mode: "pages" },
  relatedTools: ["merge", "extract-pages", "delete-pages"],
  seo: {
    title: "Split PDF — Free, Private & No Upload",
    description:
      "Split a PDF into separate files at any page. Choose split points visually, then download the parts — your file is processed locally and never uploaded.",
  },
  faq: [
    {
      question: "Is my PDF uploaded to a server?",
      answer:
        "No. The file is read and the resulting parts are built entirely on your device — nothing is ever sent anywhere.",
    },
    {
      question: "How do I choose where to split?",
      answer:
        "Click the marker between any two page thumbnails to add a split point there. Each resulting part becomes its own PDF file.",
    },
    {
      question: "How do I download the results?",
      answer:
        "If you split into more than one part, all parts are packaged into a single .zip file so you get one download instead of many.",
    },
    {
      question: "What if my PDF is password-protected?",
      answer:
        "Encrypted PDFs can't currently be opened by these tools — you'll see a clear error rather than a crash or a silent failure.",
    },
    {
      question: "What happens to a digitally signed PDF?",
      answer:
        "It still works, but the result won't be signed. These tools rebuild the document, and a digital signature only covers the exact bytes it was applied to — so any edit invalidates it. Signed PDFs are detected and you'll see a warning before you process one; keep the original if you need the signature to stay valid.",
    },
  ],
};

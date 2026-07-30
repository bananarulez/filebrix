import type { ToolDefinition } from "../types";

export const pdfToTxtTool: ToolDefinition = {
  id: "pdf-to-txt",
  slug: "pdf-to-txt",
  name: "PDF to TXT",
  routeGroup: "convert",
  category: "convert",
  engine: "pdf",
  description: "Extract the text embedded in a PDF into a plain .txt file, entirely in your browser.",
  keywords: ["pdf to txt", "extract text from pdf", "pdf text extractor", "pdf to text"],
  acceptedFileTypes: ["pdf"],
  outputFileTypes: ["txt"],
  appEntry: { app: "pdf-studio", mode: "convert" },
  relatedTools: ["pdf-to-images", "metadata-viewer"],
  seo: {
    title: "PDF to TXT — Free, Private & No Upload",
    description:
      "Extract embedded text from a PDF directly in your browser and download it as a .txt file. Your PDF is never uploaded, and no OCR is performed.",
  },
  faq: [
    {
      question: "Is my PDF uploaded to a server?",
      answer: "No. Text is extracted entirely on your device.",
    },
    {
      question: "Does this work on scanned PDFs?",
      answer:
        "No. This tool extracts text that's already embedded in the PDF — it does not perform OCR (optical character recognition). If a PDF contains only scanned images, you'll see a clear message: \"No extractable text was found. This document may be scanned.\"",
    },
    {
      question: "Will formatting like columns or tables be preserved?",
      answer:
        "Text is extracted in the order the PDF stores it, which is usually close to reading order but isn't guaranteed to preserve complex layouts like multi-column text or tables exactly.",
    },
  ],
};

import type { ToolDefinition } from "../types";

export const removePdfMetadataTool: ToolDefinition = {
  id: "remove-pdf-metadata",
  slug: "remove-metadata",
  name: "Remove PDF Metadata",
  routeGroup: "pdf",
  category: "edit",
  engine: "pdf",
  description:
    "Strip a PDF's title, author and other document metadata before sharing it, entirely in your browser.",
  keywords: ["remove pdf metadata", "strip pdf metadata", "clean pdf properties", "delete pdf author"],
  acceptedFileTypes: ["pdf"],
  outputFileTypes: ["pdf"],
  appEntry: { app: "pdf-studio", mode: "metadata" },
  relatedTools: ["metadata-viewer", "merge"],
  seo: {
    title: "Remove PDF Metadata — Free, Private & No Upload",
    description:
      "Clear a PDF's title, author, subject, keywords, creator/producer and dates before you share it — directly in your browser. Your file is never uploaded.",
  },
  faq: [
    {
      question: "Is my PDF uploaded to a server?",
      answer:
        "No. Metadata is stripped and the cleaned PDF is built entirely on your device — useful since document metadata can reveal the author's name or the software used, which you may not want to share.",
    },
    {
      question: "What exactly gets removed?",
      answer:
        "The standard document-information fields: title, author, subject, keywords, creator, producer, and creation/modification dates.",
    },
    {
      question: "Does this remove every trace of authorship?",
      answer:
        "It removes both places a PDF stores document metadata: the standard document-information dictionary (title, author, subject, keywords, creator, producer and dates, plus any nonstandard entries) and the separate XMP metadata stream that Acrobat, InDesign, Word and most scanner software write alongside it — including any XMP attached to individual pages. It does not touch content *inside* the page itself: text, images, and anything visually present in the document are left exactly as they were, so a name written in the document body still appears there.",
    },
    {
      question: "What if my PDF is digitally signed?",
      answer:
        "Removing metadata rebuilds the document, so a digital signature won't survive it — a signature only covers the exact bytes it was applied to. The tool detects signed PDFs and warns you before you proceed; the file still processes normally, but keep the original if you need the signature to stay valid.",
    },
  ],
};

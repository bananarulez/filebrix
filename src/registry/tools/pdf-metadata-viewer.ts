import type { ToolDefinition } from "../types";

export const pdfMetadataViewerTool: ToolDefinition = {
  id: "pdf-metadata-viewer",
  slug: "metadata-viewer",
  name: "PDF Metadata Viewer",
  routeGroup: "pdf",
  category: "view",
  engine: "pdf",
  description:
    "See a PDF's title, author, creation date and other document metadata, entirely in your browser.",
  keywords: ["pdf metadata viewer", "view pdf properties", "pdf info", "pdf document properties"],
  acceptedFileTypes: ["pdf"],
  outputFileTypes: [],
  appEntry: { app: "pdf-studio", mode: "metadata" },
  relatedTools: ["remove-metadata", "pdf-to-txt"],
  seo: {
    title: "PDF Metadata Viewer — Free, Private & No Upload",
    description:
      "Inspect a PDF's title, author, subject, creator, producer and creation/modification dates directly in your browser. Your file is never uploaded.",
  },
  faq: [
    {
      question: "Is my PDF uploaded to a server?",
      answer: "No. Metadata is read entirely on your device.",
    },
    {
      question: "What metadata fields are shown?",
      answer:
        "Title, author, subject, keywords, creator, producer, creation date and modification date — the standard PDF document-information fields — plus the page count.",
    },
    {
      question: "Can I remove this metadata?",
      answer: "Yes — use the related Remove PDF Metadata tool to strip these fields and download a cleaned copy.",
    },
    {
      question: "What happens to a digitally signed PDF?",
      answer:
        "It still works, but the result won't be signed. These tools rebuild the document, and a digital signature only covers the exact bytes it was applied to — so any edit invalidates it. Signed PDFs are detected and you'll see a warning before you process one; keep the original if you need the signature to stay valid.",
    },
  ],
};

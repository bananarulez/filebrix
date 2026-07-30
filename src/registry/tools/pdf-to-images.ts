import type { ToolDefinition } from "../types";

export const pdfToImagesTool: ToolDefinition = {
  id: "pdf-to-images",
  slug: "pdf-to-images",
  name: "PDF to Images",
  routeGroup: "convert",
  category: "convert",
  engine: "pdf",
  description: "Render every page of a PDF as a PNG or JPEG image, entirely in your browser.",
  keywords: ["pdf to images", "pdf to png", "pdf to jpg", "convert pdf to image", "pdf page to image"],
  acceptedFileTypes: ["pdf"],
  outputFileTypes: ["png", "jpg"],
  appEntry: { app: "pdf-studio", mode: "convert" },
  relatedTools: ["images-to-pdf", "pdf-to-txt"],
  seo: {
    title: "PDF to Images Converter — Free, Private & No Upload",
    description:
      "Convert every page of a PDF into a PNG or JPEG image directly in your browser. Multi-page PDFs are packaged into a single .zip — your file is never uploaded.",
  },
  faq: [
    {
      question: "Is my PDF uploaded to a server?",
      answer: "No. Every page is rendered to an image entirely on your device.",
    },
    {
      question: "How do I download a multi-page PDF's images?",
      answer: "All page images are packaged into one .zip file so you get a single download.",
    },
    {
      question: "PNG or JPEG — which should I choose?",
      answer:
        "PNG is lossless and better for text-heavy pages; JPEG produces smaller files and works well for photo-heavy pages.",
    },
  ],
};

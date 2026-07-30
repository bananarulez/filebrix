import type { ToolDefinition } from "../types";

export const imagesToPdfTool: ToolDefinition = {
  id: "images-to-pdf",
  slug: "images-to-pdf",
  name: "Images to PDF",
  routeGroup: "convert",
  category: "convert",
  engine: "pdf",
  description: "Combine PNG or JPEG images into a single PDF, one page per image, entirely in your browser.",
  keywords: ["images to pdf", "jpg to pdf", "png to pdf", "photos to pdf", "convert images to pdf"],
  acceptedFileTypes: ["png", "jpg"],
  outputFileTypes: ["pdf"],
  appEntry: { app: "pdf-studio", mode: "convert" },
  relatedTools: ["pdf-to-images", "merge"],
  seo: {
    title: "Images to PDF Converter — Free, Private & No Upload",
    description:
      "Convert PNG or JPEG images into a single PDF file directly in your browser. Reorder pages before converting — your images are never uploaded.",
  },
  faq: [
    {
      question: "Are my images uploaded to a server?",
      answer: "No. The PDF is built entirely on your device from the images you choose.",
    },
    {
      question: "What image formats are supported?",
      answer: "PNG and JPEG. Each image becomes its own page, sized to that image's own dimensions.",
    },
    {
      question: "Can I control the page order?",
      answer:
        "Yes. Use the move-left/move-right buttons on each image thumbnail to set the order pages appear in the final PDF.",
    },
  ],
};

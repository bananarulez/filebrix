import type { ToolDefinition } from "../types";

export const jpgToPngTool: ToolDefinition = {
  id: "jpg-to-png",
  slug: "jpg-to-png",
  name: "JPG to PNG Converter",
  routeGroup: "convert",
  category: "convert",
  engine: "image",
  description: "Convert JPG images to lossless PNG, entirely in your browser.",
  keywords: ["jpg to png", "jpeg to png", "convert jpg to png"],
  acceptedFileTypes: ["jpg"],
  outputFileTypes: ["png"],
  // Rendered by the shared ImageStudioApp (Convert tab, locked to
  // "jpg-to-png") — see appEntry and app/convert/jpg-to-png/page.tsx.
  appEntry: { app: "image-studio", mode: "convert", lockedFormat: "jpg", outputFormat: "png" },
  relatedTools: ["png-to-jpg", "resize-image", "remove-image-metadata"],
  seo: {
    title: "JPG to PNG Converter — Free, Private & No Upload",
    description:
      "Convert JPG/JPEG images to PNG directly in your browser. Batch convert multiple files and download individually or as a .zip — nothing is ever uploaded.",
  },
  faq: [
    {
      question: "Are my images uploaded to a server?",
      answer: "No. Every image is converted entirely on your device.",
    },
    {
      question: "Will converting to PNG improve image quality?",
      answer:
        "No — PNG is lossless going forward, but it can't restore detail a JPEG's compression already discarded. It will, however, stop any further generational quality loss.",
    },
    {
      question: "Will the resulting PNG be larger than the original JPG?",
      answer:
        "Usually yes. PNG's lossless compression generally produces larger files than JPEG for photographic images.",
    },
  ],
};

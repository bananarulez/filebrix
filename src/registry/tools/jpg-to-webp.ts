import type { ToolDefinition } from "../types";

export const jpgToWebpTool: ToolDefinition = {
  id: "jpg-to-webp",
  slug: "jpg-to-webp",
  name: "JPG to WebP Converter",
  routeGroup: "convert",
  category: "convert",
  engine: "image",
  description: "Convert JPG images to the smaller WebP format, with a quality slider, entirely in your browser.",
  keywords: ["jpg to webp", "jpeg to webp", "convert jpg to webp"],
  acceptedFileTypes: ["jpg"],
  outputFileTypes: ["webp"],
  // Rendered by the shared ImageStudioApp (Convert tab, locked to
  // "jpg-to-webp") — see appEntry and app/convert/jpg-to-webp/page.tsx.
  appEntry: { app: "image-studio", mode: "convert", lockedFormat: "jpg", outputFormat: "webp" },
  relatedTools: ["webp-to-jpg", "compress-image", "png-to-webp"],
  seo: {
    title: "JPG to WebP Converter — Free, Private & No Upload",
    description:
      "Convert JPG/JPEG images to WebP directly in your browser for smaller file sizes at similar quality. Batch convert and download as a .zip — nothing is uploaded.",
  },
  faq: [
    {
      question: "Are my images uploaded to a server?",
      answer: "No. Every image is converted entirely on your device.",
    },
    {
      question: "Why convert to WebP?",
      answer:
        "WebP is a lossy format like JPEG but typically produces smaller files at a similar visual quality — useful for web pages where load time matters.",
    },
    {
      question: "Will every browser display the resulting WebP file?",
      answer: "All modern browsers support WebP. Some older software may not — check your target audience if that matters.",
    },
  ],
};

import type { ToolDefinition } from "../types";

export const webpToJpgTool: ToolDefinition = {
  id: "webp-to-jpg",
  slug: "webp-to-jpg",
  name: "WebP to JPG Converter",
  routeGroup: "convert",
  category: "convert",
  engine: "image",
  description: "Convert WebP images to JPG for wider compatibility, entirely in your browser.",
  keywords: ["webp to jpg", "webp to jpeg", "convert webp to jpg"],
  acceptedFileTypes: ["webp"],
  outputFileTypes: ["jpg"],
  // Rendered by the shared ImageStudioApp (Convert tab, locked to
  // "webp-to-jpg") — see appEntry and app/convert/webp-to-jpg/page.tsx.
  appEntry: { app: "image-studio", mode: "convert", lockedFormat: "webp", outputFormat: "jpg" },
  relatedTools: ["jpg-to-webp", "png-to-jpg", "compress-image"],
  seo: {
    title: "WebP to JPG Converter — Free, Private & No Upload",
    description:
      "Convert WebP images to JPG directly in your browser — useful for apps or sites that don't accept WebP. Batch convert and download as a .zip. Nothing is uploaded.",
  },
  faq: [
    {
      question: "Are my images uploaded to a server?",
      answer: "No. Every image is converted entirely on your device.",
    },
    {
      question: "What happens to transparent or animated WebP images?",
      answer:
        "JPG doesn't support transparency or animation. Transparent areas are filled with a background color you choose, and only a single static frame is used for animated WebP files.",
    },
    {
      question: "Can I control the output quality?",
      answer: "Yes — an adjustable quality slider trades off file size against visual quality before you download.",
    },
  ],
};

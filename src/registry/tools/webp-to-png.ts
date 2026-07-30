import type { ToolDefinition } from "../types";

export const webpToPngTool: ToolDefinition = {
  id: "webp-to-png",
  slug: "webp-to-png",
  name: "WebP to PNG Converter",
  routeGroup: "convert",
  category: "convert",
  engine: "image",
  description: "Convert WebP images to PNG for wider compatibility, entirely in your browser.",
  keywords: ["webp to png", "convert webp to png"],
  acceptedFileTypes: ["webp"],
  outputFileTypes: ["png"],
  // Rendered by the shared ImageStudioApp (Convert tab, locked to
  // "webp-to-png") — see appEntry and app/convert/webp-to-png/page.tsx.
  appEntry: { app: "image-studio", mode: "convert", lockedFormat: "webp", outputFormat: "png" },
  relatedTools: ["png-to-webp", "webp-to-jpg", "remove-image-metadata"],
  seo: {
    title: "WebP to PNG Converter — Free, Private & No Upload",
    description:
      "Convert WebP images to PNG directly in your browser — useful for apps or editors that don't support WebP. Batch convert and download as a .zip. Nothing is uploaded.",
  },
  faq: [
    {
      question: "Are my images uploaded to a server?",
      answer: "No. Every image is converted entirely on your device.",
    },
    {
      question: "Is transparency preserved?",
      answer: "Yes — PNG supports an alpha channel just like WebP, so transparent areas carry over correctly.",
    },
    {
      question: "What happens with an animated WebP?",
      answer: "PNG doesn't support animation, so only a single static frame is used.",
    },
  ],
};

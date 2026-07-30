import type { ToolDefinition } from "../types";

export const pngToWebpTool: ToolDefinition = {
  id: "png-to-webp",
  slug: "png-to-webp",
  name: "PNG to WebP Converter",
  routeGroup: "convert",
  category: "convert",
  engine: "image",
  description: "Convert PNG images to WebP for a smaller file size while keeping transparency, entirely in your browser.",
  keywords: ["png to webp", "convert png to webp"],
  acceptedFileTypes: ["png"],
  outputFileTypes: ["webp"],
  // Rendered by the shared ImageStudioApp (Convert tab, locked to
  // "png-to-webp") — see appEntry and app/convert/png-to-webp/page.tsx.
  appEntry: { app: "image-studio", mode: "convert", lockedFormat: "png", outputFormat: "webp" },
  relatedTools: ["webp-to-png", "compress-image", "jpg-to-webp"],
  seo: {
    title: "PNG to WebP Converter — Free, Private & No Upload",
    description:
      "Convert PNG images to WebP directly in your browser — WebP keeps transparency like PNG but usually produces a smaller file. Batch convert and download as a .zip.",
  },
  faq: [
    {
      question: "Are my images uploaded to a server?",
      answer: "No. Every image is converted entirely on your device.",
    },
    {
      question: "Does WebP keep my PNG's transparency?",
      answer: "Yes — WebP supports an alpha channel just like PNG, so transparent areas are preserved, not filled in.",
    },
    {
      question: "Is this lossless?",
      answer:
        "This tool uses WebP's lossy mode with an adjustable quality setting, which typically gives a much smaller file than PNG at a visually similar quality.",
    },
  ],
};

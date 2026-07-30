import type { ToolDefinition } from "../types";

export const compressImageTool: ToolDefinition = {
  id: "compress-image",
  slug: "compress-image",
  name: "Compress Image",
  routeGroup: "tools",
  category: "edit",
  engine: "image",
  description: "Reduce JPG or WebP file size with an adjustable quality slider, entirely in your browser.",
  keywords: ["compress image", "reduce image size", "image compressor", "shrink image file size"],
  acceptedFileTypes: ["png", "jpg", "webp"],
  outputFileTypes: ["png", "jpg", "webp"],
  // Rendered by the shared ImageStudioApp (Edit tab, locked to "compress") —
  // see appEntry and app/tools/compress-image/page.tsx.
  appEntry: { app: "image-studio", mode: "edit" },
  relatedTools: ["resize-image", "png-to-webp", "jpg-to-webp"],
  seo: {
    title: "Compress Image — Free, Private & No Upload",
    description:
      "Reduce a JPG or WebP image's file size with a quality slider, directly in your browser. Batch compress and download as a .zip — nothing is uploaded.",
  },
  faq: [
    {
      question: "Are my images uploaded to a server?",
      answer: "No. Every image is compressed entirely on your device.",
    },
    {
      question: "Why doesn't the quality slider shrink my PNG file much?",
      answer:
        "PNG is a lossless format — there's no quality/size tradeoff to adjust. For a real size reduction, convert the PNG to WebP first (see PNG to WebP), then compress if needed.",
    },
    {
      question: "What's a good quality setting?",
      answer:
        "Around 80% is a common balance of size and visual quality for photos. Lower values shrink the file further at the cost of visible detail, especially around sharp edges.",
    },
  ],
};

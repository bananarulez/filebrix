import type { ToolDefinition } from "../types";

export const resizeImageTool: ToolDefinition = {
  id: "resize-image",
  slug: "resize-image",
  name: "Resize Image",
  routeGroup: "tools",
  category: "edit",
  engine: "image",
  description: "Resize PNG, JPG or WebP images to exact dimensions, entirely in your browser.",
  keywords: ["resize image", "image resizer", "scale image", "change image dimensions"],
  acceptedFileTypes: ["png", "jpg", "webp"],
  outputFileTypes: ["png", "jpg", "webp"],
  // Rendered by the shared ImageStudioApp (Edit tab, locked to "resize") —
  // see appEntry and app/tools/resize-image/page.tsx.
  appEntry: { app: "image-studio", mode: "edit" },
  relatedTools: ["compress-image", "rotate-image", "flip-image"],
  seo: {
    title: "Resize Image — Free, Private & No Upload",
    description:
      "Resize PNG, JPG or WebP images to specific pixel dimensions directly in your browser, with an aspect-ratio lock. Batch resize and download as a .zip.",
  },
  faq: [
    {
      question: "Are my images uploaded to a server?",
      answer: "No. Every image is resized entirely on your device.",
    },
    {
      question: "Can I resize many images to the same size at once?",
      answer: "Yes — drop multiple files, set the target size once, and download all the results as a .zip.",
    },
    {
      question: "What happens if I lock the aspect ratio and enter both width and height?",
      answer: "Width takes priority — the height is recalculated from it so the image is never stretched or squashed.",
    },
  ],
};

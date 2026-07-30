import type { ToolDefinition } from "../types";

export const flipImageTool: ToolDefinition = {
  id: "flip-image",
  slug: "flip-image",
  name: "Flip Image",
  routeGroup: "tools",
  category: "edit",
  engine: "image",
  description: "Mirror PNG, JPG or WebP images horizontally or vertically, entirely in your browser.",
  keywords: ["flip image", "mirror image", "image flipper"],
  acceptedFileTypes: ["png", "jpg", "webp"],
  outputFileTypes: ["png", "jpg", "webp"],
  // Rendered by the shared ImageStudioApp (Edit tab, locked to "flip") — see
  // appEntry and app/tools/flip-image/page.tsx.
  appEntry: { app: "image-studio", mode: "edit" },
  relatedTools: ["rotate-image", "resize-image", "compress-image"],
  seo: {
    title: "Flip Image — Free, Private & No Upload",
    description:
      "Mirror an image horizontally or flip it vertically directly in your browser. Batch flip multiple images and download as a .zip — nothing is uploaded.",
  },
  faq: [
    {
      question: "Are my images uploaded to a server?",
      answer: "No. Every image is flipped entirely on your device.",
    },
    {
      question: "What's the difference between horizontal and vertical flip?",
      answer:
        "Horizontal flip mirrors left-to-right (like a mirror reflection). Vertical flip turns the image upside down.",
    },
    {
      question: "Can I flip several images at once?",
      answer:
        "Yes — drop multiple images and each is flipped the same way, with individual downloads or a combined .zip.",
    },
  ],
};

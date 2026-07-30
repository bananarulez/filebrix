import type { ToolDefinition } from "../types";

export const rotateImageTool: ToolDefinition = {
  id: "rotate-image",
  slug: "rotate-image",
  name: "Rotate Image",
  routeGroup: "tools",
  category: "edit",
  engine: "image",
  description: "Rotate PNG, JPG or WebP images 90, 180 or 270 degrees, entirely in your browser.",
  keywords: ["rotate image", "turn image", "image rotator"],
  acceptedFileTypes: ["png", "jpg", "webp"],
  outputFileTypes: ["png", "jpg", "webp"],
  // Rendered by the shared ImageStudioApp (Edit tab, locked to "rotate") —
  // see appEntry and app/tools/rotate-image/page.tsx.
  appEntry: { app: "image-studio", mode: "edit" },
  relatedTools: ["flip-image", "resize-image", "compress-image"],
  seo: {
    title: "Rotate Image — Free, Private & No Upload",
    description:
      "Rotate PNG, JPG or WebP images by 90-degree steps directly in your browser. Batch rotate multiple images and download as a .zip — nothing is uploaded.",
  },
  faq: [
    {
      question: "Are my images uploaded to a server?",
      answer: "No. Every image is rotated entirely on your device.",
    },
    {
      question: "My photo looks sideways when I open it, even though it looks fine here — why?",
      answer:
        "Some cameras and phones store a photo's original pixels unrotated and record the intended rotation as metadata instead. This tool always shows and outputs the image already right-side up, and the same rotation is baked into every image processed here — no separate metadata step needed.",
    },
    {
      question: "Can I rotate a whole batch by the same amount?",
      answer: "Yes — set the rotation once and it applies to every image you dropped.",
    },
  ],
};

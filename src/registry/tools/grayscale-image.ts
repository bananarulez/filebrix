import type { ToolDefinition } from "../types";

export const grayscaleImageTool: ToolDefinition = {
  id: "grayscale-image",
  slug: "grayscale-image",
  name: "Convert Image to Grayscale",
  routeGroup: "tools",
  category: "edit",
  engine: "image",
  description: "Turn colour PNG, JPG and WebP images into grayscale in your browser, one at a time or in batches.",
  keywords: ["grayscale image", "convert image to black and white", "greyscale converter", "remove colour from image"],
  acceptedFileTypes: ["png", "jpg", "webp"],
  outputFileTypes: ["png", "jpg", "webp"],
  // Rendered by the shared ImageStudioApp (Edit tab, locked to "grayscale").
  // The action already existed in the Studio with no URL of its own, which
  // made it invisible to search — same fix as the geo Bounding Box/Centroid/
  // Convex Hull pages (ROADMAP.md "Recently shipped").
  appEntry: { app: "image-studio", mode: "edit" },
  relatedTools: ["adjust-image-contrast", "adjust-image-brightness", "png-to-jpg"],
  seo: {
    title: "Convert Image to Grayscale — Free, Private & No Upload",
    description: "Convert colour images to grayscale directly in your browser, individually or across a batch. Nothing is uploaded.",
  },
  faq: [
    {
      question: "Are my images uploaded?",
      answer:
        "No. The conversion runs on your device using your browser's own image pipeline.",
    },
    {
      question: "Is this the same as black and white?",
      answer:
        "Not quite. Grayscale keeps the full range of grey tones between black and white. A true black-and-white (1-bit) image has only two values, which this tool doesn't produce.",
    },
    {
      question: "Does it make the file smaller?",
      answer:
        "Sometimes, but not reliably — PNG and WebP may shrink because there's less colour information, while a re-encoded JPG can grow. The result shows the before and after size for each file.",
    },
    {
      question: "Can I convert many images at once?",
      answer:
        "Yes. Drop a batch and download all the grayscale results together as a .zip.",
    },
  ],
};

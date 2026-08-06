import type { ToolDefinition } from "../types";

export const adjustImageBrightnessTool: ToolDefinition = {
  id: "adjust-image-brightness",
  slug: "adjust-image-brightness",
  name: "Adjust Image Brightness",
  routeGroup: "tools",
  category: "edit",
  engine: "image",
  description: "Brighten or darken PNG, JPG and WebP images by a precise percentage, with a live preview and batch support.",
  keywords: ["adjust image brightness", "brighten image", "darken image", "image brightness online"],
  acceptedFileTypes: ["png", "jpg", "webp"],
  outputFileTypes: ["png", "jpg", "webp"],
  // Rendered by the shared ImageStudioApp (Edit tab, locked to "brightness").
  // The action already existed in the Studio with no URL of its own, which
  // made it invisible to search — same fix as the geo Bounding Box/Centroid/
  // Convex Hull pages (ROADMAP.md "Recently shipped").
  appEntry: { app: "image-studio", mode: "edit" },
  relatedTools: ["adjust-image-contrast", "grayscale-image", "compress-image"],
  seo: {
    title: "Adjust Image Brightness Online — Free, Private & No Upload",
    description: "Brighten or darken images by an exact amount in your browser, one at a time or across a whole batch. Nothing is uploaded.",
  },
  faq: [
    {
      question: "Are my images uploaded to a server?",
      answer:
        "No. The adjustment is applied by your own browser's graphics engine, entirely on your device.",
    },
    {
      question: "Can I fine-tune the amount?",
      answer:
        "Yes. The control pairs a wide slider with a number box and moves in 1% steps, because judging brightness means trying a value, looking, and trying the next one.",
    },
    {
      question: "Can I apply the same brightness to many images?",
      answer:
        "Yes — drop several files, set the amount once, and download all the results together as a .zip.",
    },
    {
      question: "Can I combine this with other adjustments?",
      answer:
        "Yes. After applying, choose \"Continue editing this result\" to feed the output straight into another action, such as contrast or a crop, without downloading in between.",
    },
  ],
};

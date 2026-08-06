import type { ToolDefinition } from "../types";

export const adjustImageContrastTool: ToolDefinition = {
  id: "adjust-image-contrast",
  slug: "adjust-image-contrast",
  name: "Adjust Image Contrast",
  routeGroup: "tools",
  category: "edit",
  engine: "image",
  description: "Increase or reduce contrast on PNG, JPG and WebP images by a precise percentage, with a live preview and batch support.",
  keywords: ["adjust image contrast", "increase image contrast", "reduce contrast", "image contrast online"],
  acceptedFileTypes: ["png", "jpg", "webp"],
  outputFileTypes: ["png", "jpg", "webp"],
  // Rendered by the shared ImageStudioApp (Edit tab, locked to "contrast").
  // The action already existed in the Studio with no URL of its own, which
  // made it invisible to search — same fix as the geo Bounding Box/Centroid/
  // Convex Hull pages (ROADMAP.md "Recently shipped").
  appEntry: { app: "image-studio", mode: "edit" },
  relatedTools: ["adjust-image-brightness", "grayscale-image", "resize-image"],
  seo: {
    title: "Adjust Image Contrast Online — Free, Private & No Upload",
    description: "Raise or lower image contrast by an exact amount in your browser, one image or a whole batch at a time. Nothing is uploaded.",
  },
  faq: [
    {
      question: "Is anything sent to a server?",
      answer:
        "No. Contrast is applied locally by your browser; the images never leave your device.",
    },
    {
      question: "What does a negative value do?",
      answer:
        "It flattens the image — colours move towards mid-grey. Positive values push light and dark tones further apart.",
    },
    {
      question: "Can I process a whole folder of images?",
      answer:
        "You can drop as many files as you like at once, apply the same amount to all of them, and download the results as a single .zip.",
    },
    {
      question: "Will this recover detail from a very flat photo?",
      answer:
        "Only up to a point. Raising contrast stretches the tones that are already recorded; it can't reconstruct detail the camera never captured, and pushing it far will clip highlights and shadows.",
    },
  ],
};

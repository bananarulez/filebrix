import type { ToolDefinition } from "../types";

export const watermarkImageTool: ToolDefinition = {
  id: "watermark-image",
  slug: "watermark-image",
  name: "Add Watermark to Image",
  routeGroup: "tools",
  category: "edit",
  engine: "image",
  description: "Draw a text watermark over PNG, JPG and WebP images, with a position, size, colour and opacity you choose — across a whole batch at once.",
  keywords: ["add watermark to image", "watermark photo", "image watermark online", "add text to image"],
  acceptedFileTypes: ["png", "jpg", "webp"],
  outputFileTypes: ["png", "jpg", "webp"],
  // Rendered by the shared ImageStudioApp (Edit tab, locked to "watermark").
  // The action already existed in the Studio with no URL of its own, which
  // made it invisible to search — same fix as the geo Bounding Box/Centroid/
  // Convex Hull pages (ROADMAP.md "Recently shipped").
  appEntry: { app: "image-studio", mode: "edit" },
  relatedTools: ["resize-image", "compress-image", "crop-image"],
  seo: {
    title: "Add a Watermark to an Image — Free, Private & No Upload",
    description: "Add a text watermark to one image or a whole batch, choosing position, size, colour and opacity. Runs entirely in your browser.",
  },
  faq: [
    {
      question: "Are my images uploaded to add the watermark?",
      answer:
        "No. The text is drawn onto the image by your browser, on your device. This matters here more than most: watermarking usually means the image isn't yet meant to be public.",
    },
    {
      question: "Does the watermark size adapt to different image sizes?",
      answer:
        "Yes. The size is a fraction of each image's shorter side rather than a fixed pixel value, so one setting looks consistent across a batch of differently-sized images.",
    },
    {
      question: "Can I use an image or logo as the watermark?",
      answer:
        "No — this tool draws text only. A logo watermark would need a second image to be decoded and positioned, which is a materially different feature.",
    },
    {
      question: "Can the watermark be removed from the result?",
      answer:
        "The text is painted into the pixels, so there's no separate layer to switch off. Keep your original file if you need an unwatermarked copy — the tool never modifies it.",
    },
  ],
};

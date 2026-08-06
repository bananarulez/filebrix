import type { ToolDefinition } from "../types";

export const cropImageTool: ToolDefinition = {
  id: "crop-image",
  slug: "crop-image",
  name: "Crop Image",
  routeGroup: "tools",
  category: "edit",
  engine: "image",
  description: "Crop PNG, JPG or WebP images to any rectangle by dragging directly on the image, entirely in your browser.",
  keywords: ["crop image", "image cropper", "crop photo online", "cut image", "trim image"],
  acceptedFileTypes: ["png", "jpg", "webp"],
  outputFileTypes: ["png", "jpg", "webp"],
  // Rendered by the shared ImageStudioApp (Edit tab, locked to "crop").
  // The action already existed in the Studio with no URL of its own, which
  // made it invisible to search — same fix as the geo Bounding Box/Centroid/
  // Convex Hull pages (ROADMAP.md "Recently shipped").
  appEntry: { app: "image-studio", mode: "edit" },
  relatedTools: ["resize-image", "rotate-image", "compress-image"],
  seo: {
    title: "Crop Image Online — Free, Private & No Upload",
    description: "Drag a crop rectangle straight onto your image and download the result. Runs entirely in your browser — the image is never uploaded.",
  },
  faq: [
    {
      question: "Is my image uploaded anywhere?",
      answer:
        "No. The crop happens on your device, in the browser tab — the image is never sent to a server.",
    },
    {
      question: "Can I see the exact size of my selection?",
      answer:
        "Yes. The pixel dimensions of the crop rectangle are shown next to the Apply button and update as you drag, so you can hit a target size without guessing. The rectangle is set by dragging — its corners and the whole box are movable — rather than by typing coordinates.",
    },
    {
      question: "Does cropping reduce the image quality?",
      answer:
        "Cropping itself only discards the pixels outside your rectangle; the kept pixels are unchanged. Saving as JPG re-encodes them, so choose PNG or WebP if you want to avoid that.",
    },
    {
      question: "Can I crop several images at once?",
      answer:
        "No — a crop rectangle is specific to one image's content, so this tool works on a single image at a time. Resize and Compress do support batches.",
    },
  ],
};

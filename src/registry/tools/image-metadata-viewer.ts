import type { ToolDefinition } from "../types";

export const imageMetadataViewerTool: ToolDefinition = {
  id: "image-metadata-viewer",
  slug: "image-metadata-viewer",
  name: "Image Metadata Viewer",
  routeGroup: "tools",
  category: "view",
  engine: "image",
  description: "See a photo's EXIF metadata — camera, date, GPS location and more — entirely in your browser.",
  keywords: ["image metadata viewer", "view exif data", "photo metadata", "exif viewer"],
  acceptedFileTypes: ["png", "jpg", "webp"],
  outputFileTypes: [],
  // Rendered by the shared ImageStudioApp's Metadata tab — see appEntry and
  // app/tools/image-metadata-viewer/page.tsx.
  appEntry: { app: "image-studio", mode: "metadata" },
  relatedTools: ["remove-image-metadata"],
  seo: {
    title: "Image Metadata Viewer — Free, Private & No Upload",
    description:
      "Inspect a photo's camera make/model, capture date, exposure settings and GPS location directly in your browser. Your image is never uploaded.",
  },
  faq: [
    {
      question: "Is my image uploaded to a server?",
      answer: "No. Metadata is read entirely on your device.",
    },
    {
      question: "What metadata does this show?",
      answer:
        "Camera make and model, software, capture/modification dates, exposure time, aperture, ISO, focal length, color space, and GPS coordinates if present.",
    },
    {
      question: "This photo has no metadata shown — is that normal?",
      answer:
        "Yes. Screenshots, images re-saved by many apps, and files that already had their metadata stripped often carry little or no EXIF data.",
    },
    {
      question: "Can I remove this metadata?",
      answer: "Yes — use the related Remove EXIF Metadata tool to strip it and download a cleaned copy.",
    },
  ],
};

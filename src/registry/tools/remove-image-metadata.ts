import type { ToolDefinition } from "../types";

export const removeImageMetadataTool: ToolDefinition = {
  id: "remove-image-metadata",
  slug: "remove-image-metadata",
  name: "Remove EXIF Metadata",
  routeGroup: "tools",
  category: "edit",
  engine: "image",
  description: "Strip EXIF/camera metadata — including GPS location — from images, entirely in your browser.",
  keywords: ["remove exif", "strip image metadata", "remove gps from photo", "delete exif data"],
  acceptedFileTypes: ["png", "jpg", "webp"],
  outputFileTypes: ["png", "jpg", "webp"],
  // Rendered by the shared ImageStudioApp's Metadata tab, locked to
  // "remove" — see appEntry and app/tools/remove-image-metadata/page.tsx.
  // Was Edit-tab-locked originally; moved to Metadata to match PDF Studio's
  // own Metadata tab (View/Remove together) — see PROJECT_LOG.md's Studio
  // UX review entry.
  appEntry: { app: "image-studio", mode: "metadata" },
  relatedTools: ["image-metadata-viewer", "compress-image"],
  seo: {
    title: "Remove EXIF Metadata — Free, Private & No Upload",
    description:
      "Strip camera make/model, capture date and GPS location from a photo's EXIF metadata directly in your browser, before you share it. Batch process and download as a .zip.",
  },
  faq: [
    {
      question: "Are my images uploaded to a server?",
      answer:
        "No. Metadata is stripped and the cleaned image is produced entirely on your device — useful since EXIF data can reveal the exact location a photo was taken.",
    },
    {
      question: "What exactly gets removed?",
      answer:
        "All TIFF/EXIF/GPS metadata — camera make and model, capture date, exposure settings, and GPS coordinates if present.",
    },
    {
      question: "Will my photo still look correctly oriented after metadata is removed?",
      answer:
        "Yes. The image is rebuilt with its visual orientation already correct — removing the metadata doesn't leave it looking sideways.",
    },
  ],
};

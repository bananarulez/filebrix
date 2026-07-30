import type { ToolDefinition } from "../types";

export const pngToJpgTool: ToolDefinition = {
  id: "png-to-jpg",
  slug: "png-to-jpg",
  name: "PNG to JPG Converter",
  routeGroup: "convert",
  category: "convert",
  engine: "image",
  description: "Convert PNG images to JPG, with control over the background color and quality, entirely in your browser.",
  keywords: ["png to jpg", "png to jpeg", "convert png to jpg"],
  acceptedFileTypes: ["png"],
  outputFileTypes: ["jpg"],
  // Rendered by the shared ImageStudioApp (Convert tab, locked to
  // "png-to-jpg") — see appEntry and app/convert/png-to-jpg/page.tsx.
  appEntry: { app: "image-studio", mode: "convert", lockedFormat: "png", outputFormat: "jpg" },
  relatedTools: ["jpg-to-png", "compress-image", "resize-image"],
  seo: {
    title: "PNG to JPG Converter — Free, Private & No Upload",
    description:
      "Convert PNG images to JPG directly in your browser, with a quality slider and a background-color option for transparent PNGs. Batch convert and download as a .zip.",
  },
  faq: [
    {
      question: "Are my images uploaded to a server?",
      answer: "No. Every image is converted entirely on your device, including in batch.",
    },
    {
      question: "What happens to transparent parts of my PNG?",
      answer:
        "JPG doesn't support transparency. You choose a background color (white by default) to fill those areas — it's never done silently.",
    },
    {
      question: "Can I convert many PNGs at once?",
      answer: "Yes. Drop multiple files and download each one individually or all together as a .zip.",
    },
  ],
};

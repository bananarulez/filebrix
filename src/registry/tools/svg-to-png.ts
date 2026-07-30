import type { ToolDefinition } from "../types";

export const svgToPngTool: ToolDefinition = {
  id: "svg-to-png",
  slug: "svg-to-png",
  name: "SVG to PNG Converter",
  routeGroup: "convert",
  category: "convert",
  engine: "image",
  description: "Rasterize SVG vector images to PNG, safely and entirely in your browser.",
  keywords: ["svg to png", "convert svg to png", "svg rasterize"],
  acceptedFileTypes: ["svg"],
  outputFileTypes: ["png"],
  // Rendered by the shared ImageStudioApp (Convert tab, locked to
  // "svg-to-png") — see appEntry and app/convert/svg-to-png/page.tsx.
  appEntry: { app: "image-studio", mode: "convert", lockedFormat: "svg", outputFormat: "png" },
  relatedTools: ["png-to-webp", "resize-image"],
  seo: {
    title: "SVG to PNG Converter — Free, Private & No Upload",
    description:
      "Convert SVG vector images to PNG directly in your browser. SVG content is sanitized before rendering and never executed — nothing is uploaded.",
  },
  faq: [
    {
      question: "Is my SVG uploaded to a server?",
      answer: "No. It's sanitized and rendered to PNG entirely on your device.",
    },
    {
      question: "Is it safe to convert an SVG from an untrusted source?",
      answer:
        "Yes. SVG files can contain embedded scripts, so this tool sanitizes the SVG's markup before rendering it, and renders it in a way that never executes any script it might contain, regardless.",
    },
    {
      question: "What size will the output PNG be?",
      answer:
        "By default, the SVG's own declared width and height (or viewBox). If the SVG doesn't specify a size, a reasonable default is used.",
    },
    {
      question: "Is the output transparent?",
      answer: "Yes, by default — PNG supports transparency, so any areas your SVG doesn't cover stay transparent unless you choose a background color.",
    },
  ],
};

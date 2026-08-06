import type { ToolDefinition } from "../types";

export const watermarkPdfTool: ToolDefinition = {
  id: "watermark-pdf",
  slug: "watermark",
  name: "Watermark PDF",
  routeGroup: "pdf",
  category: "edit",
  engine: "pdf",
  description:
    "Stamp text such as DRAFT or CONFIDENTIAL across every page of a PDF, with a position, size, angle and opacity you choose.",
  keywords: ["watermark pdf", "add watermark to pdf", "stamp pdf", "draft watermark pdf", "confidential pdf"],
  acceptedFileTypes: ["pdf"],
  outputFileTypes: ["pdf"],
  // Rendered by the shared PdfStudioApp (Edit tab, locked to "watermark").
  appEntry: { app: "pdf-studio", mode: "edit" },
  // Slugs, not ids — /pdf/* tools use short slugs (merge, rotate, ...).
  relatedTools: ["page-numbers", "merge", "metadata-viewer"],
  seo: {
    title: "Watermark PDF — Free, Private & No Upload",
    description:
      "Add a text watermark to every page of a PDF in your browser, choosing position, size, angle and opacity. The document is never uploaded.",
  },
  faq: [
    {
      question: "Is my PDF uploaded to add the watermark?",
      answer:
        "No. The text is drawn onto the pages on your device. This matters especially here: a document being marked DRAFT or CONFIDENTIAL is, by definition, one you don't want circulating.",
    },
    {
      question: "Can I use an image or logo as the watermark?",
      answer:
        "No — this draws text only. An image watermark would mean embedding a second file and positioning it per page, which is a materially larger feature than the text stamp this provides.",
    },
    {
      question: "Which characters can I use?",
      answer:
        "The output uses one of the fonts built into every PDF reader, so no font file has to be embedded — the trade-off is that it covers basic Latin characters and common Western European accents. Text outside that range is rejected with an explanation rather than being silently mangled.",
    },
    {
      question: "Does the watermark appear on rotated pages correctly?",
      answer:
        "Yes. Pages carrying a rotation are handled explicitly, so the watermark reads the right way up in a viewer rather than appearing sideways or off the edge.",
    },
    {
      question: "Can the watermark be removed afterwards?",
      answer:
        "It's drawn into each page's content, so there's no separate layer to switch off — but it isn't encryption either, and someone determined can edit it out with the right software. Treat it as a clear marking, not as protection.",
    },
    {
      question: "What happens to a signed PDF?",
      answer:
        "You'll be warned before you commit. Adding a watermark changes the document, which invalidates any existing digital signature — the file still works, but the signature is lost.",
    },
  ],
};

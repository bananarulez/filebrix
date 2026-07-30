import type { ToolDefinition } from "../types";

export const rotatePdfTool: ToolDefinition = {
  id: "rotate-pdf",
  slug: "rotate",
  name: "Rotate PDF",
  routeGroup: "pdf",
  category: "edit",
  engine: "pdf",
  description: "Rotate any page of a PDF — individually or all at once — entirely in your browser.",
  keywords: ["rotate pdf", "turn pdf pages", "fix pdf orientation", "rotate pdf pages"],
  acceptedFileTypes: ["pdf"],
  outputFileTypes: ["pdf"],
  appEntry: { app: "pdf-studio", mode: "pages" },
  relatedTools: ["reorder-pages", "merge", "split"],
  seo: {
    title: "Rotate PDF Pages — Free, Private & No Upload",
    description:
      "Rotate individual PDF pages 90, 180 or 270 degrees directly in your browser. Preview every page as a thumbnail before downloading — your file is never uploaded.",
  },
  faq: [
    {
      question: "Is my PDF uploaded anywhere?",
      answer: "No. Rotation is applied and the new PDF is built entirely on your device.",
    },
    {
      question: "Can I rotate just one page instead of the whole document?",
      answer:
        "Yes. Use the rotate-left/rotate-right buttons on any individual page thumbnail — only the pages you rotate are changed.",
    },
    {
      question: "Does this handle pages that are already rotated in the source file?",
      answer:
        "Yes. Your rotation is applied on top of whatever rotation the page already has, so the result reflects both.",
    },
    {
      question: "What happens to a digitally signed PDF?",
      answer:
        "It still works, but the result won't be signed. These tools rebuild the document, and a digital signature only covers the exact bytes it was applied to — so any edit invalidates it. Signed PDFs are detected and you'll see a warning before you process one; keep the original if you need the signature to stay valid.",
    },
  ],
};

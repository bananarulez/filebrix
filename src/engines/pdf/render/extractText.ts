type PDFDocumentProxy = import("pdfjs-dist").PDFDocumentProxy;
type PDFPageProxy = import("pdfjs-dist").PDFPageProxy;
type TextContent = Awaited<ReturnType<PDFPageProxy["getTextContent"]>>;
type TextContentItem = TextContent["items"][number];

export interface PdfTextExtractionResult {
  pages: string[];
  hasExtractableText: boolean;
}

/** `TextItem` (has `.str`) vs. `TextMarkedContent` (no `.str`, marks tagged
 * PDF structure) — pdf.js doesn't re-export `TextItem` from its top-level
 * types, so this narrows structurally instead of importing it by name. */
function hasStr(item: TextContentItem): item is TextContentItem & { str: string } {
  return typeof item === "object" && item !== null && "str" in item;
}

/** Extracts embedded text only — no OCR, ever. If every page comes back
 * empty, the caller is expected to show the exact message required by the
 * product spec: "No extractable text was found. This document may be
 * scanned." */
export async function extractPdfText(doc: PDFDocumentProxy): Promise<PdfTextExtractionResult> {
  const pages: string[] = [];

  for (let pageIndex = 0; pageIndex < doc.numPages; pageIndex += 1) {
    const page = await doc.getPage(pageIndex + 1);
    try {
      const content = await page.getTextContent();
      const text = content.items
        .filter(hasStr)
        .map((item) => item.str)
        .join("");
      pages.push(text);
    } finally {
      page.cleanup();
    }
  }

  const hasExtractableText = pages.some((text) => text.trim().length > 0);
  return { pages, hasExtractableText };
}

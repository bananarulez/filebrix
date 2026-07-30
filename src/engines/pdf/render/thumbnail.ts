import { ProcessingError } from "@/lib/errors/ProcessingError";

type PDFDocumentProxy = import("pdfjs-dist").PDFDocumentProxy;

/** Renders a single page at thumbnail resolution only — never full
 * resolution, so scrolling a large PDF's page grid stays cheap. Caller (a
 * lazy, IntersectionObserver-driven UI) decides when this actually runs. */
export async function renderPageThumbnail(
  doc: PDFDocumentProxy,
  pageIndex: number,
  maxWidthPx: number
): Promise<string> {
  const page = await doc.getPage(pageIndex + 1); // pdf.js pages are 1-indexed
  try {
    const unscaledViewport = page.getViewport({ scale: 1 });
    const scale = maxWidthPx / unscaledViewport.width;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(viewport.width));
    canvas.height = Math.max(1, Math.round(viewport.height));
    const context = canvas.getContext("2d");
    if (!context) {
      throw new ProcessingError("WORKER_CRASH", "Your browser could not create a canvas to render this page.");
    }

    await page.render({ canvasContext: context, viewport, canvas }).promise;
    return canvas.toDataURL("image/png");
  } finally {
    page.cleanup();
  }
}

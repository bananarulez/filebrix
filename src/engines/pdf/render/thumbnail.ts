import { ProcessingError } from "@/lib/errors/ProcessingError";

type PDFDocumentProxy = import("pdfjs-dist").PDFDocumentProxy;

/** Renders a single page at thumbnail resolution only — never full
 * resolution, so scrolling a large PDF's page grid stays cheap. Caller (a
 * lazy, IntersectionObserver-driven UI) decides when this actually runs. */
export async function renderPageThumbnail(
  doc: PDFDocumentProxy,
  pageIndex: number,
  maxWidthPx: number,
  /**
   * Absolute rotation in degrees, replacing the page's own — not an offset.
   * Omit to render the page as stored.
   *
   * The page grid needs this because a user's rotation is a pending edit that
   * doesn't exist in the document yet. Without it the thumbnail re-rendered
   * byte-identical output on every rotate click while its container swapped
   * aspect ratio, so the only visible effect of "rotate" was the preview box
   * changing shape. The *file* was always rotated correctly — verified by
   * reading the page angles back out of a downloaded PDF — which is exactly
   * why nothing caught it.
   */
  rotation?: number
): Promise<string> {
  const page = await doc.getPage(pageIndex + 1); // pdf.js pages are 1-indexed
  try {
    // Measured *after* rotation: a 90°-rotated page's width is the upright
    // page's height, so scaling from the unrotated box would overshoot
    // `maxWidthPx` by the aspect ratio.
    const unscaledViewport = page.getViewport({ scale: 1, rotation });
    const scale = maxWidthPx / unscaledViewport.width;
    const viewport = page.getViewport({ scale, rotation });

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

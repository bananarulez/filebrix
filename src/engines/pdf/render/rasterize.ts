import { ProcessingError } from "@/lib/errors/ProcessingError";
import type { PdfImageFormat } from "../types";

type PDFDocumentProxy = import("pdfjs-dist").PDFDocumentProxy;

export interface RasterizeOptions {
  format: PdfImageFormat;
  /** Multiplier over the page's own point size — 2 is a reasonable "print
   * quality" default without ballooning memory on large documents. */
  scale: number;
}

const MIME_BY_FORMAT: Record<PdfImageFormat, string> = {
  png: "image/png",
  jpeg: "image/jpeg",
};

/** Renders one page at (near-)full resolution — used for PDF→Images.
 * Callers should invoke this sequentially, one page at a time, rather than
 * in parallel, to keep peak memory bounded on many-page documents. */
export async function renderPageImage(
  doc: PDFDocumentProxy,
  pageIndex: number,
  options: RasterizeOptions
): Promise<Blob> {
  const page = await doc.getPage(pageIndex + 1);
  try {
    const viewport = page.getViewport({ scale: options.scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(viewport.width));
    canvas.height = Math.max(1, Math.round(viewport.height));
    const context = canvas.getContext("2d");
    if (!context) {
      throw new ProcessingError("WORKER_CRASH", "Your browser could not create a canvas to render this page.");
    }

    await page.render({ canvasContext: context, viewport, canvas }).promise;

    const mimeType = MIME_BY_FORMAT[options.format];
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mimeType));
    if (!blob) {
      throw new ProcessingError("WORKER_CRASH", "Could not encode this page as an image.");
    }
    return blob;
  } finally {
    page.cleanup();
  }
}

import { openPdfDocument } from "./pdfjsClient";
import { renderPageThumbnail } from "./thumbnail";
import { renderPageImage, type RasterizeOptions } from "./rasterize";
import { extractPdfText, type PdfTextExtractionResult } from "./extractText";

export interface PdfRenderSession {
  pageCount: number;
  renderThumbnail(pageIndex: number, maxWidthPx: number): Promise<string>;
  renderPageImage(pageIndex: number, options: RasterizeOptions): Promise<Blob>;
  extractText(): Promise<PdfTextExtractionResult>;
  close(): Promise<void>;
}

/**
 * Opens a PDF once via pdf.js and reuses that parsed document for every
 * thumbnail/rasterize/text-extraction call — re-parsing per page would be
 * wasteful for a many-page document. Main-thread only (see
 * engines/pdf/render/pdfjsClient.ts); callers must `close()` when done
 * (component unmount, file swapped) to free pdf.js's internal resources.
 */
export async function openPdfRenderSession(file: File): Promise<PdfRenderSession> {
  const bytes = await file.arrayBuffer();
  const doc = await openPdfDocument(bytes);
  let closed = false;

  return {
    pageCount: doc.numPages,
    renderThumbnail: (pageIndex, maxWidthPx) => renderPageThumbnail(doc, pageIndex, maxWidthPx),
    renderPageImage: (pageIndex, options) => renderPageImage(doc, pageIndex, options),
    extractText: () => extractPdfText(doc),
    close: async () => {
      if (closed) return;
      closed = true;
      await doc.loadingTask.destroy();
    },
  };
}

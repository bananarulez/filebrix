import { ProcessingError } from "@/lib/errors/ProcessingError";

type PdfjsModule = typeof import("pdfjs-dist");
type PDFDocumentProxy = import("pdfjs-dist").PDFDocumentProxy;

let modulePromise: Promise<PdfjsModule> | null = null;

/**
 * pdf.js manages its own internal worker/message protocol (like DuckDB-WASM
 * — see CLAUDE.md rule 4), so this talks to it directly rather than routing
 * through engines/shared/workerClient.ts. Assets are self-hosted under
 * /public/pdfjs (see scripts/copy-pdfjs-assets.mjs) so nothing is fetched
 * from a third-party CDN and connect-src 'self' stays intact.
 */
async function getPdfjs(): Promise<PdfjsModule> {
  if (!modulePromise) {
    modulePromise = import("pdfjs-dist").then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";
      return pdfjs;
    });
  }
  return modulePromise;
}

function toProcessingError(cause: unknown, pdfjs: PdfjsModule): ProcessingError {
  if (cause instanceof ProcessingError) return cause;
  if (cause instanceof pdfjs.PasswordException) {
    return new ProcessingError(
      "UNSUPPORTED_FORMAT",
      "This PDF is password-protected. These tools can't open encrypted PDFs."
    );
  }
  const message = cause instanceof Error ? cause.message : String(cause);
  return new ProcessingError(
    "MALFORMED_FILE",
    message.toLowerCase().includes("invalid")
      ? "This file doesn't look like a valid PDF, or it may be corrupted."
      : message
  );
}

/** Opens a PDF for rendering/text-extraction. Caller must call `.destroy()`
 * on the returned document when done to free pdf.js's internal resources. */
export async function openPdfDocument(bytes: ArrayBuffer): Promise<PDFDocumentProxy> {
  const pdfjs = await getPdfjs();
  try {
    const loadingTask = pdfjs.getDocument({
      data: bytes,
      cMapUrl: "/pdfjs/cmaps/",
      cMapPacked: true,
      standardFontDataUrl: "/pdfjs/standard_fonts/",
      wasmUrl: "/pdfjs/wasm/",
      iccUrl: "/pdfjs/iccs/",
    });
    return await loadingTask.promise;
  } catch (cause) {
    throw toProcessingError(cause, pdfjs);
  }
}

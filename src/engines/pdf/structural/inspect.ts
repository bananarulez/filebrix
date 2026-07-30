import { hasDigitalSignature, loadPdfDocument } from "./load";
import type { PdfDocumentInfo } from "../types";

/** Page count/size/rotation for every page — used to build a page list
 * (e.g. for a thumbnail grid) before any thumbnail has actually rendered,
 * and doubles as the up-front encrypted/malformed-PDF check. */
export async function inspectPdf(bytes: Uint8Array | ArrayBuffer): Promise<PdfDocumentInfo> {
  // Inspection is read-only; no reason to let pdf-lib rewrite the Info dict.
  const doc = await loadPdfDocument(bytes, { preserveMetadata: true });
  const pages = doc.getPages().map((page, index) => ({
    index,
    width: page.getWidth(),
    height: page.getHeight(),
    rotation: page.getRotation().angle,
  }));
  return { pageCount: pages.length, pages, hasSignature: hasDigitalSignature(doc) };
}

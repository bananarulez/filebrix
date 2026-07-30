/** One page reference into a (possibly multi-file) source set — the shared
 * building block behind merge/extract/delete/reorder/rotate/split. */
export interface PageRef {
  sourceIndex: number;
  pageIndex: number;
  /** Degrees added to whatever rotation the page already has (0/90/180/270). */
  rotationDelta?: number;
}

export interface PdfPageInfo {
  index: number;
  width: number;
  height: number;
  /** The page's own absolute rotation (0/90/180/270), as authored. */
  rotation: number;
}

export interface PdfDocumentInfo {
  pageCount: number;
  pages: PdfPageInfo[];
  /**
   * True when the document carries a digital-signature field. Purely
   * advisory: signed PDFs are fully processable, but pdf-lib doesn't
   * understand signatures, so any output is unsigned — the UI warns rather
   * than blocking. Contrast with encryption, which is a hard rejection in
   * `structural/load.ts`.
   */
  hasSignature: boolean;
}

export interface PdfMetadataInfo {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  creator?: string;
  producer?: string;
  creationDate?: string;
  modificationDate?: string;
  pageCount: number;
  /** See `PdfDocumentInfo.hasSignature` — advisory, never blocking. */
  hasSignature: boolean;
}

export type PdfImageFormat = "png" | "jpeg";

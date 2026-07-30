import { PDFDict, PDFDocument, PDFName, PDFRef } from "pdf-lib";
import { hasDigitalSignature, loadPdfDocument, toPdfProcessingError } from "./load";
import type { PdfMetadataInfo } from "../types";

const METADATA = PDFName.of("Metadata");

/**
 * Reads what the file actually says, not what pdf-lib would like it to say.
 *
 * `preserveMetadata` is essential here, not cosmetic: pdf-lib's default load
 * path stamps `Producer`/`Creator` and sets `ModDate` to *now*, so without
 * it a metadata *viewer* would report today's date as every document's
 * modification date and attribute every file to pdf-lib. Confirmed against
 * `multi-page.pdf`, whose real ModDate is days older than the value the
 * default load reported.
 */
export async function readPdfMetadata(bytes: Uint8Array | ArrayBuffer): Promise<PdfMetadataInfo> {
  const doc = await loadPdfDocument(bytes, { preserveMetadata: true });
  return {
    title: doc.getTitle(),
    author: doc.getAuthor(),
    subject: doc.getSubject(),
    keywords: doc.getKeywords(),
    creator: doc.getCreator(),
    producer: doc.getProducer(),
    creationDate: doc.getCreationDate()?.toISOString(),
    modificationDate: doc.getModificationDate()?.toISOString(),
    pageCount: doc.getPageCount(),
    hasSignature: hasDigitalSignature(doc),
  };
}

/**
 * Removes an XMP metadata stream from whatever dictionary holds it (the
 * catalog, or an individual page — both are legal locations).
 *
 * **Deleting the dictionary entry alone is not enough**, which is the
 * non-obvious part: `PDFDict.delete()` removes the *reference*, but the
 * stream is a separate indirect object that `save()` still serializes, so
 * the XMP packet survives verbatim in the output bytes. Confirmed
 * empirically against `tests/fixtures/pdf/with-xmp.pdf` — after a
 * `catalog.delete(Metadata)` on its own, the raw output still contained the
 * complete `<x:xmpmeta>` packet. The object itself has to be dropped from
 * the context too. Both calls are public pdf-lib API (`PDFDict.delete`,
 * `PDFContext.delete`); no private internals are touched.
 */
function deleteMetadataStream(doc: PDFDocument, holder: PDFDict): void {
  const entry = holder.get(METADATA);
  if (entry === undefined) return;
  // A direct (non-indirect) stream has no ref to unregister; dropping the
  // dictionary entry is the whole job in that case.
  if (entry instanceof PDFRef) doc.context.delete(entry);
  holder.delete(METADATA);
}

/**
 * Strips *both* metadata channels a PDF can carry:
 *
 * 1. The **Info dictionary** — dropped wholesale via the trailer rather than
 *    blanked field by field, which removes title/author/subject/keywords/
 *    creator/producer/dates *and* any nonstandard entries a given PDF
 *    creator added, in one step.
 * 2. The **XMP metadata stream** (`/Metadata`) — the separate XML packet
 *    Acrobat, InDesign, Word and most scanner software write alongside the
 *    Info dictionary, which commonly duplicates the author/title *and* adds
 *    tool, device and edit-history details.
 *
 * Page-level `/Metadata` is removed too, not only the catalog's: it's a
 * legal (if uncommon) location, and a tool whose whole purpose is stripping
 * metadata before sharing shouldn't leave a copy somewhere it didn't look.
 */
export async function removePdfMetadata(bytes: Uint8Array | ArrayBuffer): Promise<Uint8Array> {
  try {
    // `preserveMetadata` stops pdf-lib re-stamping its own Producer and a
    // fresh ModDate on load — which would otherwise put metadata straight
    // back into the file this tool exists to clean.
    const doc = await loadPdfDocument(bytes, { preserveMetadata: true });

    doc.context.trailerInfo.Info = undefined;
    deleteMetadataStream(doc, doc.catalog);
    for (const page of doc.getPages()) deleteMetadataStream(doc, page.node);

    return await doc.save();
  } catch (cause) {
    throw toPdfProcessingError(cause);
  }
}

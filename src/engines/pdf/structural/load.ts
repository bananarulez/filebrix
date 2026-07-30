import { PDFDocument, PDFArray, PDFDict, PDFName } from "pdf-lib";
import { ProcessingError } from "@/lib/errors/ProcessingError";

const FT = PDFName.of("FT");
const KIDS = PDFName.of("Kids");
const SIG = "/Sig";

/**
 * True when the document carries at least one digital-signature field.
 *
 * Deliberately a *detection* helper, not a rejection: unlike encryption
 * (which pdf-lib genuinely cannot work with, so it hard-errors above), a
 * signed PDF processes perfectly well — pdf-lib simply doesn't understand
 * signatures, so the output is unsigned. That is a warning the user should
 * see, not a reason to refuse the file, which is why this returns a boolean
 * instead of throwing.
 *
 * Walks the AcroForm field tree rather than just its top level: PDF field
 * names are hierarchical, and a signature is commonly a leaf under a parent
 * field rather than a direct entry in /Fields.
 */
export function hasDigitalSignature(doc: PDFDocument): boolean {
  const acroForm = doc.catalog.lookupMaybe(PDFName.of("AcroForm"), PDFDict);
  if (!acroForm) return false;

  const roots = acroForm.lookupMaybe(PDFName.of("Fields"), PDFArray);
  if (!roots) return false;

  // Iterative walk with a visited set: a malformed or hostile file can point
  // /Kids back at an ancestor, and a recursive walk would never return.
  const seen = new Set<PDFDict>();
  const queue: PDFDict[] = [];

  for (let i = 0; i < roots.size(); i++) {
    const field = roots.lookupMaybe(i, PDFDict);
    if (field) queue.push(field);
  }

  while (queue.length > 0) {
    const field = queue.pop()!;
    if (seen.has(field)) continue;
    seen.add(field);

    if (field.get(FT)?.toString() === SIG) return true;

    const kids = field.lookupMaybe(KIDS, PDFArray);
    for (let i = 0; i < (kids?.size() ?? 0); i++) {
      const kid = kids!.lookupMaybe(i, PDFDict);
      if (kid) queue.push(kid);
    }
  }

  return false;
}

/**
 * Every structural operation goes through this. Encrypted PDFs are treated
 * as uniformly unsupported here rather than partially supported in some
 * tools and not others — pdf-lib has no real decryption path (its own
 * `ignoreEncryption` flag only loads the structure; content streams stay
 * unusable), and every tool in this engine ultimately needs to read/write
 * page content via pdf-lib.
 */
export interface LoadPdfOptions {
  /**
   * Prevents pdf-lib from stamping its own Info dictionary on load.
   *
   * pdf-lib calls `updateInfoDict()` in its constructor (not at save time),
   * which unconditionally sets `Producer` to "pdf-lib (…)" and `ModDate` to
   * *now*, plus `Creator`/`CreationDate` when absent. For most operations
   * that's harmless housekeeping — but for Remove Metadata it would defeat
   * the tool: the output would carry a producer string and a fresh
   * timestamp revealing when the file was processed. Confirmed empirically
   * (a unit test caught the re-added `Producer` before this flag was used).
   */
  preserveMetadata?: boolean;
}

export async function loadPdfDocument(
  bytes: Uint8Array | ArrayBuffer,
  options: LoadPdfOptions = {}
): Promise<PDFDocument> {
  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(bytes, {
      ignoreEncryption: true,
      updateMetadata: !options.preserveMetadata,
    });
  } catch (cause) {
    throw toProcessingError(cause);
  }
  if (doc.isEncrypted) {
    throw new ProcessingError(
      "UNSUPPORTED_FORMAT",
      "This PDF is password-protected. These tools can't open encrypted PDFs."
    );
  }
  return doc;
}

function toProcessingError(cause: unknown): ProcessingError {
  if (cause instanceof ProcessingError) return cause;
  const message = cause instanceof Error ? cause.message : String(cause);
  const lower = message.toLowerCase();

  if (lower.includes("encrypt")) {
    return new ProcessingError(
      "UNSUPPORTED_FORMAT",
      "This PDF is password-protected. These tools can't open encrypted PDFs."
    );
  }
  if (
    lower.includes("out of memory") ||
    lower.includes("allocation failed") ||
    lower.includes("array buffer allocation")
  ) {
    return new ProcessingError("OUT_OF_MEMORY", "Your browser ran out of memory processing this file.");
  }
  return new ProcessingError(
    "MALFORMED_FILE",
    "This file doesn't look like a valid PDF, or it may be corrupted."
  );
}

export { toProcessingError as toPdfProcessingError };

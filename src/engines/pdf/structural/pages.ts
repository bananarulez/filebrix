import { PDFDocument, degrees } from "pdf-lib";
import { ProcessingError } from "@/lib/errors/ProcessingError";
import type { Progress } from "@/engines/shared/types";
import { loadPdfDocument, toPdfProcessingError } from "./load";
import type { PageRef } from "../types";

/**
 * Copying a page is fast enough that a report per page would be mostly
 * postMessage overhead on a 5,000-page selection. Reporting at most ~100
 * times keeps the bar smooth and the chatter bounded regardless of size.
 */
const MAX_PROGRESS_REPORTS = 100;

/** Page copying is the bulk of the work; `save()` gets the last slice. */
const COPY_PHASE_PERCENT = 95;

/**
 * The one primitive behind merge/extract/delete/reorder/rotate/split: build
 * a new PDF from an ordered list of page references into one or more source
 * files. Each tool differs only in how it *computes* `selection` — the copy
 * logic itself is identical, which is what keeps this one function instead
 * of six near-duplicate implementations.
 *
 * `onProgress` is purely observational — it never changes what gets copied
 * or in what order. Granularity is per *page*, not per source file: the
 * copy loop is already per-page, so nothing had to be restructured to
 * report at the finer level, and per-file granularity would be useless for
 * the common single-file case (rotate/extract/delete/reorder all pass one
 * source), where it could only ever report 0% then 100%.
 */
export async function buildPdfFromSelection(
  sources: (Uint8Array | ArrayBuffer)[],
  selection: PageRef[],
  onProgress?: (progress: Progress) => void
): Promise<Uint8Array> {
  if (selection.length === 0) {
    throw new ProcessingError("MALFORMED_FILE", "No pages selected. Choose at least one page to continue.");
  }

  const total = selection.length;
  const reportEvery = Math.max(1, Math.ceil(total / MAX_PROGRESS_REPORTS));

  try {
    onProgress?.({ percent: 0, message: `Reading ${sources.length === 1 ? "the PDF" : `${sources.length} PDFs`}…` });
    const sourceDocs = await Promise.all(sources.map((bytes) => loadPdfDocument(bytes)));
    const output = await PDFDocument.create();

    for (const [position, ref] of selection.entries()) {
      const sourceDoc = sourceDocs[ref.sourceIndex];
      if (!sourceDoc) {
        throw new ProcessingError("MALFORMED_FILE", "One of the selected pages could not be found.");
      }
      const [copiedPage] = await output.copyPages(sourceDoc, [ref.pageIndex]);
      if (!copiedPage) {
        throw new ProcessingError("MALFORMED_FILE", "One of the selected pages could not be found.");
      }
      if (ref.rotationDelta) {
        const current = copiedPage.getRotation().angle;
        copiedPage.setRotation(degrees(current + ref.rotationDelta));
      }
      output.addPage(copiedPage);

      const done = position + 1;
      if (done % reportEvery === 0 || done === total) {
        onProgress?.({
          percent: Math.round((done / total) * COPY_PHASE_PERCENT),
          message: `Copying page ${done} of ${total}…`,
        });
      }
    }

    onProgress?.({ percent: COPY_PHASE_PERCENT, message: "Writing the new PDF…" });
    const bytes = await output.save();
    onProgress?.({ percent: 100, message: "Done" });
    return bytes;
  } catch (cause) {
    throw toPdfProcessingError(cause);
  }
}

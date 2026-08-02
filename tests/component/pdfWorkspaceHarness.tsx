import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import { PdfFilePanel, PdfWorkspace } from "@/components/pdf/PdfWorkspace";

/**
 * Mounts a single PDF Studio tool together with the shared drop zone that
 * now feeds it.
 *
 * The tools stopped owning their own file state, render session and
 * `FileDropZone` when `PdfWorkspace` took over (so a PDF survives switching
 * tabs and Pages actions). Rendering the provider plus `PdfFilePanel` keeps
 * these tests driving the *real* load path — `inspectPdfFile` and
 * `openPdfRenderSession` are still the only things they mock — rather than
 * injecting a pre-loaded document and skipping it.
 */
export function renderWithPdfWorkspace(
  ui: ReactElement,
  options: { multiple?: boolean } = {}
): ReturnType<typeof render> {
  return render(
    <PdfWorkspace>
      <PdfFilePanel multiple={options.multiple ?? false} />
      {ui}
    </PdfWorkspace>
  );
}

/** The `PdfDocumentInfo` shape `inspectPdfFile` returns, for a document of `pageCount` uniform Letter pages. */
export function makePdfInfo(pageCount: number, hasSignature = false) {
  return {
    pageCount,
    pages: Array.from({ length: pageCount }, (_, i) => ({ index: i, width: 612, height: 792, rotation: 0 })),
    hasSignature,
  };
}

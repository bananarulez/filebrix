import { describe, expect, it, vi } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import { PdfPageWorkspaceTool } from "@/components/pdf/PdfPageWorkspaceTool";
import { renderWithPdfWorkspace } from "./pdfWorkspaceHarness";
import { inspectPdfFile, buildPdfFromSelectionFiles } from "@/engines/pdf";
import { openPdfRenderSession } from "@/engines/pdf/render/session";
import { ProcessingError } from "@/lib/errors/ProcessingError";

vi.mock("@/engines/pdf", () => ({
  inspectPdfFile: vi.fn(),
  buildPdfFromSelectionFiles: vi.fn(),
}));

vi.mock("@/engines/pdf/render/session", () => ({
  openPdfRenderSession: vi.fn(),
}));

const mockedInspect = vi.mocked(inspectPdfFile);
const mockedBuild = vi.mocked(buildPdfFromSelectionFiles);
const mockedOpenSession = vi.mocked(openPdfRenderSession);

function makeFile(name: string): File {
  return new File(["stub"], name, { type: "application/pdf" });
}

function makeInfo(pageCount: number, hasSignature = false) {
  return {
    pageCount,
    pages: Array.from({ length: pageCount }, (_, i) => ({ index: i, width: 612, height: 792, rotation: 0 })),
    hasSignature,
  };
}

function makeSession() {
  return {
    pageCount: 1, hasSignature: false,
    renderThumbnail: vi.fn().mockResolvedValue("data:image/png;base64,stub"),
    renderPageImage: vi.fn(),
    extractText: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
  };
}

function selectFile(file: File) {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });
}

/**
 * Second and subsequent files go in through a real drop event rather than
 * the file input: React's input-value tracking swallows a second `change`
 * on the same input when jsdom leaves `value` at "" both times, so the drop
 * event is the only way to test back-to-back file selections at all.
 */
function dropFile(file: File) {
  const zone = document.querySelector('[role="button"]') as HTMLElement;
  fireEvent.drop(zone, { dataTransfer: { files: [file] } });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe("PdfPageWorkspaceTool — extract mode", () => {
  it("shows one thumbnail per page and requires a selection before extracting", async () => {
    mockedInspect.mockResolvedValue(makeInfo(3));
    mockedOpenSession.mockResolvedValue(makeSession());

    renderWithPdfWorkspace(<PdfPageWorkspaceTool mode="extract" />);
    selectFile(makeFile("doc.pdf"));

    await waitFor(() => expect(screen.getAllByText(/^Page \d$/)).toHaveLength(3));

    fireEvent.click(screen.getByRole("button", { name: "Extract selected pages" }));
    await waitFor(() =>
      expect(screen.getByText("Select at least one page to extract.")).toBeInTheDocument()
    );
    expect(mockedBuild).not.toHaveBeenCalled();
  });

  it("builds a PDF from only the checked pages", async () => {
    mockedInspect.mockResolvedValue(makeInfo(2));
    mockedOpenSession.mockResolvedValue(makeSession());
    mockedBuild.mockResolvedValue(new Blob(["pdf"], { type: "application/pdf" }));

    renderWithPdfWorkspace(<PdfPageWorkspaceTool mode="extract" />);
    selectFile(makeFile("doc.pdf"));
    await waitFor(() => expect(screen.getAllByText(/^Page \d$/)).toHaveLength(2));

    fireEvent.click(screen.getByRole("checkbox", { name: /Keep page 2/i }));
    fireEvent.click(screen.getByRole("button", { name: "Extract selected pages" }));

    await waitFor(() =>
      expect(mockedBuild).toHaveBeenCalledWith(
        [expect.anything()],
        [{ sourceIndex: 0, pageIndex: 1, rotationDelta: undefined }],
        expect.any(Function)
      )
    );
    await waitFor(() => expect(screen.getByRole("button", { name: /download/i })).toBeInTheDocument());
  });
});

describe("PdfPageWorkspaceTool — delete mode", () => {
  it("refuses to delete every page", async () => {
    mockedInspect.mockResolvedValue(makeInfo(2));
    mockedOpenSession.mockResolvedValue(makeSession());

    renderWithPdfWorkspace(<PdfPageWorkspaceTool mode="delete" />);
    selectFile(makeFile("doc.pdf"));
    await waitFor(() => expect(screen.getAllByText(/^Page \d$/)).toHaveLength(2));

    fireEvent.click(screen.getByRole("checkbox", { name: /Delete page 1/i }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Delete page 2/i }));
    fireEvent.click(screen.getByRole("button", { name: "Delete selected pages" }));

    await waitFor(() =>
      expect(
        screen.getByText("You can't delete every page — leave at least one page unchecked.")
      ).toBeInTheDocument()
    );
  });
});

describe("PdfPageWorkspaceTool — merge mode", () => {
  it("requires at least two files before merging", async () => {
    mockedInspect.mockResolvedValue(makeInfo(1));
    mockedOpenSession.mockResolvedValue(makeSession());

    renderWithPdfWorkspace(<PdfPageWorkspaceTool mode="merge" />, { multiple: true });
    selectFile(makeFile("a.pdf"));
    await waitFor(() => expect(screen.getAllByText(/^Page \d$/)).toHaveLength(1));

    fireEvent.click(screen.getByRole("button", { name: "Merge & download" }));
    await waitFor(() =>
      expect(screen.getByText("Add at least two PDF files to merge.")).toBeInTheDocument()
    );
  });
});

describe("PdfPageWorkspaceTool — rotate mode", () => {
  it("applies the accumulated rotation as a delta when submitting", async () => {
    mockedInspect.mockResolvedValue(makeInfo(1));
    mockedOpenSession.mockResolvedValue(makeSession());
    mockedBuild.mockResolvedValue(new Blob(["pdf"], { type: "application/pdf" }));

    renderWithPdfWorkspace(<PdfPageWorkspaceTool mode="rotate" />);
    selectFile(makeFile("doc.pdf"));
    await waitFor(() => expect(screen.getAllByText(/^Page \d$/)).toHaveLength(1));

    fireEvent.click(screen.getByRole("button", { name: /rotate page 1 right/i }));
    fireEvent.click(screen.getByRole("button", { name: "Apply rotation & download" }));

    await waitFor(() =>
      expect(mockedBuild).toHaveBeenCalledWith(
        [expect.anything()],
        [{ sourceIndex: 0, pageIndex: 0, rotationDelta: 90 }],
        expect.any(Function)
      )
    );
  });
});

describe("PdfPageWorkspaceTool — out-of-order file drops", () => {
  it("keeps the newest drop and discards the superseded one, closing its session", async () => {
    // The first drop stalls opening its render session — the later of its two
    // awaits, so it gets far enough to actually hold a session that has to be
    // cleaned up, not just far enough to bail at the first checkpoint.
    const firstSession = makeSession();
    const secondSession = makeSession();
    const stalled = deferred<ReturnType<typeof makeSession>>();
    mockedInspect.mockResolvedValueOnce(makeInfo(5)).mockResolvedValueOnce(makeInfo(2));
    mockedOpenSession.mockReturnValueOnce(stalled.promise).mockResolvedValueOnce(secondSession);

    renderWithPdfWorkspace(<PdfPageWorkspaceTool mode="extract" />);
    selectFile(makeFile("slow.pdf"));
    await waitFor(() => expect(mockedOpenSession).toHaveBeenCalledTimes(1));

    dropFile(makeFile("fast.pdf"));
    await waitFor(() => expect(screen.getAllByText(/^Page \d$/)).toHaveLength(2));

    // Now let the superseded first drop finish, holding its own 5-page result.
    stalled.resolve(firstSession);

    await waitFor(() => expect(firstSession.close).toHaveBeenCalled());
    // The stale 5-page result never replaces the 2-page one it lost to...
    expect(screen.getAllByText(/^Page \d$/)).toHaveLength(2);
    // ...and the surviving drop's own session is left open for its thumbnails.
    expect(secondSession.close).not.toHaveBeenCalled();
  });
});

describe("PdfPageWorkspaceTool — progress reporting", () => {
  it("shows the engine's per-page progress while the build runs", async () => {
    mockedInspect.mockResolvedValue(makeInfo(2));
    mockedOpenSession.mockResolvedValue(makeSession());
    const build = deferred<Blob>();
    mockedBuild.mockImplementation(async (_files, _selection, onProgress) => {
      onProgress?.({ percent: 50, message: "Copying page 1 of 2…" });
      return build.promise;
    });

    renderWithPdfWorkspace(<PdfPageWorkspaceTool mode="reorder" />);
    selectFile(makeFile("doc.pdf"));
    await waitFor(() => expect(screen.getAllByText(/^Page \d$/)).toHaveLength(2));

    fireEvent.click(screen.getByRole("button", { name: "Save reordered PDF" }));

    await waitFor(() => expect(screen.getByText("Copying page 1 of 2…")).toBeInTheDocument());

    build.resolve(new Blob(["pdf"], { type: "application/pdf" }));
    await waitFor(() => expect(screen.getByRole("button", { name: /download/i })).toBeInTheDocument());
    // The bar goes away once there's a result to show instead.
    expect(screen.queryByText("Copying page 1 of 2…")).not.toBeInTheDocument();
  });
});

describe("PdfPageWorkspaceTool — error handling", () => {
  it("shows a clear error for an encrypted PDF instead of crashing", async () => {
    mockedInspect.mockRejectedValue(
      new ProcessingError("UNSUPPORTED_FORMAT", "This PDF is password-protected.")
    );

    renderWithPdfWorkspace(<PdfPageWorkspaceTool mode="reorder" />);
    selectFile(makeFile("secret.pdf"));

    await waitFor(() => expect(screen.getByText("This PDF is password-protected.")).toBeInTheDocument());
    expect(screen.getByText(/never uploaded/i)).toBeInTheDocument();
  });
});

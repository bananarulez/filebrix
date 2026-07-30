import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { PdfSplitTool } from "@/components/pdf/PdfSplitTool";
import { inspectPdfFile, buildPdfFromSelectionFiles } from "@/engines/pdf";
import { openPdfRenderSession } from "@/engines/pdf/render/session";

vi.mock("@/engines/pdf", () => ({
  inspectPdfFile: vi.fn(),
  buildPdfFromSelectionFiles: vi.fn(),
}));

vi.mock("@/engines/pdf/render/session", () => ({
  openPdfRenderSession: vi.fn(),
}));

vi.mock("jszip", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: vi.fn().mockImplementation(function (this: any) {
    this.file = vi.fn();
    this.generateAsync = vi.fn().mockResolvedValue(new Blob(["zip"]));
  }),
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
    pageCount: 1,
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

describe("PdfSplitTool", () => {
  it("starts with one part (no split points) and produces a single PDF, not a zip", async () => {
    mockedInspect.mockResolvedValue(makeInfo(3));
    mockedOpenSession.mockResolvedValue(makeSession());
    mockedBuild.mockResolvedValue(new Blob(["pdf"], { type: "application/pdf" }));

    render(<PdfSplitTool />);
    selectFile(makeFile("doc.pdf"));

    await waitFor(() => expect(screen.getByText(/1 part/i)).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Split PDF" }));
    await waitFor(() => expect(mockedBuild).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /download split-part-1\.pdf/i })).toBeInTheDocument()
    );
  });

  it("adding a split marker produces two parts, packaged as a zip", async () => {
    mockedInspect.mockResolvedValue(makeInfo(3));
    mockedOpenSession.mockResolvedValue(makeSession());
    mockedBuild.mockResolvedValue(new Blob(["pdf"], { type: "application/pdf" }));

    render(<PdfSplitTool />);
    selectFile(makeFile("doc.pdf"));
    await waitFor(() => expect(screen.getByText(/1 part/i)).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /toggle split after page 1/i }));
    await waitFor(() => expect(screen.getByText(/2 parts/i)).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Split PDF" }));
    await waitFor(() => expect(mockedBuild).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /download split-pages\.zip/i })).toBeInTheDocument()
    );
  });

  it("folds each part's own progress into one overall bar", async () => {
    mockedInspect.mockResolvedValue(makeInfo(3));
    mockedOpenSession.mockResolvedValue(makeSession());
    const secondPart = deferred<Blob>();
    mockedBuild
      .mockImplementationOnce(async (_files, _selection, onProgress) => {
        onProgress?.({ percent: 100, message: "Writing the new PDF…" });
        return new Blob(["pdf"], { type: "application/pdf" });
      })
      .mockImplementationOnce(async (_files, _selection, onProgress) => {
        onProgress?.({ percent: 50, message: "Copying page 1 of 2…" });
        return secondPart.promise;
      });

    render(<PdfSplitTool />);
    selectFile(makeFile("doc.pdf"));
    await waitFor(() => expect(screen.getByText(/1 part/i)).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /toggle split after page 1/i }));
    await waitFor(() => expect(screen.getByText(/2 parts/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Split PDF" }));

    // Halfway through part 2 of 2 = 75% overall, labelled with which part it is.
    await waitFor(() =>
      expect(screen.getByText("Part 2 of 2 — Copying page 1 of 2…")).toBeInTheDocument()
    );

    secondPart.resolve(new Blob(["pdf"], { type: "application/pdf" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /download split-pages\.zip/i })).toBeInTheDocument()
    );
  });

  it("ignores a superseded file's pages when a second PDF is dropped mid-open", async () => {
    // The first drop stalls on its render session, so it reaches the point of
    // holding one — the case that has to clean up rather than just bail.
    const firstSession = makeSession();
    const secondSession = makeSession();
    const stalled = deferred<ReturnType<typeof makeSession>>();
    mockedInspect.mockResolvedValueOnce(makeInfo(6)).mockResolvedValueOnce(makeInfo(2));
    mockedOpenSession.mockReturnValueOnce(stalled.promise).mockResolvedValueOnce(secondSession);

    render(<PdfSplitTool />);
    selectFile(makeFile("slow.pdf"));
    await waitFor(() => expect(mockedOpenSession).toHaveBeenCalledTimes(1));

    dropFile(makeFile("fast.pdf"));
    // 2 pages -> 1 part; the stale drop would say 6 pages -> 1 part too, so
    // the thumbnail count is what actually distinguishes them.
    await waitFor(() => expect(screen.getAllByRole("img")).toHaveLength(2));

    stalled.resolve(firstSession);

    await waitFor(() => expect(firstSession.close).toHaveBeenCalled());
    expect(screen.getAllByRole("img")).toHaveLength(2);
    expect(secondSession.close).not.toHaveBeenCalled();
  });
});

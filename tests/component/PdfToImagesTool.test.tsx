import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import { PdfToImagesTool } from "@/components/pdf/PdfToImagesTool";
import { openPdfRenderSession } from "@/engines/pdf/render/session";
import { inspectPdfFile } from "@/engines/pdf";
import { makePdfInfo, renderWithPdfWorkspace } from "./pdfWorkspaceHarness";

vi.mock("@/engines/pdf/render/session", () => ({
  openPdfRenderSession: vi.fn(),
}));

// The shared PdfWorkspace inspects a dropped PDF's structure before any tool sees it.
vi.mock("@/engines/pdf", () => ({
  inspectPdfFile: vi.fn(),
}));

vi.mock("jszip", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: vi.fn().mockImplementation(function (this: any) {
    this.file = vi.fn();
    this.generateAsync = vi.fn().mockResolvedValue(new Blob(["zip"]));
  }),
}));

const mockedOpenSession = vi.mocked(openPdfRenderSession);

beforeEach(() => {
  vi.mocked(inspectPdfFile).mockResolvedValue(makePdfInfo(1));
});

function makeFile(name: string): File {
  return new File(["stub"], name, { type: "application/pdf" });
}

function makeSession(pageCount: number) {
  return {
    pageCount,
    renderThumbnail: vi.fn(),
    renderPageImage: vi.fn().mockResolvedValue(new Blob(["img"], { type: "image/png" })),
    extractText: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
  };
}

function selectFile(file: File) {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });
}

describe("PdfToImagesTool", () => {
  it("offers a single image download for a one-page PDF", async () => {
    const session = makeSession(1);
    mockedOpenSession.mockResolvedValue(session);

    renderWithPdfWorkspace(<PdfToImagesTool />);
    selectFile(makeFile("doc.pdf"));
    await waitFor(() => expect(screen.getByRole("button", { name: "Convert to images" })).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Convert to images" }));
    await waitFor(() => expect(session.renderPageImage).toHaveBeenCalledWith(0, { format: "png", scale: 2 }));
    await waitFor(() => expect(screen.getByRole("button", { name: /download page-1\.png/i })).toBeInTheDocument());
    // The session belongs to the workspace now, and stays open for the other
    // tabs — this tool must not close what it didn't open.
    expect(session.close).not.toHaveBeenCalled();
  });

  it("packages a multi-page PDF's images into a zip", async () => {
    const session = makeSession(3);
    mockedOpenSession.mockResolvedValue(session);

    renderWithPdfWorkspace(<PdfToImagesTool />);
    selectFile(makeFile("doc.pdf"));
    await waitFor(() => expect(screen.getByRole("button", { name: "Convert to images" })).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Convert to images" }));
    await waitFor(() => expect(session.renderPageImage).toHaveBeenCalledTimes(3));
    await waitFor(() => expect(screen.getByRole("button", { name: /download pages\.zip/i })).toBeInTheDocument());
  });

  it("respects the JPEG format choice", async () => {
    const session = makeSession(1);
    mockedOpenSession.mockResolvedValue(session);

    renderWithPdfWorkspace(<PdfToImagesTool />);
    selectFile(makeFile("doc.pdf"));
    await waitFor(() => expect(screen.getByLabelText(/JPEG/)).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText(/JPEG/));

    fireEvent.click(screen.getByRole("button", { name: "Convert to images" }));
    await waitFor(() => expect(session.renderPageImage).toHaveBeenCalledWith(0, { format: "jpeg", scale: 2 }));
  });
});

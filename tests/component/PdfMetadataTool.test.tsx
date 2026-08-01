import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import { PdfMetadataTool } from "@/components/pdf/PdfMetadataTool";
import { inspectPdfFile, readPdfMetadataFile, removePdfMetadataFile } from "@/engines/pdf";
import { openPdfRenderSession } from "@/engines/pdf/render/session";
import { makePdfInfo, renderWithPdfWorkspace } from "./pdfWorkspaceHarness";

vi.mock("@/engines/pdf", () => ({
  // `inspectPdfFile` is what the shared PdfWorkspace calls on load; the two
  // metadata functions are this tool's own.
  inspectPdfFile: vi.fn(),
  readPdfMetadataFile: vi.fn(),
  removePdfMetadataFile: vi.fn(),
}));

vi.mock("@/engines/pdf/render/session", () => ({
  openPdfRenderSession: vi.fn(),
}));

const mockedRead = vi.mocked(readPdfMetadataFile);
const mockedRemove = vi.mocked(removePdfMetadataFile);

/** The workspace opens every dropped PDF once (structure + render session) before any tool sees it. */
beforeEach(() => {
  vi.mocked(inspectPdfFile).mockResolvedValue(makePdfInfo(1));
  vi.mocked(openPdfRenderSession).mockResolvedValue({
    pageCount: 1,
    renderThumbnail: vi.fn(),
    renderPageImage: vi.fn(),
    extractText: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
  });
});

function makeFile(name: string): File {
  return new File(["stub"], name, { type: "application/pdf" });
}

function selectFile(file: File) {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });
}

describe("PdfMetadataTool — view mode", () => {
  it("displays the metadata fields it reads and has no remove button", async () => {
    mockedRead.mockResolvedValue({
      title: "My Document",
      author: "Jane Doe",
      pageCount: 3,
      hasSignature: false,
    });

    renderWithPdfWorkspace(<PdfMetadataTool mode="view" />);
    selectFile(makeFile("doc.pdf"));

    await waitFor(() => expect(screen.getByText("My Document")).toBeInTheDocument());
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /remove metadata/i })).not.toBeInTheDocument();
  });

  it("shows an em dash for fields that aren't present", async () => {
    mockedRead.mockResolvedValue({ pageCount: 1, hasSignature: false });

    renderWithPdfWorkspace(<PdfMetadataTool mode="view" />);
    selectFile(makeFile("doc.pdf"));

    await waitFor(() => expect(screen.getAllByText("—").length).toBeGreaterThan(0));
  });
});

describe("PdfMetadataTool — remove mode", () => {
  it("removes metadata and offers a cleaned download", async () => {
    mockedRead.mockResolvedValue({ title: "My Document", pageCount: 2, hasSignature: false });
    mockedRemove.mockResolvedValue(new Blob(["pdf"], { type: "application/pdf" }));

    renderWithPdfWorkspace(<PdfMetadataTool mode="remove" />);
    selectFile(makeFile("doc.pdf"));

    await waitFor(() => expect(screen.getByRole("button", { name: /remove metadata/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /remove metadata/i }));

    await waitFor(() => expect(mockedRemove).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByRole("button", { name: /download cleaned\.pdf/i })).toBeInTheDocument());
  });
});

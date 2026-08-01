import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import { PdfToTextTool } from "@/components/pdf/PdfToTextTool";
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

const mockedOpenSession = vi.mocked(openPdfRenderSession);

beforeEach(() => {
  vi.mocked(inspectPdfFile).mockResolvedValue(makePdfInfo(1));
});

function makeFile(name: string): File {
  return new File(["stub"], name, { type: "application/pdf" });
}

function makeSession(extraction: { pages: string[]; hasExtractableText: boolean }) {
  return {
    pageCount: extraction.pages.length,
    renderThumbnail: vi.fn(),
    renderPageImage: vi.fn(),
    extractText: vi.fn().mockResolvedValue(extraction),
    close: vi.fn().mockResolvedValue(undefined),
  };
}

function selectFile(file: File) {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });
}

describe("PdfToTextTool", () => {
  it("extracts and displays text from a text-based PDF", async () => {
    mockedOpenSession.mockResolvedValue(
      makeSession({ pages: ["Hello world"], hasExtractableText: true })
    );

    renderWithPdfWorkspace(<PdfToTextTool />);
    selectFile(makeFile("doc.pdf"));

    await waitFor(() => expect(screen.getByLabelText("Extracted text")).toHaveValue("Hello world"));
  });

  it('shows the exact "no extractable text" message for a scanned PDF, never claiming OCR', async () => {
    mockedOpenSession.mockResolvedValue(makeSession({ pages: [""], hasExtractableText: false }));

    renderWithPdfWorkspace(<PdfToTextTool />);
    selectFile(makeFile("scanned.pdf"));

    await waitFor(() =>
      expect(
        screen.getByText("No extractable text was found. This document may be scanned.")
      ).toBeInTheDocument()
    );
    expect(screen.queryByLabelText("Extracted text")).not.toBeInTheDocument();
  });
});

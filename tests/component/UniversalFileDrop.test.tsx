import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { UniversalFileDrop } from "@/components/tools/UniversalFileDrop";
import { detectFileType, tryDecodeAsText } from "@/lib/detect/detectFile";
import { setPendingFile } from "@/lib/fileHandoff";

vi.mock("@/lib/detect/detectFile", async () => {
  const actual = await vi.importActual<typeof import("@/lib/detect/detectFile")>("@/lib/detect/detectFile");
  return { ...actual, detectFileType: vi.fn(), tryDecodeAsText: vi.fn() };
});

vi.mock("@/lib/fileHandoff", async () => {
  const actual = await vi.importActual<typeof import("@/lib/fileHandoff")>("@/lib/fileHandoff");
  return { ...actual, setPendingFile: vi.fn() };
});

const mockedDetect = vi.mocked(detectFileType);
const mockedTryDecodeAsText = vi.mocked(tryDecodeAsText);
const mockedSetPendingFile = vi.mocked(setPendingFile);

function selectFile(file: File) {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });
}

afterEach(() => {
  mockedTryDecodeAsText.mockReturnValue(null);
});

describe("UniversalFileDrop", () => {
  it("shows the human-readable detected format and groups real tools into VIEW/CONVERT/EDIT/TOOLS", async () => {
    mockedDetect.mockResolvedValue({ format: "xlsx", confidence: "signature" });

    render(<UniversalFileDrop />);
    selectFile(new File(["stub"], "report.xlsx"));

    await waitFor(() => expect(screen.getByText("Excel spreadsheet")).toBeInTheDocument());
    expect(screen.getByText("View")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Excel Viewer" })).toBeInTheDocument();
    expect(screen.getByText("Convert")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Excel to CSV Converter" })).toBeInTheDocument();
  });

  it("groups a WebP image's tools into convert/edit/tools sections", async () => {
    mockedDetect.mockResolvedValue({ format: "webp", confidence: "signature" });

    render(<UniversalFileDrop />);
    selectFile(new File(["stub"], "photo.webp"));

    await waitFor(() => expect(screen.getByText("WebP image")).toBeInTheDocument());
    expect(screen.getByRole("link", { name: /webp to jpg/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /resize image/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /image metadata viewer/i })).toBeInTheDocument();
  });

  it("hands the already-selected file off to the tool clicked, without asking the user to re-select it", async () => {
    mockedDetect.mockResolvedValue({ format: "xlsx", confidence: "signature" });
    const file = new File(["stub"], "report.xlsx");

    render(<UniversalFileDrop />);
    selectFile(file);

    const link = await screen.findByRole("link", { name: "Excel Viewer" });
    fireEvent.click(link);

    expect(mockedSetPendingFile).toHaveBeenCalledWith("excel-viewer", file);
  });

  it("shows a graceful message for a completely unrecognized binary file", async () => {
    mockedDetect.mockResolvedValue({ format: "unknown", confidence: "extension" });
    mockedTryDecodeAsText.mockReturnValue(null);

    render(<UniversalFileDrop />);
    selectFile(new File([new Uint8Array([0, 1, 2])], "mystery.xyz"));

    await waitFor(() => expect(screen.getByText(/don't have a tool for this file type yet/i)).toBeInTheDocument());
    expect(screen.queryByText(/you could also try/i)).not.toBeInTheDocument();
  });

  it("suggests generic text tools only when an unrecognized file still looks like text", async () => {
    mockedDetect.mockResolvedValue({ format: "unknown", confidence: "extension" });
    mockedTryDecodeAsText.mockReturnValue("some plain text content");

    render(<UniversalFileDrop />);
    selectFile(new File(["some plain text content"], "notes.myformat"));

    await waitFor(() => expect(screen.getByText(/you could also try/i)).toBeInTheDocument());
    expect(screen.getByRole("link", { name: /text diff/i })).toBeInTheDocument();
  });

  it("never advertises a tool for a recognized format with no implemented tools", async () => {
    mockedDetect.mockResolvedValue({ format: "avif", confidence: "signature" });

    render(<UniversalFileDrop />);
    selectFile(new File(["stub"], "photo.avif"));

    await waitFor(() => expect(screen.getByText("AVIF image")).toBeInTheDocument());
    expect(screen.getByText(/no tool for it yet/i)).toBeInTheDocument();
  });

  it("clearing resets back to the empty drop state", async () => {
    mockedDetect.mockResolvedValue({ format: "xlsx", confidence: "signature" });
    render(<UniversalFileDrop />);
    selectFile(new File(["stub"], "report.xlsx"));

    await waitFor(() => expect(screen.getByText("Excel spreadsheet")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /^clear$/i }));

    expect(screen.queryByText("Excel spreadsheet")).not.toBeInTheDocument();
  });
});

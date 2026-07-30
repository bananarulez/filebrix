import { beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { ImagesToPdfTool } from "@/components/pdf/ImagesToPdfTool";
import { buildPdfFromImageFiles } from "@/engines/pdf";

vi.mock("@/engines/pdf", () => ({
  buildPdfFromImageFiles: vi.fn(),
}));

const mockedBuild = vi.mocked(buildPdfFromImageFiles);

beforeAll(() => {
  // jsdom has no createObjectURL — ImagesToPdfTool uses it directly for
  // image previews (not routed through the engine), so it needs its own stub.
  URL.createObjectURL = vi.fn(() => "blob:mock-url");
  URL.revokeObjectURL = vi.fn();
});

function makeImage(name: string): File {
  return new File(["stub"], name, { type: "image/png" });
}

function selectFiles(files: File[]) {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, { target: { files } });
}

describe("ImagesToPdfTool", () => {
  it("lists dropped images in order and builds a PDF from them", async () => {
    mockedBuild.mockResolvedValue(new Blob(["pdf"], { type: "application/pdf" }));

    render(<ImagesToPdfTool />);
    selectFiles([makeImage("first.png"), makeImage("second.png")]);

    await waitFor(() => expect(screen.getByText(/first\.png, second\.png/)).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Build PDF" }));
    await waitFor(() =>
      expect(mockedBuild).toHaveBeenCalledWith([expect.anything(), expect.anything()])
    );
    await waitFor(() => expect(screen.getByRole("button", { name: /download images\.pdf/i })).toBeInTheDocument());
  });

  it("reorders images with the move buttons", async () => {
    mockedBuild.mockResolvedValue(new Blob(["pdf"], { type: "application/pdf" }));

    render(<ImagesToPdfTool />);
    selectFiles([makeImage("first.png"), makeImage("second.png")]);
    await waitFor(() => expect(screen.getByText(/first\.png, second\.png/)).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /move first\.png later/i }));
    expect(screen.getByText(/second\.png, first\.png/)).toBeInTheDocument();
  });

  it("removes an image from the list", async () => {
    render(<ImagesToPdfTool />);
    selectFiles([makeImage("first.png"), makeImage("second.png")]);
    await waitFor(() => expect(screen.getByText(/first\.png, second\.png/)).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /remove first\.png/i }));
    expect(screen.getByText(/^Page order: second\.png$/)).toBeInTheDocument();
  });
});

import { beforeAll, describe, expect, it, vi } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import { ImageConvertTool } from "@/components/image/ImageConvertTool";
import { renderWithImageWorkspace } from "./imageWorkspaceHarness";
import { processImageFile } from "@/engines/image";

vi.mock("@/engines/image", async () => {
  const actual = await vi.importActual<typeof import("@/engines/image")>("@/engines/image");
  return { ...actual, processImageFile: vi.fn() };
});

const mockedProcess = vi.mocked(processImageFile);

beforeAll(() => {
  URL.createObjectURL = vi.fn(() => "blob:mock-url");
  URL.revokeObjectURL = vi.fn();
});

function makeFile(name: string, type: string): File {
  return new File(["stub"], name, { type });
}

/**
 * The shared ImageWorkspace detects each file's format (an async step) before
 * any tool renders its controls, so selection has to be awaited — a tool used
 * to receive its files synchronously from its own drop zone.
 */
async function selectFiles(files: File[]) {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, { target: { files } });
  await waitFor(() => expect(screen.getByRole("button", { name: "Clear" })).toBeInTheDocument());
}

describe("ImageConvertTool", () => {
  it("converts PNG to JPG, offering a background-color control for the transparency loss", async () => {
    mockedProcess.mockResolvedValue(new Blob(["img"], { type: "image/jpeg" }));

    renderWithImageWorkspace(<ImageConvertTool sourceFormat="png" targetFormat="jpg" />);
    await selectFiles([makeFile("photo.png", "image/png")]);

    await waitFor(() => expect(screen.getByLabelText("Background color")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Convert" }));

    await waitFor(() =>
      expect(mockedProcess).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ outputFormat: "jpg", backgroundColor: "#ffffff" })
      )
    );
    await waitFor(() => expect(screen.getByRole("button", { name: "Download" })).toBeInTheDocument());
  });

  it("does not show a background-color control when transparency isn't lost (jpg to webp)", async () => {
    mockedProcess.mockResolvedValue(new Blob(["img"], { type: "image/webp" }));

    renderWithImageWorkspace(<ImageConvertTool sourceFormat="jpg" targetFormat="webp" />);
    await selectFiles([makeFile("photo.jpg", "image/jpeg")]);

    await waitFor(() => expect(screen.getByLabelText("Quality")).toBeInTheDocument());
    expect(screen.queryByLabelText("Background color")).not.toBeInTheDocument();
  });

  it("does not reprocess on every slider drag — only on Convert click", async () => {
    mockedProcess.mockResolvedValue(new Blob(["img"], { type: "image/webp" }));

    renderWithImageWorkspace(<ImageConvertTool sourceFormat="jpg" targetFormat="webp" />);
    await selectFiles([makeFile("photo.jpg", "image/jpeg")]);
    await waitFor(() => expect(screen.getByLabelText("Quality")).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText("Quality"), { target: { value: "0.5" } });
    fireEvent.change(screen.getByLabelText("Quality"), { target: { value: "0.3" } });
    expect(mockedProcess).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Convert" }));
    await waitFor(() => expect(mockedProcess).toHaveBeenCalledTimes(1));
  });

  it("shows a batch download-all option once more than one image is done", async () => {
    mockedProcess.mockResolvedValue(new Blob(["img"], { type: "image/jpeg" }));

    renderWithImageWorkspace(<ImageConvertTool sourceFormat="png" targetFormat="jpg" />);
    await selectFiles([makeFile("a.png", "image/png"), makeFile("b.png", "image/png")]);
    await waitFor(() => expect(screen.getByRole("button", { name: "Convert" })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Convert" }));

    await waitFor(() => expect(screen.getByText(/download all 2 as \.zip/i)).toBeInTheDocument());
  });

  it("surfaces a processing error via the per-item status instead of crashing", async () => {
    const { ProcessingError } = await import("@/lib/errors/ProcessingError");
    mockedProcess.mockRejectedValue(new ProcessingError("MALFORMED_FILE", "Bad image."));

    renderWithImageWorkspace(<ImageConvertTool sourceFormat="jpg" targetFormat="webp" />);
    await selectFiles([makeFile("bad.jpg", "image/jpeg")]);
    fireEvent.click(screen.getByRole("button", { name: "Convert" }));

    await waitFor(() => expect(screen.getByText("Bad image.")).toBeInTheDocument());
  });
});

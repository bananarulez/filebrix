import { beforeAll, describe, expect, it, vi } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import { ImageTransformTool } from "@/components/image/ImageTransformTool";
import { renderWithImageWorkspace } from "./imageWorkspaceHarness";
import { processImageFile } from "@/engines/image";
import { detectFileType } from "@/lib/detect/detectFile";

vi.mock("@/engines/image", async () => {
  const actual = await vi.importActual<typeof import("@/engines/image")>("@/engines/image");
  return { ...actual, processImageFile: vi.fn() };
});

vi.mock("@/lib/detect/detectFile", () => ({
  detectFileType: vi.fn(),
}));

const mockedProcess = vi.mocked(processImageFile);
const mockedDetect = vi.mocked(detectFileType);

beforeAll(() => {
  URL.createObjectURL = vi.fn(() => "blob:mock-url");
  URL.revokeObjectURL = vi.fn();
  // ImageTransformTool's resize mode probes real dimensions via
  // createImageBitmap, which jsdom doesn't implement — stub it.
  (globalThis as { createImageBitmap?: unknown }).createImageBitmap = vi
    .fn()
    .mockResolvedValue({ width: 400, height: 200, close: vi.fn() });
});

function makeFile(name: string): File {
  return new File(["stub"], name, { type: "image/jpeg" });
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

describe("ImageTransformTool — rotate", () => {
  it("accumulates rotation across left/right clicks and applies it on submit", async () => {
    mockedDetect.mockResolvedValue({ format: "jpg", confidence: "signature" });
    mockedProcess.mockResolvedValue(new Blob(["img"], { type: "image/jpeg" }));

    renderWithImageWorkspace(<ImageTransformTool mode="rotate" />);
    await selectFiles([makeFile("photo.jpg")]);

    fireEvent.click(screen.getByRole("button", { name: "Rotate right" }));
    fireEvent.click(screen.getByRole("button", { name: "Rotate right" }));
    fireEvent.click(screen.getByRole("button", { name: "Rotate" }));

    await waitFor(() =>
      expect(mockedProcess).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ rotateDegrees: 180 }))
    );
  });
});

describe("ImageTransformTool — flip", () => {
  it("defaults to horizontal flip and applies the chosen axis", async () => {
    mockedDetect.mockResolvedValue({ format: "png", confidence: "signature" });
    mockedProcess.mockResolvedValue(new Blob(["img"], { type: "image/png" }));

    renderWithImageWorkspace(<ImageTransformTool mode="flip" />);
    await selectFiles([makeFile("photo.png")]);

    fireEvent.click(screen.getByLabelText(/Vertical/));
    fireEvent.click(screen.getByRole("button", { name: "Flip" }));

    await waitFor(() =>
      expect(mockedProcess).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ flip: "vertical" }))
    );
  });
});

describe("ImageTransformTool — resize", () => {
  it("derives height from width when aspect ratio is locked", async () => {
    mockedDetect.mockResolvedValue({ format: "jpg", confidence: "signature" });
    mockedProcess.mockResolvedValue(new Blob(["img"], { type: "image/jpeg" }));

    renderWithImageWorkspace(<ImageTransformTool mode="resize" />);
    await selectFiles([makeFile("photo.jpg")]);

    const widthInput = screen.getByLabelText("Width (px)");
    fireEvent.change(widthInput, { target: { value: "200" } });
    fireEvent.click(screen.getByRole("button", { name: "Resize" }));

    // original probed as 400x200 (2:1) -> width 200 should derive height 100
    await waitFor(() =>
      expect(mockedProcess).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ resize: { width: 200, height: 100 } })
      )
    );
  });
});

describe("ImageTransformTool — compress", () => {
  it("warns that PNG compression won't shrink the file much", async () => {
    renderWithImageWorkspace(<ImageTransformTool mode="compress" />);
    await selectFiles([makeFile("photo.png")]);
    // File name ends in .png regardless of the mocked mime type in makeFile.
    await waitFor(() => expect(screen.getByText(/won't shrink it much/i)).toBeInTheDocument());
  });
});

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import { ImageMetadataTool } from "@/components/image/ImageMetadataTool";
import { renderWithImageWorkspace } from "./imageWorkspaceHarness";
import { readImageMetadata } from "@/engines/image/render/metadata";
import { processImageFile } from "@/engines/image";
import { detectFileType } from "@/lib/detect/detectFile";

vi.mock("@/engines/image/render/metadata", () => ({
  readImageMetadata: vi.fn(),
}));

vi.mock("@/engines/image", async () => {
  const actual = await vi.importActual<typeof import("@/engines/image")>("@/engines/image");
  return { ...actual, processImageFile: vi.fn() };
});

vi.mock("@/lib/detect/detectFile", () => ({
  detectFileType: vi.fn(),
}));

const mockedRead = vi.mocked(readImageMetadata);
const mockedProcess = vi.mocked(processImageFile);
const mockedDetect = vi.mocked(detectFileType);

beforeAll(() => {
  URL.createObjectURL = vi.fn(() => "blob:mock-url");
  URL.revokeObjectURL = vi.fn();
});

// The shared ImageWorkspace detects every dropped file's format before any
// tool sees it, so this mock now has to answer for the load itself — not only
// for the remove-mode batch that reads it directly.
beforeEach(() => {
  mockedDetect.mockResolvedValue({ format: "jpg", confidence: "signature" });
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

describe("ImageMetadataTool — view mode", () => {
  it("displays metadata fields and a GPS warning when location data is present", async () => {
    mockedRead.mockResolvedValue({
      fields: [
        { label: "Camera make", value: "TestCam" },
        { label: "GPS location", value: "37.774900, -122.419400" },
      ],
      hasGpsData: true,
    });

    renderWithImageWorkspace(<ImageMetadataTool mode="view" />);
    await selectFiles([makeFile("photo.jpg")]);

    await waitFor(() => expect(screen.getByText("TestCam")).toBeInTheDocument());
    expect(screen.getByText(/contains gps location data/i)).toBeInTheDocument();
  });

  it("shows a clear message when no metadata is found", async () => {
    mockedRead.mockResolvedValue({ fields: [], hasGpsData: false });

    renderWithImageWorkspace(<ImageMetadataTool mode="view" />);
    await selectFiles([makeFile("screenshot.png")]);

    await waitFor(() => expect(screen.getByText(/no exif\/tiff metadata was found/i)).toBeInTheDocument());
  });
});

describe("ImageMetadataTool — remove mode", () => {
  it("processes a batch and offers downloads without a metadata table", async () => {
    mockedDetect.mockResolvedValue({ format: "jpg", confidence: "signature" });
    mockedProcess.mockResolvedValue(new Blob(["img"], { type: "image/jpeg" }));

    renderWithImageWorkspace(<ImageMetadataTool mode="remove" />);
    await selectFiles([makeFile("a.jpg"), makeFile("b.jpg")]);

    await waitFor(() => expect(screen.getByText(/download all 2 as \.zip/i)).toBeInTheDocument());
    expect(mockedRead).not.toHaveBeenCalled();
  });
});

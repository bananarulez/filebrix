import { beforeAll, describe, expect, it, vi } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import { SvgToPngTool } from "@/components/image/SvgToPngTool";
import { renderWithImageWorkspace } from "./imageWorkspaceHarness";
import { renderSvgToPng } from "@/engines/image/render/svgToPng";

vi.mock("@/engines/image/render/svgToPng", () => ({
  renderSvgToPng: vi.fn(),
}));

const mockedRender = vi.mocked(renderSvgToPng);

beforeAll(() => {
  URL.createObjectURL = vi.fn(() => "blob:mock-url");
  URL.revokeObjectURL = vi.fn();
});

function makeFile(name: string): File {
  return new File(["<svg></svg>"], name, { type: "image/svg+xml" });
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

describe("SvgToPngTool", () => {
  it("renders SVGs to PNG with a transparent background by default", async () => {
    mockedRender.mockResolvedValue(new Blob(["png"], { type: "image/png" }));

    renderWithImageWorkspace(<SvgToPngTool />);
    await selectFiles([makeFile("icon.svg")]);
    fireEvent.click(screen.getByRole("button", { name: "Convert" }));

    await waitFor(() =>
      expect(mockedRender).toHaveBeenCalledWith(expect.anything(), { backgroundColor: undefined })
    );
    await waitFor(() => expect(screen.getByRole("button", { name: "Download" })).toBeInTheDocument());
  });

  it("passes a background color once the fill option is checked", async () => {
    mockedRender.mockResolvedValue(new Blob(["png"], { type: "image/png" }));

    renderWithImageWorkspace(<SvgToPngTool />);
    await selectFiles([makeFile("icon.svg")]);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Convert" }));

    await waitFor(() =>
      expect(mockedRender).toHaveBeenCalledWith(expect.anything(), { backgroundColor: "#ffffff" })
    );
  });

  it("shows a clear error for a malformed SVG instead of crashing", async () => {
    const { ProcessingError } = await import("@/lib/errors/ProcessingError");
    mockedRender.mockRejectedValue(new ProcessingError("MALFORMED_FILE", "This file doesn't look like a valid SVG."));

    renderWithImageWorkspace(<SvgToPngTool />);
    await selectFiles([makeFile("broken.svg")]);
    fireEvent.click(screen.getByRole("button", { name: "Convert" }));

    await waitFor(() => expect(screen.getByText("This file doesn't look like a valid SVG.")).toBeInTheDocument());
  });
});

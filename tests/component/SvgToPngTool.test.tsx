import { beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { SvgToPngTool } from "@/components/image/SvgToPngTool";
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

function selectFiles(files: File[]) {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, { target: { files } });
}

describe("SvgToPngTool", () => {
  it("renders SVGs to PNG with a transparent background by default", async () => {
    mockedRender.mockResolvedValue(new Blob(["png"], { type: "image/png" }));

    render(<SvgToPngTool />);
    selectFiles([makeFile("icon.svg")]);
    fireEvent.click(screen.getByRole("button", { name: "Convert" }));

    await waitFor(() =>
      expect(mockedRender).toHaveBeenCalledWith(expect.anything(), { backgroundColor: undefined })
    );
    await waitFor(() => expect(screen.getByRole("button", { name: "Download" })).toBeInTheDocument());
  });

  it("passes a background color once the fill option is checked", async () => {
    mockedRender.mockResolvedValue(new Blob(["png"], { type: "image/png" }));

    render(<SvgToPngTool />);
    selectFiles([makeFile("icon.svg")]);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Convert" }));

    await waitFor(() =>
      expect(mockedRender).toHaveBeenCalledWith(expect.anything(), { backgroundColor: "#ffffff" })
    );
  });

  it("shows a clear error for a malformed SVG instead of crashing", async () => {
    const { ProcessingError } = await import("@/lib/errors/ProcessingError");
    mockedRender.mockRejectedValue(new ProcessingError("MALFORMED_FILE", "This file doesn't look like a valid SVG."));

    render(<SvgToPngTool />);
    selectFiles([makeFile("broken.svg")]);
    fireEvent.click(screen.getByRole("button", { name: "Convert" }));

    await waitFor(() => expect(screen.getByText("This file doesn't look like a valid SVG.")).toBeInTheDocument());
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";
import { FileDropZone } from "@/components/tools/FileDropZone";
import { clearPendingFile, setPendingFile } from "@/lib/fileHandoff";

afterEach(() => {
  clearPendingFile();
});

describe("FileDropZone", () => {
  it("exposes a real file input as an accessible fallback to drag-and-drop", () => {
    const { container } = render(<FileDropZone onFilesSelected={() => {}} label="Drop a file" />);
    expect(container.querySelector('input[type="file"]')).toBeTruthy();
  });

  it("calls onFilesSelected when a file is chosen via the input", () => {
    const onFilesSelected = vi.fn();
    const { container } = render(
      <FileDropZone onFilesSelected={onFilesSelected} label="Drop a file" />
    );
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["hello"], "hello.txt", { type: "text/plain" });

    fireEvent.change(input, { target: { files: [file] } });

    expect(onFilesSelected).toHaveBeenCalledWith([file]);
  });

  describe("toolSlug handoff", () => {
    it("auto-claims a file handed off from the homepage for the matching tool slug", async () => {
      const onFilesSelected = vi.fn();
      const file = new File(["a,b"], "report.csv", { type: "text/csv" });
      setPendingFile("csv-viewer", file);

      render(<FileDropZone onFilesSelected={onFilesSelected} label="Drop a file" toolSlug="csv-viewer" />);

      await waitFor(() => expect(onFilesSelected).toHaveBeenCalledWith([file]));
    });

    it("never claims a file handed off to a different tool", async () => {
      const onFilesSelected = vi.fn();
      setPendingFile("csv-viewer", new File(["a,b"], "report.csv"));

      render(<FileDropZone onFilesSelected={onFilesSelected} label="Drop a file" toolSlug="excel-viewer" />);

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(onFilesSelected).not.toHaveBeenCalled();
    });

    it("does nothing when no toolSlug is provided", async () => {
      const onFilesSelected = vi.fn();
      setPendingFile("csv-viewer", new File(["a,b"], "report.csv"));

      render(<FileDropZone onFilesSelected={onFilesSelected} label="Drop a file" />);

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(onFilesSelected).not.toHaveBeenCalled();
    });

    it("does not claim the same handed-off file twice across remounts", async () => {
      const onFilesSelected = vi.fn();
      const file = new File(["a,b"], "report.csv");
      setPendingFile("csv-viewer", file);

      const { unmount } = render(
        <FileDropZone onFilesSelected={onFilesSelected} label="Drop a file" toolSlug="csv-viewer" />
      );
      await waitFor(() => expect(onFilesSelected).toHaveBeenCalledTimes(1));
      unmount();

      render(<FileDropZone onFilesSelected={onFilesSelected} label="Drop a file" toolSlug="csv-viewer" />);
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(onFilesSelected).toHaveBeenCalledTimes(1);
    });
  });
});

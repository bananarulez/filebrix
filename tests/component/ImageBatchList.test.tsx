import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import JSZip from "jszip";
import { ImageBatchList } from "@/components/image/ImageBatchList";

function makeFile(name: string): File {
  return new File(["stub"], name, { type: "image/png" });
}

let capturedBlobs: Blob[] = [];

beforeEach(() => {
  capturedBlobs = [];
  URL.createObjectURL = vi.fn((blob: Blob) => {
    capturedBlobs.push(blob);
    return "blob:mock-url";
  });
  URL.revokeObjectURL = vi.fn();
});

/**
 * `entry.outputFilename` is derived from the dropped File's own `.name` —
 * a string the page that handed us the file fully controls (drag-and-drop/
 * DataTransfer, not an OS save dialog). Used unsanitized as a JSZip entry
 * name, `../../evil.png` would write outside the intended folder when a
 * victim extracts the zip with a naive tool ("Zip Slip") — see
 * ImageBatchList.tsx's `uniqueZipEntryName`.
 */
describe("ImageBatchList — zip entry name safety", () => {
  it("strips path traversal from a malicious filename before it becomes a zip entry name", async () => {
    const processFile = vi.fn().mockResolvedValue(new Blob(["img"]));
    const deriveFilename = (file: File) => file.name.replace(/\.png$/, "") + ".jpg";

    render(
      <ImageBatchList
        files={[makeFile("../../../../etc/evil.png"), makeFile("safe.png")]}
        processFile={processFile}
        deriveFilename={deriveFilename}
      />
    );

    await waitFor(() => expect(screen.getByRole("button", { name: /download all/i })).toBeInTheDocument());
    // capturedBlobs already has an entry per thumbnail preview URL by this
    // point (created on mount) — only a *new* entry after the click is the zip.
    const countBeforeClick = capturedBlobs.length;
    fireEvent.click(screen.getByRole("button", { name: /download all/i }));

    await waitFor(() => expect(capturedBlobs.length).toBeGreaterThan(countBeforeClick));
    const zip = await JSZip.loadAsync(capturedBlobs[capturedBlobs.length - 1]);
    const names = Object.keys(zip.files);

    expect(names).toContain("evil.jpg");
    expect(names).toContain("safe.jpg");
    for (const name of names) {
      expect(name).not.toContain("..");
      expect(name).not.toContain("/");
      expect(name).not.toContain("\\");
    }
  });

  it("disambiguates two different malicious paths that sanitize to the same basename, instead of silently dropping one", async () => {
    const processFile = vi.fn().mockResolvedValue(new Blob(["img"]));
    const deriveFilename = () => "evil.jpg";

    render(
      <ImageBatchList
        files={[makeFile("../../a/evil.png"), makeFile("../../../b/evil.png")]}
        processFile={processFile}
        deriveFilename={deriveFilename}
      />
    );

    await waitFor(() => expect(screen.getByRole("button", { name: /download all/i })).toBeInTheDocument());
    const countBeforeClick = capturedBlobs.length;
    fireEvent.click(screen.getByRole("button", { name: /download all/i }));

    await waitFor(() => expect(capturedBlobs.length).toBeGreaterThan(countBeforeClick));
    const zip = await JSZip.loadAsync(capturedBlobs[capturedBlobs.length - 1]);
    const names = Object.keys(zip.files);

    // Both entries survive under distinct, safe names — neither overwrites the other.
    expect(names).toHaveLength(2);
    expect(names).toContain("evil.jpg");
    expect(names.some((n) => n !== "evil.jpg")).toBe(true);
  });

  it("also sanitizes the single-item direct download filename", async () => {
    const createdAnchors: HTMLAnchorElement[] = [];
    const realCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = realCreateElement(tag);
      if (tag === "a") createdAnchors.push(el as HTMLAnchorElement);
      return el;
    });

    const processFile = vi.fn().mockResolvedValue(new Blob(["img"]));
    const deriveFilename = (file: File) => file.name.replace(/\.png$/, "") + ".jpg";

    render(
      <ImageBatchList files={[makeFile("../../evil.png")]} processFile={processFile} deriveFilename={deriveFilename} />
    );

    const downloadButton = await screen.findByRole("button", { name: /^download$/i });
    fireEvent.click(downloadButton);

    expect(createdAnchors.length).toBeGreaterThan(0);
    expect(createdAnchors[createdAnchors.length - 1].download).toBe("evil.jpg");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
});

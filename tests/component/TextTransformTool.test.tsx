import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { TextTransformTool } from "@/components/text-tools/TextTransformTool";
import { ProcessingError } from "@/lib/errors/ProcessingError";

function setup(overrides: Partial<React.ComponentProps<typeof TextTransformTool>> = {}) {
  const transform = overrides.transform ?? vi.fn((input: string) => ({ output: input.toUpperCase() }));
  const utils = render(
    <TextTransformTool
      inputLabel="Input"
      outputLabel="Output"
      acceptFileExtension=".txt"
      downloadFileExtension="txt"
      downloadMimeType="text/plain"
      actionLabel="Process"
      transform={transform}
      {...overrides}
    />
  );
  return { ...utils, transform };
}

describe("TextTransformTool", () => {
  it("renders the input textarea, open-file button and action button", () => {
    setup();
    expect(screen.getByLabelText("Input")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open file" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Process" })).toBeInTheDocument();
  });

  it("runs the transform on the pasted text and shows the result", () => {
    setup();
    fireEvent.change(screen.getByLabelText("Input"), { target: { value: "hello" } });
    fireEvent.click(screen.getByRole("button", { name: "Process" }));
    expect(screen.getByLabelText("Output")).toHaveValue("HELLO");
  });

  it("shows an error panel when transform throws, and never leaves stale output visible", () => {
    const transform = vi.fn(() => {
      throw new ProcessingError("MALFORMED_FILE", "Bad input.");
    });
    setup({ transform });
    fireEvent.change(screen.getByLabelText("Input"), { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: "Process" }));
    expect(screen.getByText("Bad input.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Output")).not.toBeInTheDocument();
  });

  it("surfaces warnings returned alongside the output", () => {
    const transform = vi.fn(() => ({ output: "done", warnings: ["something to note"] }));
    setup({ transform });
    fireEvent.change(screen.getByLabelText("Input"), { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: "Process" }));
    expect(screen.getByText("something to note")).toBeInTheDocument();
  });

  it("opening a file populates the input and automatically runs the transform", async () => {
    const transform = vi.fn((input: string) => ({ output: `processed:${input}` }));
    setup({ transform });
    const file = new File(["file contents"], "data.txt", { type: "text/plain" });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => expect(screen.getByLabelText("Output")).toHaveValue("processed:file contents"));
    expect(screen.getByLabelText("Input")).toHaveValue("file contents");
  });

  it("copies the result to the clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    setup();
    fireEvent.change(screen.getByLabelText("Input"), { target: { value: "hello" } });
    fireEvent.click(screen.getByRole("button", { name: "Process" }));
    fireEvent.click(screen.getByRole("button", { name: "Copy result" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith("HELLO"));
    expect(await screen.findByRole("button", { name: "Copied!" })).toBeInTheDocument();
  });

  it("renders format-specific extra controls when provided", () => {
    setup({ extraControls: <div>Indent size control</div> });
    expect(screen.getByText("Indent size control")).toBeInTheDocument();
  });

  it("offers a download button for the result", () => {
    setup();
    fireEvent.change(screen.getByLabelText("Input"), { target: { value: "hello" } });
    fireEvent.click(screen.getByRole("button", { name: "Process" }));
    expect(screen.getByRole("button", { name: /download \.txt/i })).toBeInTheDocument();
  });
});

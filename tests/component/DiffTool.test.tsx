import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { DiffTool } from "@/components/dev-tools/DiffTool";
import { diffJsonText, diffText } from "@/engines/developer/diff";
import { ProcessingError } from "@/lib/errors/ProcessingError";

vi.mock("@/engines/developer/diff", async () => {
  const actual = await vi.importActual<typeof import("@/engines/developer/diff")>("@/engines/developer/diff");
  return {
    ...actual,
    diffText: vi.fn(),
    diffJsonText: vi.fn(),
  };
});

const mockedDiffText = vi.mocked(diffText);
const mockedDiffJsonText = vi.mocked(diffJsonText);

describe("DiffTool", () => {
  it("text mode: calls diffText and renders added/removed lines", async () => {
    mockedDiffText.mockResolvedValue({
      lines: [
        { value: "same", added: false, removed: false },
        { value: "old", added: false, removed: true },
        { value: "new", added: true, removed: false },
      ],
      rows: [
        { type: "unchanged", leftNumber: 1, rightNumber: 1, left: "same", right: "same", blockIndex: null },
        {
          type: "modified",
          leftNumber: 2,
          rightNumber: 2,
          left: "old",
          right: "new",
          leftSegments: [{ value: "old", changed: true }],
          rightSegments: [{ value: "new", changed: true }],
          blockIndex: 0,
        },
      ],
      addedCount: 1,
      removedCount: 1,
      unchangedCount: 1,
      changeBlockCount: 1,
    });

    render(<DiffTool mode="text" />);
    fireEvent.change(screen.getByLabelText(/original text/i), { target: { value: "same\nold" } });
    fireEvent.change(screen.getByLabelText(/changed text/i), { target: { value: "same\nnew" } });
    fireEvent.click(screen.getByRole("button", { name: /^compare$/i }));

    await waitFor(() => expect(screen.getByText(/\+1 added/)).toBeInTheDocument());
    expect(screen.getByText(/1 removed/)).toBeInTheDocument();
    // Both sides of a modified line are rendered, with the changed words marked.
    expect(screen.getByText("old")).toBeInTheDocument();
    expect(screen.getByText("new")).toBeInTheDocument();
    expect(screen.getByText(/1 change/)).toBeInTheDocument();
    expect(mockedDiffText).toHaveBeenCalledWith("same\nold", "same\nnew", {
      ignoreCase: false,
      ignoreWhitespace: false,
    });
    expect(mockedDiffJsonText).not.toHaveBeenCalled();
  });

  it("json mode: calls diffJsonText, not diffText", async () => {
    mockedDiffJsonText.mockResolvedValue({
      lines: [],
      rows: [],
      addedCount: 0,
      removedCount: 0,
      unchangedCount: 0,
      changeBlockCount: 0,
    });

    render(<DiffTool mode="json" />);
    fireEvent.change(screen.getByLabelText(/original json/i), { target: { value: "{}" } });
    fireEvent.change(screen.getByLabelText(/changed json/i), { target: { value: "{}" } });
    fireEvent.click(screen.getByRole("button", { name: /^compare$/i }));

    await waitFor(() => expect(mockedDiffJsonText).toHaveBeenCalledWith("{}", "{}"));
    expect(mockedDiffText).not.toHaveBeenCalled();
  });

  it("shows a friendly error when the diff fails", async () => {
    mockedDiffJsonText.mockRejectedValue(new ProcessingError("MALFORMED_FILE", "This isn't valid JSON."));
    render(<DiffTool mode="json" />);
    fireEvent.change(screen.getByLabelText(/original json/i), { target: { value: "not json" } });
    fireEvent.change(screen.getByLabelText(/changed json/i), { target: { value: "{}" } });
    fireEvent.click(screen.getByRole("button", { name: /^compare$/i }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
  });
});

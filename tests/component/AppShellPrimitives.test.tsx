import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Toolbar } from "@/components/app-shell/Toolbar";
import { UndoRedoControls } from "@/components/app-shell/UndoRedoControls";
import { EditOperationList } from "@/components/app-shell/EditOperationList";

describe("Toolbar", () => {
  const modes = [
    { id: "view" as const, label: "Viewer" },
    { id: "edit" as const, label: "Editor" },
  ];

  it("marks the active mode as selected and calls onModeChange when another is clicked", () => {
    const onModeChange = vi.fn();
    render(<Toolbar modes={modes} activeMode="view" onModeChange={onModeChange} />);

    expect(screen.getByRole("tab", { name: "Viewer" })).toHaveAttribute("aria-selected", "true");
    fireEvent.click(screen.getByRole("tab", { name: "Editor" }));
    expect(onModeChange).toHaveBeenCalledWith("edit");
  });

  it("disables mode buttons entirely when onModeChange is omitted (locked-format pages)", () => {
    render(<Toolbar modes={modes} activeMode="view" />);
    expect(screen.getByRole("tab", { name: "Editor" })).toBeDisabled();
  });

  it("shows the format label when provided", () => {
    render(<Toolbar modes={modes} activeMode="view" formatLabel="CSV" />);
    expect(screen.getByText("CSV")).toBeInTheDocument();
  });
});

describe("UndoRedoControls", () => {
  it("disables Undo/Redo per canUndo/canRedo and fires the right callback", () => {
    const onUndo = vi.fn();
    const onRedo = vi.fn();
    render(<UndoRedoControls canUndo canRedo={false} onUndo={onUndo} onRedo={onRedo} />);

    const undo = screen.getByRole("button", { name: /undo last edit/i });
    const redo = screen.getByRole("button", { name: /redo last undone edit/i });
    expect(undo).toBeEnabled();
    expect(redo).toBeDisabled();

    fireEvent.click(undo);
    expect(onUndo).toHaveBeenCalledOnce();
    expect(onRedo).not.toHaveBeenCalled();
  });
});

describe("EditOperationList", () => {
  it("shows an empty-state message with no steps", () => {
    render(<EditOperationList steps={[]} />);
    expect(screen.getByText(/no edits applied yet/i)).toBeInTheDocument();
  });

  it("renders every step in order, numbered", () => {
    render(
      <EditOperationList
        steps={[
          { id: "1", label: "Trim whitespace" },
          { id: "2", label: "Sort by name" },
        ]}
      />
    );
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("Trim whitespace");
    expect(items[1]).toHaveTextContent("Sort by name");
  });
});

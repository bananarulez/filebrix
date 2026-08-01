import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Toolbar } from "@/components/app-shell/Toolbar";
import { AppShell } from "@/components/app-shell/AppShell";
import { ActionPicker } from "@/components/app-shell/ActionPicker";
import { STUDIO_TAB_PANEL_ID, studioTabId } from "@/components/app-shell/tabIds";
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

  // The three pieces that make this a real ARIA Tabs implementation rather
  // than a set of buttons wearing tab roles — see Toolbar's doc comment.
  it("points each tab at the shell's tab panel and keeps only the selected tab in the tab order", () => {
    render(<Toolbar modes={modes} activeMode="view" onModeChange={vi.fn()} />);

    const selected = screen.getByRole("tab", { name: "Viewer" });
    const other = screen.getByRole("tab", { name: "Editor" });
    expect(selected).toHaveAttribute("aria-controls", STUDIO_TAB_PANEL_ID);
    expect(other).toHaveAttribute("aria-controls", STUDIO_TAB_PANEL_ID);
    expect(selected).toHaveAttribute("id", studioTabId("view"));
    // Roving tabindex: Tab skips past the bar instead of stepping through it.
    expect(selected).toHaveAttribute("tabindex", "0");
    expect(other).toHaveAttribute("tabindex", "-1");
  });

  it("moves between tabs with Arrow/Home/End keys", () => {
    const onModeChange = vi.fn();
    render(<Toolbar modes={modes} activeMode="view" onModeChange={onModeChange} />);
    const tablist = screen.getByRole("tablist");

    fireEvent.keyDown(tablist, { key: "ArrowRight" });
    expect(onModeChange).toHaveBeenLastCalledWith("edit");

    // Wraps around rather than dead-ending at the edge.
    fireEvent.keyDown(tablist, { key: "ArrowLeft" });
    expect(onModeChange).toHaveBeenLastCalledWith("edit");

    fireEvent.keyDown(tablist, { key: "End" });
    expect(onModeChange).toHaveBeenLastCalledWith("edit");
    fireEvent.keyDown(tablist, { key: "Home" });
    expect(onModeChange).toHaveBeenLastCalledWith("view");
  });

  it("renders the AppShell's main area as the panel those tabs control", () => {
    render(
      <AppShell activeTabId={studioTabId("view")} toolbar={<Toolbar modes={modes} activeMode="view" />}>
        <p>panel content</p>
      </AppShell>
    );
    const panel = screen.getByRole("tabpanel");
    expect(panel).toHaveAttribute("id", STUDIO_TAB_PANEL_ID);
    expect(panel).toHaveAttribute("aria-labelledby", studioTabId("view"));
    expect(panel).toHaveTextContent("panel content");
  });

  it("stays a plain container when no tab is active (non-tabbed consumers)", () => {
    render(
      <AppShell toolbar={<span />}>
        <p>panel content</p>
      </AppShell>
    );
    expect(screen.queryByRole("tabpanel")).not.toBeInTheDocument();
  });
});

/**
 * ActionPicker is a radio group, not a second tablist: the region below it is
 * shared with the Studio's drop zone, so there is no panel for a `tab` to
 * own. See its doc comment for the full reasoning.
 */
describe("ActionPicker", () => {
  const options = ["merge", "split", "extract"] as const;
  const labels = { merge: "Merge", split: "Split", extract: "Extract" };

  it("exposes a radio group with exactly one checked option", () => {
    render(<ActionPicker options={options} labels={labels} active="split" onChange={vi.fn()} />);

    expect(screen.getByRole("radiogroup", { name: "Action" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Split" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Merge" })).toHaveAttribute("aria-checked", "false");
    // No tab semantics left behind, which would promise a panel that doesn't exist.
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
  });

  it("marks a gated option aria-disabled with its reason, and refuses to select it", () => {
    const onChange = vi.fn();
    render(
      <ActionPicker
        options={options}
        labels={labels}
        active="merge"
        onChange={onChange}
        disabledReasons={{ split: "Needs a different file" }}
      />
    );

    const split = screen.getByRole("radio", { name: "Split" });
    expect(split).toHaveAttribute("aria-disabled", "true");
    expect(split).toHaveAttribute("title", "Needs a different file");
    fireEvent.click(split);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("skips gated options when arrowing through the group", () => {
    const onChange = vi.fn();
    render(
      <ActionPicker
        options={options}
        labels={labels}
        active="merge"
        onChange={onChange}
        disabledReasons={{ split: "Needs a different file" }}
      />
    );

    fireEvent.keyDown(screen.getByRole("radiogroup"), { key: "ArrowRight" });
    // "split" is next in order but unavailable, so focus/selection lands on "extract".
    expect(onChange).toHaveBeenCalledWith("extract");
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

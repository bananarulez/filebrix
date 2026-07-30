import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { JsonTreeView } from "@/components/spreadsheet/JsonTreeView";

describe("JsonTreeView", () => {
  it("renders the root's immediate children expanded by default", () => {
    render(<JsonTreeView value={{ name: "Ada", age: 30 }} />);
    expect(screen.getByText('"Ada"')).toBeInTheDocument();
    expect(screen.getByText("30")).toBeInTheDocument();
  });

  it("renders array indices as labels and a correct Array(N) summary", () => {
    render(<JsonTreeView value={{ tags: ["a", "b", "c"] }} />);
    expect(screen.getByText("Array(3)")).toBeInTheDocument();
  });

  it("collapses a nested object by default and never mounts its children into the DOM until expanded", () => {
    // Root has 2 entries (Object(2)) and "nested" has 1 (Object(1)) — deliberately
    // different counts so the two toggle buttons' summaries can't collide.
    render(<JsonTreeView value={{ a: 1, nested: { secret: "hidden-value" } }} />);
    // Depth-1 node ("nested") starts collapsed (defaultExpandDepth=1) — its own
    // child ("secret") must not be in the document at all, not just hidden.
    expect(screen.queryByText('"hidden-value"')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Object(1)"));
    expect(screen.getByText('"hidden-value"')).toBeInTheDocument();
  });

  it("renders null/boolean leaves distinctly", () => {
    render(<JsonTreeView value={{ a: null, b: true }} />);
    expect(screen.getByText("null")).toBeInTheDocument();
    expect(screen.getByText("true")).toBeInTheDocument();
  });

  it("stops recursing at the depth cap instead of crashing on a pathologically deep structure", () => {
    let deep: unknown = "bottom";
    for (let i = 0; i < 200; i++) deep = { child: deep };
    expect(() => render(<JsonTreeView value={deep} defaultExpandDepth={999} />)).not.toThrow();
    expect(screen.getAllByText(/max depth reached/).length).toBeGreaterThan(0);
  });

  it("caps a very wide node's rendered children and shows a 'more not shown' affordance", () => {
    const wide: Record<string, number> = {};
    for (let i = 0; i < 600; i++) wide[`key${i}`] = i;
    render(<JsonTreeView value={wide} />);
    expect(screen.getByText("100 more not shown")).toBeInTheDocument();
  });
});

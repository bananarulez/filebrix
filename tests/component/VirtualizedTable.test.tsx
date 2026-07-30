import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { VirtualizedTable } from "@/components/tools/VirtualizedTable";

describe("VirtualizedTable", () => {
  it("renders column headers and row cells as plain text", () => {
    render(
      <VirtualizedTable
        columns={["id", "name"]}
        rows={[
          [1, "Alice"],
          [2, "Bob"],
        ]}
      />
    );
    expect(screen.getByText("id")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("renders a script-tag-shaped cell value as inert visible text, never as executable markup", () => {
    const payload = '<img src=x onerror="window.__pwned = true">';
    render(<VirtualizedTable columns={["comment"]} rows={[[payload]]} />);

    // The literal payload string is visible as text content...
    expect(screen.getByText(payload)).toBeInTheDocument();
    // ...and was never parsed as HTML: no real <img> element was created,
    // and the onerror handler never ran (jsdom would still evaluate a real
    // one if the string had been injected via dangerouslySetInnerHTML).
    expect(document.querySelectorAll("img")).toHaveLength(0);
    expect((window as unknown as { __pwned?: boolean }).__pwned).toBeUndefined();
  });

  it("renders null cells as empty, not the literal string 'null'", () => {
    const { container } = render(<VirtualizedTable columns={["a", "b"]} rows={[[null, "x"]]} />);
    const cells = container.querySelectorAll("td");
    expect(cells[0].textContent).toBe("");
    expect(cells[1].textContent).toBe("x");
  });

  it("renders Unicode content (including emoji and RTL text) unchanged", () => {
    render(<VirtualizedTable columns={["text"]} rows={[["日本語 🎉 مرحبا"]]} />);
    expect(screen.getByText("日本語 🎉 مرحبا")).toBeInTheDocument();
  });

  it("handles a ragged row with fewer cells than columns without throwing", () => {
    expect(() =>
      render(<VirtualizedTable columns={["a", "b", "c"]} rows={[[1]]} />)
    ).not.toThrow();
  });

  it("windows large row counts: only a small slice of rows is mounted in the DOM", () => {
    const rows = Array.from({ length: 10_000 }, (_, i) => [i, `row-${i}`]);
    const { container } = render(<VirtualizedTable columns={["id", "label"]} rows={rows} />);
    const renderedRows = container.querySelectorAll("tbody tr");
    // Overscan + visible height means dozens of rows, never anywhere close
    // to all 10,000 — this is the entire point of virtualization.
    expect(renderedRows.length).toBeGreaterThan(0);
    expect(renderedRows.length).toBeLessThan(200);
  });

  it("renders an empty table (zero rows) without crashing", () => {
    expect(() => render(<VirtualizedTable columns={["a"]} rows={[]} />)).not.toThrow();
  });

  it("rows are not clickable and carry no aria-selected when onRowClick is omitted (default behavior unchanged)", () => {
    const { container } = render(
      <VirtualizedTable
        columns={["id"]}
        rows={[[1], [2]]}
      />
    );
    const row = container.querySelector("tbody tr")!;
    expect(row).not.toHaveAttribute("aria-selected");
    expect(row.className).toBe("");
  });

  it("calls onRowClick with the row's absolute index, not its position within the visible window", () => {
    const onRowClick = vi.fn();
    render(
      <VirtualizedTable
        columns={["id"]}
        rows={[[1], [2], [3]]}
        onRowClick={onRowClick}
      />
    );
    fireEvent.click(screen.getByText("3").closest("tr")!);
    expect(onRowClick).toHaveBeenCalledTimes(1);
    expect(onRowClick).toHaveBeenCalledWith(2);
  });

  it("highlights the row matching selectedRowIndex and marks it aria-selected, leaving others unmarked", () => {
    const { container } = render(
      <VirtualizedTable columns={["id"]} rows={[[1], [2], [3]]} onRowClick={() => {}} selectedRowIndex={1} />
    );
    const rows = container.querySelectorAll("tbody tr");
    expect(rows[0]).toHaveAttribute("aria-selected", "false");
    expect(rows[1]).toHaveAttribute("aria-selected", "true");
    expect(rows[2]).toHaveAttribute("aria-selected", "false");
  });
});

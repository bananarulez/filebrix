import { describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { SpreadsheetGridEditor } from "@/components/spreadsheet/SpreadsheetGridEditor";
import type { NormalizedTable } from "@/engines/spreadsheet";

const TABLE: NormalizedTable = {
  columns: ["id", "name"],
  rows: [
    [1, "Alice"],
    [2, "Bob"],
  ],
  warnings: [],
};

describe("SpreadsheetGridEditor", () => {
  it("renders a real jspreadsheet-ce grid with the table's headers and values", async () => {
    const { container } = render(<SpreadsheetGridEditor table={TABLE} onLiveChange={vi.fn()} />);

    await waitFor(() => expect(container.querySelector("table")).toBeInTheDocument());
    expect(container.textContent).toContain("id");
    expect(container.textContent).toContain("name");
    expect(container.textContent).toContain("Alice");
    expect(container.textContent).toContain("Bob");
  });

  it("never renders a script-tag-shaped cell value as executable markup (parseHTML: false)", async () => {
    const payload = '<img src=x onerror="window.__pwned = true">';
    const table: NormalizedTable = { columns: ["comment"], rows: [[payload]], warnings: [] };

    const { container } = render(<SpreadsheetGridEditor table={table} onLiveChange={vi.fn()} />);
    await waitFor(() => expect(container.querySelector("table")).toBeInTheDocument());

    // The literal payload text is visible in a cell...
    expect(container.textContent).toContain(payload);
    // ...but was never parsed as HTML: no real <img> element exists inside
    // the grid, and its onerror handler never ran.
    expect(container.querySelectorAll("td img")).toHaveLength(0);
    expect((window as unknown as { __pwned?: boolean }).__pwned).toBeUndefined();
  });

  it("cleans up its DOM on unmount without throwing", async () => {
    const { container, unmount } = render(<SpreadsheetGridEditor table={TABLE} onLiveChange={vi.fn()} />);
    await waitFor(() => expect(container.querySelector("table")).toBeInTheDocument());
    expect(() => unmount()).not.toThrow();
  });
});

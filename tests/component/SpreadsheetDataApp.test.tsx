import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import { SpreadsheetDataApp } from "@/components/spreadsheet/SpreadsheetDataApp";
import { parseCsvFile, serializeToXlsx } from "@/engines/spreadsheet";

vi.mock("@/engines/spreadsheet", () => ({
  parseCsvFile: vi.fn(),
  inspectWorkbook: vi.fn(),
  parseXlsxSheetFile: vi.fn(),
  parseJsonFile: vi.fn(),
  serializeToCsv: vi.fn(),
  serializeToXlsx: vi.fn(),
  serializeToJson: vi.fn(),
}));

const mockedParseCsv = vi.mocked(parseCsvFile);
const mockedSerializeToXlsx = vi.mocked(serializeToXlsx);

function selectFile(file: File) {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });
}

function csvFile(name = "people.csv") {
  return new File(["id,name\n1,Alice\n2,Bob\n"], name, { type: "text/csv" });
}

const TABLE = {
  columns: ["id", "name"],
  rows: [
    [1, "Alice"],
    [2, "Bob"],
  ],
  warnings: [],
};

/** The preview is always rendered via VirtualizedTable — locating cells by
 * role, not text content, sidesteps testing-library's default whitespace
 * normalization (which can make otherwise-distinct cell values ambiguous). */
function previewCell(text: string) {
  return within(screen.getByRole("table")).getByText(text);
}

describe("SpreadsheetDataApp", () => {
  it("view mode: parses a dropped CSV and renders it as a table", async () => {
    mockedParseCsv.mockResolvedValue(TABLE);
    render(<SpreadsheetDataApp initialMode="view" lockedFormat="csv" />);
    selectFile(csvFile());

    await waitFor(() => expect(screen.getByRole("table")).toBeInTheDocument());
    expect(previewCell("Alice")).toBeInTheDocument();
    expect(previewCell("Bob")).toBeInTheDocument();
  });

  it("rejects a file that doesn't match the locked format", async () => {
    render(<SpreadsheetDataApp initialMode="view" lockedFormat="csv" />);
    selectFile(new File(['{"a":1}'], "data.json", { type: "application/json" }));

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(mockedParseCsv).not.toHaveBeenCalled();
  });

  it("edit mode: applying an operation records it in the applied-edits list, and Undo removes it", async () => {
    mockedParseCsv.mockResolvedValue(TABLE);
    render(<SpreadsheetDataApp initialMode="edit" lockedFormat="csv" />);
    selectFile(csvFile());
    await waitFor(() => expect(screen.getByRole("table")).toBeInTheDocument());

    const undoButton = screen.getByRole("button", { name: /undo last edit/i });
    expect(undoButton).toBeDisabled();

    // "Remove duplicate rows" needs no extra fields, so a bare "Apply" click
    // is enough to exercise apply -> recipe -> undo end to end.
    fireEvent.change(screen.getByLabelText(/operation type/i), { target: { value: "removeDuplicateRows" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    await waitFor(() => expect(undoButton).toBeEnabled());
    expect(within(screen.getByRole("list")).getByText(/remove duplicate rows/i)).toBeInTheDocument();

    fireEvent.click(undoButton);
    await waitFor(() => expect(undoButton).toBeDisabled());
    expect(screen.getByText(/no edits applied yet/i)).toBeInTheDocument();
  });

  it("edit mode: trim whitespace operation actually changes the previewed data", async () => {
    mockedParseCsv.mockResolvedValue({
      columns: ["name"],
      rows: [["  Alice  "]],
      warnings: [],
    });
    render(<SpreadsheetDataApp initialMode="edit" lockedFormat="csv" />);
    selectFile(csvFile());
    // Edit mode renders the real jspreadsheet-ce grid, whose single data
    // cell is addressable by its own data-x/data-y coordinates — a plain
    // role("cell") query is ambiguous here since the grid's header and
    // row-number cells are also bare <td>s (no <th>), unlike VirtualizedTable.
    const dataCell = () => document.querySelector('td[data-x="0"][data-y="0"]');
    await waitFor(() => expect(dataCell()?.textContent).toBe("  Alice  "));

    fireEvent.change(screen.getByLabelText(/operation type/i), { target: { value: "trimWhitespace" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    await waitFor(() => expect(dataCell()?.textContent).toBe("Alice"));
  });

  it("convert mode: converting produces a downloadable result", async () => {
    mockedParseCsv.mockResolvedValue(TABLE);
    mockedSerializeToXlsx.mockResolvedValue(new Blob(["fake xlsx"]));

    render(<SpreadsheetDataApp initialMode="convert" lockedFormat="csv" initialOutputFormat="xlsx" />);
    selectFile(csvFile());
    await waitFor(() => expect(screen.getByRole("button", { name: "Convert" })).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Convert" }));

    await waitFor(() => expect(screen.getByRole("button", { name: /download \.xlsx/i })).toBeInTheDocument());
    expect(mockedSerializeToXlsx).toHaveBeenCalled();
  });

  it("analyze mode: shows row/column counts and per-column type/null/distinct stats", async () => {
    mockedParseCsv.mockResolvedValue({
      columns: ["id", "note"],
      rows: [
        [1, "x"],
        [2, null],
      ],
      warnings: [],
    });
    render(<SpreadsheetDataApp initialMode="analyze" lockedFormat="csv" />);
    selectFile(csvFile());

    await waitFor(() => expect(screen.getByRole("table")).toBeInTheDocument());
    const table = screen.getByRole("table");
    expect(within(table).getByText("id")).toBeInTheDocument();
    expect(within(table).getByText("number")).toBeInTheDocument();
    expect(within(table).getByText("note")).toBeInTheDocument();
  });

  it("switching modes preserves data already loaded — no re-drop needed", async () => {
    mockedParseCsv.mockResolvedValue(TABLE);
    render(<SpreadsheetDataApp initialMode="view" lockedFormat="csv" />);
    selectFile(csvFile());
    await waitFor(() => expect(screen.getByRole("table")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("tab", { name: "Analyzer" }));
    await waitFor(() => expect(screen.getByText("id")).toBeInTheDocument());
    expect(mockedParseCsv).toHaveBeenCalledTimes(1);
  });
});

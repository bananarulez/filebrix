import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { CsvToSqlTool } from "@/components/dev-tools/CsvToSqlTool";
import { parseCsvFile } from "@/engines/spreadsheet";
import { buildInsertStatements } from "@/engines/developer/sql/csvToInsert";
import { ProcessingError } from "@/lib/errors/ProcessingError";

vi.mock("@/engines/spreadsheet", () => ({
  parseCsvFile: vi.fn(),
}));

vi.mock("@/engines/developer/sql/csvToInsert", async () => {
  const actual = await vi.importActual<typeof import("@/engines/developer/sql/csvToInsert")>(
    "@/engines/developer/sql/csvToInsert"
  );
  return { ...actual, buildInsertStatements: vi.fn() };
});

const mockedParseCsv = vi.mocked(parseCsvFile);
const mockedBuild = vi.mocked(buildInsertStatements);

function selectFile(file: File) {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });
}

describe("CsvToSqlTool", () => {
  it("defaults the table name from the filename and builds INSERT statements on click", async () => {
    mockedParseCsv.mockResolvedValue({
      columns: ["id", "name"],
      rows: [[1, "Alice"]],
      warnings: [],
    });
    mockedBuild.mockReturnValue({
      output: `INSERT INTO "customers" ("id", "name") VALUES (1, 'Alice');`,
      warnings: [],
    });

    render(<CsvToSqlTool />);
    selectFile(new File(["id,name\n1,Alice"], "customers.csv"));

    await waitFor(() => expect(screen.getByDisplayValue("customers")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /build insert statements/i }));

    await waitFor(() =>
      expect(screen.getByLabelText(/generated sql insert statements/i)).toHaveValue(
        `INSERT INTO "customers" ("id", "name") VALUES (1, 'Alice');`
      )
    );
    expect(mockedBuild).toHaveBeenCalledWith(expect.anything(), { tableName: "customers", dialect: "standard" });
  });

  it("lets the user change the table name and dialect before converting", async () => {
    mockedParseCsv.mockResolvedValue({ columns: ["a"], rows: [[1]], warnings: [] });
    mockedBuild.mockReturnValue({ output: "INSERT INTO `t` (`a`) VALUES (1);", warnings: [] });

    render(<CsvToSqlTool />);
    selectFile(new File(["a\n1"], "data.csv"));
    await waitFor(() => expect(screen.getByDisplayValue("data")).toBeInTheDocument());

    fireEvent.change(screen.getByDisplayValue("data"), { target: { value: "t" } });
    fireEvent.change(screen.getByLabelText(/sql dialect/i), { target: { value: "mysql" } });
    fireEvent.click(screen.getByRole("button", { name: /build insert statements/i }));

    await waitFor(() => expect(mockedBuild).toHaveBeenCalledWith(expect.anything(), { tableName: "t", dialect: "mysql" }));
  });

  it("shows a friendly error when the CSV can't be read", async () => {
    mockedParseCsv.mockRejectedValue(new ProcessingError("MALFORMED_FILE", "Bad CSV."));
    render(<CsvToSqlTool />);
    selectFile(new File(["garbage"], "bad.csv"));
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
  });
});

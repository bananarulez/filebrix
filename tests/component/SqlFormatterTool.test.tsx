import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { SqlFormatterTool } from "@/app/tools/sql-formatter/SqlFormatterTool";
import { formatSqlText } from "@/engines/developer/sql/formatSql";
import { ProcessingError } from "@/lib/errors/ProcessingError";

vi.mock("@/engines/developer/sql/formatSql", async () => {
  const actual = await vi.importActual<typeof import("@/engines/developer/sql/formatSql")>(
    "@/engines/developer/sql/formatSql"
  );
  return { ...actual, formatSqlText: vi.fn() };
});

const mockedFormat = vi.mocked(formatSqlText);

describe("SqlFormatterTool", () => {
  it("formats the input and shows the result", async () => {
    mockedFormat.mockResolvedValue({ output: "SELECT *\nFROM users;" });

    render(<SqlFormatterTool />);
    fireEvent.change(screen.getByLabelText(/sql input/i), { target: { value: "select * from users;" } });
    fireEvent.click(screen.getByRole("button", { name: /^format$/i }));

    await waitFor(() => expect(screen.getByLabelText(/formatted sql/i)).toHaveValue("SELECT *\nFROM users;"));
    expect(mockedFormat).toHaveBeenCalledWith("select * from users;", "sql");
  });

  it("passes the selected dialect through", async () => {
    mockedFormat.mockResolvedValue({ output: "SELECT 1;" });
    render(<SqlFormatterTool />);
    fireEvent.change(screen.getByLabelText(/sql input/i), { target: { value: "select 1;" } });
    fireEvent.change(screen.getByLabelText(/dialect/i), { target: { value: "postgresql" } });
    fireEvent.click(screen.getByRole("button", { name: /^format$/i }));
    await waitFor(() => expect(mockedFormat).toHaveBeenCalledWith("select 1;", "postgresql"));
  });

  it("shows a friendly error when formatting fails", async () => {
    mockedFormat.mockRejectedValue(new ProcessingError("MALFORMED_FILE", "Could not format this SQL."));
    render(<SqlFormatterTool />);
    fireEvent.change(screen.getByLabelText(/sql input/i), { target: { value: "not sql at all $$" } });
    fireEvent.click(screen.getByRole("button", { name: /^format$/i }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
  });

  it("disables Format until there's input", () => {
    render(<SqlFormatterTool />);
    expect(screen.getByRole("button", { name: /^format$/i })).toBeDisabled();
  });
});

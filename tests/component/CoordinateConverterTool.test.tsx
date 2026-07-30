import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { CoordinateConverterTool } from "@/components/geo/CoordinateConverterTool";
import { convertCoordinateLines } from "@/engines/geospatial/convert/coordinates";

vi.mock("@/engines/geospatial/convert/coordinates", () => ({
  convertCoordinateLines: vi.fn(),
}));

const mockedConvert = vi.mocked(convertCoordinateLines);

describe("CoordinateConverterTool", () => {
  it("converts pasted coordinates and shows per-line results", async () => {
    mockedConvert.mockReturnValue([
      { input: "40.7128, -74.0060", output: "40°42'46.08\"N 74°0'21.60\"W", error: null },
      { input: "nonsense", output: null, error: "Could not recognize this as a coordinate." },
    ]);

    render(<CoordinateConverterTool />);
    fireEvent.change(screen.getByLabelText(/coordinates/i), {
      target: { value: "40.7128, -74.0060\nnonsense" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^convert$/i }));

    await waitFor(() => expect(screen.getByText(/40°42'46/)).toBeInTheDocument());
    expect(screen.getByText(/could not recognize/i)).toBeInTheDocument();
    expect(mockedConvert).toHaveBeenCalledWith("40.7128, -74.0060\nnonsense", "dd");
  });

  it("offers a download once there's at least one successful conversion", async () => {
    mockedConvert.mockReturnValue([{ input: "1, 2", output: "1.000000, 2.000000", error: null }]);

    render(<CoordinateConverterTool />);
    fireEvent.change(screen.getByLabelText(/coordinates/i), { target: { value: "1, 2" } });
    fireEvent.click(screen.getByRole("button", { name: /^convert$/i }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /download converted coordinates/i })).toBeInTheDocument()
    );
  });

  it("disables the convert button when the input is empty", () => {
    render(<CoordinateConverterTool />);
    expect(screen.getByRole("button", { name: /^convert$/i })).toBeDisabled();
  });
});

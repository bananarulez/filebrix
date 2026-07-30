import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { UuidGeneratorTool } from "@/components/dev-tools/UuidGeneratorTool";
import { generateUuids } from "@/engines/developer/uuid";

vi.mock("@/engines/developer/uuid", () => ({
  generateUuids: vi.fn(),
}));

const mockedGenerate = vi.mocked(generateUuids);

describe("UuidGeneratorTool", () => {
  it("generates UUIDs on mount (client-side, avoiding a hydration mismatch)", async () => {
    mockedGenerate.mockReturnValue(["uuid-1", "uuid-2"]);
    render(<UuidGeneratorTool />);
    await waitFor(() => expect(screen.getByLabelText(/generated uuids/i)).toHaveValue("uuid-1\nuuid-2"));
  });

  it("regenerates the requested count when Generate is clicked", async () => {
    mockedGenerate.mockReturnValue(["a"]);
    render(<UuidGeneratorTool />);
    await waitFor(() => expect(mockedGenerate).toHaveBeenCalled());

    mockedGenerate.mockReturnValue(["x", "y", "z"]);
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: /^generate$/i }));

    await waitFor(() => expect(screen.getByLabelText(/generated uuids/i)).toHaveValue("x\ny\nz"));
    expect(mockedGenerate).toHaveBeenLastCalledWith(3);
  });

  it("offers a download of the generated UUIDs", async () => {
    mockedGenerate.mockReturnValue(["uuid-1"]);
    render(<UuidGeneratorTool />);
    await waitFor(() => expect(screen.getByRole("button", { name: /download \.txt/i })).toBeInTheDocument());
  });
});

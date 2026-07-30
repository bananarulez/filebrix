import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { HashGeneratorTool } from "@/components/dev-tools/HashGeneratorTool";
import { computeHashes } from "@/engines/developer/hash";
import { ProcessingError } from "@/lib/errors/ProcessingError";

vi.mock("@/engines/developer/hash", () => ({
  computeHashes: vi.fn(),
}));

const mockedComputeHashes = vi.mocked(computeHashes);

describe("HashGeneratorTool", () => {
  it("computes and shows every algorithm's hash", async () => {
    mockedComputeHashes.mockResolvedValue([
      { algorithm: "SHA-1", hex: "aaa1" },
      { algorithm: "SHA-256", hex: "bbb2" },
      { algorithm: "SHA-384", hex: "ccc3" },
      { algorithm: "SHA-512", hex: "ddd4" },
    ]);

    render(<HashGeneratorTool />);
    fireEvent.change(screen.getByLabelText(/text input/i), { target: { value: "hello" } });
    fireEvent.click(screen.getByRole("button", { name: /compute hashes/i }));

    await waitFor(() => expect(screen.getByText("aaa1")).toBeInTheDocument());
    expect(screen.getByText("bbb2")).toBeInTheDocument();
    expect(screen.getByText("ccc3")).toBeInTheDocument();
    expect(screen.getByText("ddd4")).toBeInTheDocument();
    expect(mockedComputeHashes).toHaveBeenCalledWith("hello");
  });

  it("labels SHA-1 as legacy", async () => {
    mockedComputeHashes.mockResolvedValue([{ algorithm: "SHA-1", hex: "aaa1" }]);
    render(<HashGeneratorTool />);
    fireEvent.change(screen.getByLabelText(/text input/i), { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: /compute hashes/i }));
    await waitFor(() => expect(screen.getByText(/legacy/i)).toBeInTheDocument());
  });

  it("always warns against using these for password storage", () => {
    render(<HashGeneratorTool />);
    expect(screen.getByText("never", { selector: "strong" })).toBeInTheDocument();
    expect(screen.getByText(/use them to store passwords/i)).toBeInTheDocument();
  });

  it("shows an error panel when hashing fails", async () => {
    mockedComputeHashes.mockRejectedValue(new ProcessingError("UNSUPPORTED_FORMAT", "Crypto unavailable."));
    render(<HashGeneratorTool />);
    fireEvent.change(screen.getByLabelText(/text input/i), { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: /compute hashes/i }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
  });

  it("disables the button until there's input", () => {
    render(<HashGeneratorTool />);
    expect(screen.getByRole("button", { name: /compute hashes/i })).toBeDisabled();
  });
});

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ErrorPanel } from "@/components/tools/ErrorPanel";

describe("ErrorPanel", () => {
  it("always reassures the user their file was never uploaded", () => {
    render(<ErrorPanel message="Something went wrong." />);
    expect(screen.getByText(/never uploaded/i)).toBeInTheDocument();
  });

  it("shows memory-specific suggestions for OUT_OF_MEMORY errors", () => {
    render(<ErrorPanel message="Ran out of memory." code="OUT_OF_MEMORY" />);
    expect(screen.getByText(/close unused browser tabs/i)).toBeInTheDocument();
  });

  it("shows the same suggestions for a TIMEOUT, which is usually an unreported OOM kill", () => {
    render(<ErrorPanel message="This is taking much longer than expected." code="TIMEOUT" />);
    expect(screen.getByText(/close unused browser tabs/i)).toBeInTheDocument();
  });

  it("does not show memory suggestions for other error codes", () => {
    render(<ErrorPanel message="Unsupported format." code="UNSUPPORTED_FORMAT" />);
    expect(screen.queryByText(/close unused browser tabs/i)).not.toBeInTheDocument();
  });
});

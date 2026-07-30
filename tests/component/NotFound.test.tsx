import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import NotFound from "@/app/not-found";

describe("NotFound", () => {
  it("gives the user a way back in, not a dead end", () => {
    render(<NotFound />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/not found/i);
    expect(screen.getByRole("link", { name: /homepage/i })).toHaveAttribute("href", "/");
    // Every category is reachable from here too.
    expect(screen.getByRole("link", { name: /pdf studio/i })).toBeInTheDocument();
  });

  it("reassures the user their file was never uploaded", () => {
    render(<NotFound />);
    expect(screen.getByText(/never uploaded/i)).toBeInTheDocument();
  });
});

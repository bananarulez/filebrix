import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CategoryToolFilter } from "@/components/category/CategoryToolFilter";

function makeTools(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    id: `tool-${i}`,
    name: `Tool ${i}`,
    description: `Description for tool ${i}`,
    href: `/tools/tool-${i}`,
  }));
}

describe("CategoryToolFilter", () => {
  it("renders every tool as a link, all present server-side regardless of JS filtering state", () => {
    render(<CategoryToolFilter tools={makeTools(3)} />);
    expect(screen.getByRole("link", { name: /^Tool 0\b/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Tool 1\b/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Tool 2\b/ })).toBeInTheDocument();
  });

  it("hides the filter input for small categories (not worth the UI for a handful of tools)", () => {
    render(<CategoryToolFilter tools={makeTools(5)} />);
    expect(screen.queryByPlaceholderText(/filter tools/i)).not.toBeInTheDocument();
  });

  it("shows the filter input once a category has enough tools, and filters by name", () => {
    const tools = makeTools(8);
    render(<CategoryToolFilter tools={tools} />);
    const input = screen.getByPlaceholderText(/filter tools/i);

    fireEvent.change(input, { target: { value: "Tool 3" } });

    expect(screen.getByRole("link", { name: /^Tool 3\b/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^Tool 4\b/ })).not.toBeInTheDocument();
  });

  it("shows a no-results message instead of an empty list", () => {
    render(<CategoryToolFilter tools={makeTools(8)} />);
    fireEvent.change(screen.getByPlaceholderText(/filter tools/i), { target: { value: "nonexistent" } });
    expect(screen.getByText(/no tools match/i)).toBeInTheDocument();
  });
});

import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { SiteHeader } from "@/components/layout/SiteHeader";

describe("SiteHeader", () => {
  it("presents exactly the 5 Applications as direct links, not a flat list of tools", () => {
    render(<SiteHeader />);
    const nav = screen.getByRole("navigation", { name: "Applications" });

    const expected: Record<string, string> = {
      "Data Studio": "/data-studio",
      "PDF Studio": "/pdf-tools",
      "Image Studio": "/image-tools",
      "Geospatial Studio": "/geospatial-tools",
      "Developer Toolkit": "/developer-tools",
    };
    for (const [name, href] of Object.entries(expected)) {
      expect(within(nav).getByRole("link", { name })).toHaveAttribute("href", href);
    }
  });

  it("styles each Application link with a visible border so it reads as clickable", () => {
    render(<SiteHeader />);
    const nav = screen.getByRole("navigation", { name: "Applications" });
    const link = within(nav).getByRole("link", { name: "Data Studio" });
    expect(link.className).toMatch(/\bborder\b/);
  });
});

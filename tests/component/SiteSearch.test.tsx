import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SiteSearch } from "@/components/tools/SiteSearch";

function typeQuery(query: string) {
  fireEvent.change(screen.getByLabelText(/what do you want to do/i), { target: { value: query } });
}

describe("SiteSearch", () => {
  it("shows nothing before a query is typed", () => {
    render(<SiteSearch />);
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it('"PDF" renders PDF Studio, tagged as an Application, before the matching tools', () => {
    render(<SiteSearch />);
    typeQuery("PDF");

    const appLink = screen.getByRole("link", { name: "PDF Studio" });
    expect(appLink).toHaveAttribute("href", "/pdf-studio");
    expect(screen.getAllByText("Application")).toHaveLength(1);

    const items = screen.getAllByRole("listitem");
    const appIndex = items.findIndex((item) => item.textContent?.includes("PDF Studio"));
    const toolIndex = items.findIndex((item) => item.textContent?.includes("Merge PDF"));
    expect(appIndex).toBeGreaterThanOrEqual(0);
    expect(toolIndex).toBeGreaterThan(appIndex);
  });

  it('"Resize" renders Image Studio then Resize Image, with correct links', () => {
    render(<SiteSearch />);
    typeQuery("Resize");

    expect(screen.getByRole("link", { name: "Image Studio" })).toHaveAttribute("href", "/image-studio");
    expect(screen.getByRole("link", { name: "Resize Image" })).toHaveAttribute(
      "href",
      "/tools/resize-image"
    );
  });

  it("shows a no-matches message for a query that matches nothing", () => {
    render(<SiteSearch />);
    typeQuery("zzz-not-a-real-thing-zzz");
    expect(screen.getByText(/no matches for/i)).toBeInTheDocument();
  });
});

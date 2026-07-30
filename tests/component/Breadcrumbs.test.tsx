import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";

describe("Breadcrumbs", () => {
  const items = [
    { name: "Home", href: "/" },
    { name: "PDF Studio", href: "/pdf-tools" },
    { name: "Merge PDF", href: "/pdf/merge" },
  ];

  it("renders every item in order, each as a link except the current (last) one", () => {
    render(<Breadcrumbs items={items} />);

    const home = screen.getByRole("link", { name: "Home" });
    expect(home).toHaveAttribute("href", "/");
    const category = screen.getByRole("link", { name: "PDF Studio" });
    expect(category).toHaveAttribute("href", "/pdf-tools");

    // The current page is shown as plain, non-linked text.
    expect(screen.queryByRole("link", { name: "Merge PDF" })).not.toBeInTheDocument();
    const current = screen.getByText("Merge PDF");
    expect(current).toHaveAttribute("aria-current", "page");
  });

  it("emits a BreadcrumbList JSON-LD script matching the visible trail", () => {
    const { container } = render(<Breadcrumbs items={items} />);
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).not.toBeNull();

    const data = JSON.parse(script!.innerHTML);
    expect(data["@type"]).toBe("BreadcrumbList");
    expect(data.itemListElement).toHaveLength(3);
    expect(data.itemListElement[0]).toMatchObject({ position: 1, name: "Home" });
    expect(data.itemListElement[2]).toMatchObject({ position: 3, name: "Merge PDF" });
  });
});

import { expect, test } from "@playwright/test";

const APP_LINKS: Record<string, string> = {
  "Data Studio": "/data-studio",
  "PDF Studio": "/pdf-tools",
  "Image Studio": "/image-tools",
  "Geospatial Studio": "/geospatial-tools",
  "Developer Toolkit": "/developer-tools",
};

test.describe("Top-level navigation is organized around Applications, not Categories", () => {
  test("the header nav presents exactly the 5 Applications as direct, immediately clickable links", async ({
    page,
  }) => {
    await page.goto("/");
    const headerNav = page.locator("header").getByRole("navigation", { name: "Applications" });

    for (const [name, href] of Object.entries(APP_LINKS)) {
      const link = headerNav.getByRole("link", { name, exact: true });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute("href", href);
    }
  });

  test("clicking an Application in the header navigates straight to its page — no intermediate menu", async ({
    page,
  }) => {
    await page.goto("/");
    const headerNav = page.locator("header").getByRole("navigation", { name: "Applications" });

    await headerNav.getByRole("link", { name: "PDF Studio", exact: true }).click();
    await expect(page).toHaveURL(/\/pdf-tools$/);
    await expect(page.getByRole("heading", { level: 1, name: "PDF Studio" })).toBeVisible();
  });

  test("the homepage's own Applications grid previews each app's capabilities inline", async ({ page }) => {
    await page.goto("/");
    const gridNav = page.locator("main").getByRole("navigation", { name: "Applications" });
    await expect(gridNav.getByText(/Viewer.*Editor.*Converter.*Analyzer/)).toBeVisible();
    await expect(gridNav.getByText(/Text.*Encoding.*SQL.*Utilities/)).toBeVisible();
  });

  test("the footer lists all 5 Applications as plain links", async ({ page }) => {
    await page.goto("/");
    const footerNav = page.locator("footer").getByRole("navigation", { name: "Applications" });
    for (const [name, href] of Object.entries(APP_LINKS)) {
      const link = footerNav.getByRole("link", { name, exact: true });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute("href", href);
    }
  });

  test("the 404 page's Applications nav still works", async ({ page }) => {
    const response = await page.goto("/this-page-does-not-exist");
    expect(response?.status()).toBe(404);
    // The header's own nav is present too, so scope to the page body's own list.
    const bodyNav = page.locator("main").getByRole("navigation", { name: "Applications" });
    await expect(bodyNav.getByRole("link", { name: "PDF Studio" })).toHaveAttribute("href", "/pdf-tools");
  });
});

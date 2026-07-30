import { expect, test } from "@playwright/test";

test.describe.configure({ timeout: 60_000 });

test.describe("SEO audit regressions", () => {
  test("CSV to SQL INSERT lives at its real URL, not the old mismatched slug", async ({ page }) => {
    const response = await page.goto("/convert/csv-to-sql");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: /csv to sql insert/i })).toBeVisible();

    // The link this tool generates for itself (canonical, breadcrumb "current
    // page") must point at the URL that's actually working.
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/convert\/csv-to-sql$/);
  });

  test("the old broken slug is a real 404, not a silently-served different page", async ({ page }) => {
    const response = await page.goto("/convert/csv-to-sql-insert");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1, name: /not found/i })).toBeVisible();
  });

  test("an arbitrary nonexistent URL gets the custom 404 page with working navigation back in", async ({ page }) => {
    const response = await page.goto("/this-tool-does-not-exist");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1, name: /not found/i })).toBeVisible();

    await page.getByRole("link", { name: /homepage/i }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("sitemap.xml lists the CSV to SQL tool at its real, working URL", async ({ page, baseURL }) => {
    const response = await page.goto("/sitemap.xml");
    const body = await response!.text();
    expect(body).toContain(`${baseURL}/convert/csv-to-sql</loc>`);
    expect(body).not.toContain("csv-to-sql-insert");
  });

  test("a tool page shows a Home → Category → Tool breadcrumb that actually navigates", async ({ page }) => {
    await page.goto("/pdf/merge");
    const breadcrumb = page.getByRole("navigation", { name: "Breadcrumb" });
    await expect(breadcrumb.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    await expect(breadcrumb.getByRole("link", { name: "PDF Studio" })).toHaveAttribute("href", "/pdf-tools");
    await expect(breadcrumb.getByText("Merge PDF")).toBeVisible();

    await breadcrumb.getByRole("link", { name: "PDF Studio" }).click();
    await expect(page).toHaveURL(/\/pdf-tools$/);
    await expect(page.getByRole("heading", { level: 1, name: "PDF Studio" })).toBeVisible();
  });

  test("a large sub-category page's filter narrows the visible tools in a real browser", async ({ page }) => {
    // /developer-tools itself is now a category-card landing page (Developer
    // Toolkit), not a filterable list — the filter lives one level down, on
    // a sub-category page with enough tools to trigger it (>6, see
    // CategoryToolFilter). "text" has 12 (JSON Diff joined it once the JSON
    // sub-category was retired — see PROJECT_LOG.md).
    await page.goto("/developer-tools/text");
    const filterInput = page.getByPlaceholder(/filter tools/i);
    await expect(filterInput).toBeVisible();

    await expect(page.getByRole("link", { name: /^Remove Empty Lines/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /^Remove Duplicate Lines/ })).toBeVisible();

    await filterInput.fill("duplicate");

    await expect(page.getByRole("link", { name: /^Remove Duplicate Lines/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /^Remove Empty Lines/ })).not.toBeVisible();
  });

  test("every category page is reachable and returns 200", async ({ page }) => {
    for (const slug of [
      "data-studio",
      "pdf-tools",
      "image-tools",
      "geospatial-tools",
      "developer-tools",
      "developer-tools/text",
      "developer-tools/encoding",
      "developer-tools/sql",
      "developer-tools/utilities",
    ]) {
      const response = await page.goto(`/${slug}`);
      expect(response?.status(), `${slug} should return 200`).toBe(200);
    }
  });

  test("retired category URLs (/spreadsheet-tools, /data-tools, /developer-tools/json) permanently redirect to /data-studio", async ({
    page,
  }) => {
    for (const oldSlug of ["spreadsheet-tools", "data-tools", "developer-tools/json"]) {
      const response = await page.goto(`/${oldSlug}`);
      expect(response?.status(), `${oldSlug} should resolve to a 200 after redirecting`).toBe(200);
      expect(new URL(page.url()).pathname).toBe("/data-studio");
    }
  });
});

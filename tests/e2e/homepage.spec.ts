import { test, expect } from "@playwright/test";

test("homepage renders the tool search and universal file drop", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: /free online file tools/i })
  ).toBeVisible();
  await expect(page.getByLabel(/what do you want to do/i)).toBeVisible();
  await expect(page.getByText(/drop any file/i)).toBeVisible();
});

test.describe("Global site search", () => {
  test('"PDF" surfaces PDF Studio ahead of individual PDF tools, and navigates correctly', async ({ page }) => {
    await page.goto("/");
    const searchBox = page.getByLabel(/what do you want to do/i);
    await searchBox.fill("PDF");

    const resultsList = page.getByRole("list");
    const items = page.getByRole("listitem");
    await expect(items.first()).toContainText("PDF Studio");
    await expect(items.first().getByText("Application", { exact: true })).toBeVisible();
    await expect(resultsList.getByRole("link", { name: "Merge PDF" })).toBeVisible();

    await resultsList.getByRole("link", { name: "PDF Studio" }).click();
    await expect(page).toHaveURL(/\/pdf-studio$/);
  });

  test('"CSV" surfaces Data Studio via its accepted file format, not just by tool name match', async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByLabel(/what do you want to do/i).fill("CSV");

    const resultsList = page.getByRole("list");
    await expect(resultsList.getByRole("link", { name: "Data Studio" })).toBeVisible();
    await expect(resultsList.getByRole("link", { name: "CSV Viewer" })).toBeVisible();
  });

  test('"Resize" surfaces Image Studio (not matched by name) ahead of Resize Image', async ({ page }) => {
    await page.goto("/");
    await page.getByLabel(/what do you want to do/i).fill("Resize");

    const items = page.getByRole("listitem");
    await expect(items).toHaveCount(2);
    await expect(items.nth(0)).toContainText("Image Studio");
    await expect(items.nth(1)).toContainText("Resize Image");

    await page.getByRole("link", { name: "Resize Image" }).click();
    await expect(page).toHaveURL(/\/tools\/resize-image$/);
  });

  test("an unmatched query shows a graceful no-matches message", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel(/what do you want to do/i).fill("zzz-not-a-real-thing-zzz");
    await expect(page.getByText(/no matches for/i)).toBeVisible();
  });
});

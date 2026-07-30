import path from "node:path";
import { expect, test } from "@playwright/test";

const SPREADSHEET_FIXTURES_DIR = path.join(__dirname, "..", "fixtures", "spreadsheet");
const IMAGE_FIXTURES_DIR = path.join(__dirname, "..", "fixtures", "image");

test.describe.configure({ timeout: 60_000 });

test.describe("Universal File Drop", () => {
  test("detects an Excel file and groups its real tools into View/Convert sections", async ({ page }) => {
    await page.goto("/");
    await page.locator('input[type="file"]').first().setInputFiles(path.join(SPREADSHEET_FIXTURES_DIR, "sample.xlsx"));

    await expect(page.getByText("Excel spreadsheet")).toBeVisible({ timeout: 10_000 });
    // Section titles are real headings — role-scoped so this can't collide
    // with the header nav's own (collapsed, but DOM-present) "View"/"Convert"
    // Application-capability labels, which a plain getByText would match too.
    await expect(page.getByRole("heading", { name: "View", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Excel Viewer" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Convert", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Excel to CSV Converter" })).toBeVisible();
  });

  test("clicking View hands the already-dropped file to the Excel Viewer — no re-selecting it", async ({ page }) => {
    await page.goto("/");
    await page.locator('input[type="file"]').first().setInputFiles(path.join(SPREADSHEET_FIXTURES_DIR, "sample.xlsx"));
    await expect(page.getByRole("link", { name: "Excel Viewer" })).toBeVisible({ timeout: 10_000 });

    await page.getByRole("link", { name: "Excel Viewer" }).click();

    await expect(page).toHaveURL(/\/tools\/excel-viewer$/);
    // The sheet data shows up with no further action from the user — proof
    // the file was handed off rather than requiring a fresh drop/selection.
    await expect(page.getByText("Alice", { exact: true })).toBeVisible({ timeout: 10_000 });
  });

  test("clicking Convert hands the file to a converter, which produces a real download with no re-selection", async ({
    page,
  }) => {
    await page.goto("/");
    await page.locator('input[type="file"]').first().setInputFiles(path.join(SPREADSHEET_FIXTURES_DIR, "sample.csv"));
    await expect(page.getByRole("link", { name: "CSV to Excel Converter" })).toBeVisible({ timeout: 10_000 });

    await page.getByRole("link", { name: "CSV to Excel Converter" }).click();
    await expect(page).toHaveURL(/\/convert\/csv-to-excel$/);

    // Converter mode requires an explicit "Convert" click before export —
    // review-before-export, not the old tools' auto-convert-on-drop.
    await page.getByRole("button", { name: "Convert", exact: true }).click({ timeout: 10_000 });
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /download \.xlsx/i }).click({ timeout: 10_000 });
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("sample.xlsx");
  });

  test("detects a WebP image and groups convert/edit/tools sections, and hands off to an edit tool", async ({ page }) => {
    await page.goto("/");
    await page.locator('input[type="file"]').first().setInputFiles(path.join(IMAGE_FIXTURES_DIR, "sample.webp"));

    await expect(page.getByText("WebP image")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("link", { name: /webp to jpg/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /resize image/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /image metadata viewer/i })).toBeVisible();

    await page.getByRole("link", { name: /resize image/i }).click();
    await expect(page).toHaveURL(/\/tools\/resize-image$/);
    // Proof the image was handed off: the batch UI (with its "Resize"
    // action button) appears without the user dropping/selecting anything
    // on this page themselves.
    await expect(page.getByRole("button", { name: /^resize$/i }).first()).toBeVisible({ timeout: 10_000 });
  });

  test("shows a graceful message for a file type with no tool yet", async ({ page }) => {
    await page.goto("/");
    const buffer = Buffer.from([0x00, 0x01, 0x02, 0x03, 0xff, 0xfe, 0xfd]);
    await page.locator('input[type="file"]').first().setInputFiles({
      name: "mystery.xyz123",
      mimeType: "application/octet-stream",
      buffer,
    });

    await expect(page.getByText(/don't have a tool for this file type yet/i)).toBeVisible({ timeout: 10_000 });
  });

  test("suggests generic text tools for an unrecognized but text-like file", async ({ page }) => {
    await page.goto("/");
    await page.locator('input[type="file"]').first().setInputFiles({
      name: "notes.myformat",
      mimeType: "application/octet-stream",
      buffer: Buffer.from("just some plain text notes, nothing special here", "utf-8"),
    });

    await expect(page.getByText(/you could also try/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("link", { name: /text diff/i })).toBeVisible();
  });

  test("dropping a file never uploads it — not on the homepage, and not after handoff to a tool page", async ({
    page,
    baseURL,
  }) => {
    const externalRequests: string[] = [];
    const baseOrigin = baseURL ? new URL(baseURL).origin : null;
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (baseOrigin && url.origin !== baseOrigin) externalRequests.push(request.url());
    });

    await page.goto("/");
    await page.locator('input[type="file"]').first().setInputFiles(path.join(SPREADSHEET_FIXTURES_DIR, "sample.csv"));
    await expect(page.getByRole("link", { name: "CSV Viewer" })).toBeVisible({ timeout: 10_000 });

    await page.getByRole("link", { name: "CSV Viewer" }).click();
    await expect(page).toHaveURL(/\/tools\/csv-viewer$/);
    await expect(page.getByText("Café", { exact: true })).toBeVisible({ timeout: 10_000 });

    expect(externalRequests).toEqual([]);
  });
});

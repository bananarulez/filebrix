import path from "node:path";
import { expect, test } from "@playwright/test";

const FIXTURES = path.join(__dirname, "..", "fixtures");
const pdf = (name: string) => path.join(FIXTURES, "pdf", name);
const sheet = (name: string) => path.join(FIXTURES, "spreadsheet", name);

test.describe.configure({ timeout: 60_000 });

/**
 * A file dropped once should survive moving between a Studio's tool URLs.
 *
 * Switching *tabs* never lost it (that's React state on one page), but every
 * tool also has its own URL, and following one of those links unmounted the
 * page and silently discarded the file — measured before this was built.
 * `lib/workspaceFiles.ts` fixes it.
 *
 * These tests navigate by **clicking real in-app links**, never `page.goto`.
 * That distinction is the whole subject: `goto` is a hard load, which starts
 * a fresh JS module registry and *should* forget everything. Using `goto` to
 * check persistence would test the opposite of the intended behaviour — and
 * the last test in this file pins that on purpose.
 */
async function followLink(page: import("@playwright/test").Page, name: RegExp) {
  await page.getByRole("link", { name }).first().click();
  await page.waitForLoadState("networkidle");
}

test.describe("A loaded file survives navigation between tool pages", () => {
  test("Data Studio: a CSV opened in CSV Viewer is still loaded in CSV to JSON", async ({ page }) => {
    await page.goto("/tools/csv-viewer");
    await page.locator('input[type="file"]').first().setInputFiles(sheet("sample.csv"));
    await expect(page.getByText("Café", { exact: true })).toBeVisible({ timeout: 20_000 });

    await followLink(page, /CSV to JSON/i);
    await expect(page).toHaveURL(/\/convert\/csv-to-json$/);
    await expect(page.getByText("sample.csv")).toBeVisible({ timeout: 20_000 });
  });

  test("PDF Studio: a PDF opened in Merge is still loaded in Split", async ({ page }) => {
    await page.goto("/pdf/merge");
    await page.locator('input[type="file"]').first().setInputFiles(pdf("multi-page.pdf"));
    await expect(page.getByText(/^Page 1$/).first()).toBeVisible({ timeout: 25_000 });

    await followLink(page, /Split PDF/i);
    await expect(page).toHaveURL(/\/pdf\/split$/);
    await expect(page.getByText("multi-page.pdf")).toBeVisible({ timeout: 25_000 });
    // ...and the destination really opened it, rather than just echoing a name.
    await expect(page.getByText(/1 part/i)).toBeVisible({ timeout: 25_000 });
  });

  test("a page locked to another format refuses the carried file instead of erroring on it", async ({
    page,
  }) => {
    await page.goto("/tools/csv-viewer");
    await page.locator('input[type="file"]').first().setInputFiles(sheet("sample.csv"));
    await expect(page.getByText("Café", { exact: true })).toBeVisible({ timeout: 20_000 });

    await followLink(page, /CSV to JSON/i);
    await followLink(page, /JSON to CSV/i);
    await expect(page).toHaveURL(/\/convert\/json-to-csv$/);

    // Neither adopted nor complained about: a JSON-locked tool inheriting a
    // CSV would greet the user with "This looks like a CSV file, not JSON",
    // which is worse than the empty drop zone they get instead.
    await expect(page.getByText("sample.csv")).toHaveCount(0);
    await expect(page.getByText(/not JSON/i)).toHaveCount(0);
  });

  test("Clear is the off switch — after it, the next tool page starts empty", async ({ page }) => {
    await page.goto("/pdf/merge");
    await page.locator('input[type="file"]').first().setInputFiles(pdf("multi-page.pdf"));
    await expect(page.getByText(/^Page 1$/).first()).toBeVisible({ timeout: 25_000 });

    await followLink(page, /Split PDF/i);
    await expect(page.getByText("multi-page.pdf")).toBeVisible({ timeout: 25_000 });

    await page.getByRole("button", { name: "Clear", exact: true }).click();
    await expect(page.getByText("multi-page.pdf")).toHaveCount(0);

    await followLink(page, /Merge PDF/i);
    await expect(page.getByText("multi-page.pdf")).toHaveCount(0);
  });

  test("a hard reload forgets everything — the file only ever lived in this tab's memory", async ({
    page,
  }) => {
    await page.goto("/pdf/merge");
    await page.locator('input[type="file"]').first().setInputFiles(pdf("multi-page.pdf"));
    await expect(page.getByText(/^Page 1$/).first()).toBeVisible({ timeout: 25_000 });

    await page.reload();

    // Nothing is persisted to storage, so a fresh document starts clean —
    // the same property `lib/fileHandoff.ts` relies on, and the reason this
    // mechanism needs no "clear on exit" handling.
    await expect(page.getByText("multi-page.pdf")).toHaveCount(0);
    await expect(page.getByText(/^Page 1$/)).toHaveCount(0);
  });
});

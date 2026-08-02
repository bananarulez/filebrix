import path from "node:path";
import { expect, test } from "@playwright/test";

const FIXTURES_DIR = path.join(__dirname, "..", "fixtures");

function fixture(name: string): string {
  return path.join(FIXTURES_DIR, name);
}

// DuckDB-WASM has to load/instantiate its (multi-MB) engine on first use in
// each fresh page, so give these more room than Playwright's 30s default.
test.describe.configure({ timeout: 60_000 });

async function openParquetViewer(page: import("@playwright/test").Page) {
  await page.goto("/tools/parquet-viewer");
}

test("the page's reading-width column stays the same width before and after a file loads — it never widens, to keep room for ads in the side margins", async ({
  page,
}) => {
  await page.goto("/pdf-studio");
  const pdfWidth = await page.evaluate(() => {
    let el: Element = document.querySelector("h1")!;
    while (el.parentElement && el.parentElement.tagName !== "MAIN") el = el.parentElement;
    return el.getBoundingClientRect().width;
  });

  await openParquetViewer(page);
  const emptyWidth = await page.evaluate(() => {
    let el: Element = document.querySelector("h1")!;
    while (el.parentElement && el.parentElement.tagName !== "MAIN") el = el.parentElement;
    return el.getBoundingClientRect().width;
  });
  expect(emptyWidth).toBe(pdfWidth);

  await page.locator('input[type="file"]').setInputFiles(fixture("valid-basic.parquet"));
  await expect(page.getByText("item-1", { exact: true })).toBeVisible({ timeout: 20_000 });
  const loadedWidth = await page.evaluate(() => {
    let el: Element = document.querySelector("h1")!;
    while (el.parentElement && el.parentElement.tagName !== "MAIN") el = el.parentElement;
    return el.getBoundingClientRect().width;
  });
  expect(loadedWidth).toBe(emptyWidth);

  const overflowsPage = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 5
  );
  expect(overflowsPage).toBe(false);
});

test("valid Parquet file: shows correct row/column counts, schema and preview", async ({ page }) => {
  await openParquetViewer(page);
  await page.locator('input[type="file"]').setInputFiles(fixture("valid-basic.parquet"));

  await expect(page.getByText("item-1", { exact: true })).toBeVisible({ timeout: 20_000 });

  await expect(page.getByText("Rows", { exact: true })).toBeVisible();
  await expect(page.getByText("25", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Columns", { exact: true })).toBeVisible();

  for (const column of ["id", "name", "price", "in_stock", "created_at"]) {
    await expect(page.getByText(column, { exact: true }).first()).toBeVisible();
  }

  // At least one NULL cell should render as a distinct badge, not blank text.
  await expect(page.getByText("NULL").first()).toBeVisible();
});

test("empty Parquet file: shows 0 rows but still shows the schema", async ({ page }) => {
  await openParquetViewer(page);
  await page.locator('input[type="file"]').setInputFiles(fixture("empty.parquet"));

  await expect(page.getByText("No rows to display")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("id", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("name", { exact: true }).first()).toBeVisible();
});

test("malformed Parquet file: shows a friendly error instead of crashing", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await openParquetViewer(page);
  await page.locator('input[type="file"]').setInputFiles(fixture("malformed.parquet"));

  await expect(page.getByRole("alert")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/never uploaded/i)).toBeVisible();
  expect(pageErrors).toEqual([]);
});

test("large Parquet file (~100k rows): paginates and stays responsive", async ({ page }) => {
  await openParquetViewer(page);
  await page.locator('input[type="file"]').setInputFiles(fixture("large.parquet"));

  await expect(page.getByText("100,000", { exact: true }).first()).toBeVisible({ timeout: 30_000 });

  // Only the current page of rows is ever in the DOM.
  const rowCountInDom = await page.locator("tbody tr").count();
  expect(rowCountInDom).toBeLessThanOrEqual(100);

  const firstCell = page.locator("tbody tr").first().locator("td").first();
  const firstRowFirstCellBefore = await firstCell.textContent();
  await page.getByRole("button", { name: "Next", exact: true }).click();

  // "Page 2 of N" updates as soon as the click is handled, before the new
  // page of rows has actually finished fetching — wait for the row content
  // itself to change instead of racing on the page-number label.
  await expect(firstCell).not.toHaveText(firstRowFirstCellBefore ?? "", { timeout: 10_000 });
});

test("the selected file is never sent anywhere over the network", async ({ page, baseURL }) => {
  const externalRequests: string[] = [];
  const requestsWithParquetMagicInBody: string[] = [];
  const baseOrigin = baseURL ? new URL(baseURL).origin : null;

  page.on("request", (request) => {
    const url = new URL(request.url());
    if (baseOrigin && url.origin !== baseOrigin) {
      externalRequests.push(request.url());
    }
    const body = request.postDataBuffer();
    if (body && body.includes(Buffer.from("PAR1"))) {
      requestsWithParquetMagicInBody.push(request.url());
    }
  });

  await openParquetViewer(page);
  await page.locator('input[type="file"]').setInputFiles(fixture("valid-basic.parquet"));
  await expect(page.getByText("item-1", { exact: true })).toBeVisible({ timeout: 20_000 });

  // Let any stray async requests (there shouldn't be any) settle.
  await page.waitForTimeout(500);

  expect(externalRequests).toEqual([]);
  expect(requestsWithParquetMagicInBody).toEqual([]);
});

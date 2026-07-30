import path from "node:path";
import { expect, test } from "@playwright/test";

const FIXTURES_DIR = path.join(__dirname, "..", "fixtures", "spreadsheet");

function fixture(name: string): string {
  return path.join(FIXTURES_DIR, name);
}

test.describe.configure({ timeout: 60_000 });

async function selectFile(page: import("@playwright/test").Page, url: string, filePath: string) {
  await page.goto(url);
  await page.locator('input[type="file"]').setInputFiles(filePath);
}

/** Convert mode requires an explicit "Convert" click before export — unlike
 * the old one-shot converters, the app lets you review (and, in Editor
 * mode, edit) before committing to an output. */
async function clickConvert(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Convert", exact: true }).click({ timeout: 15_000 });
}

test.describe("CSV Viewer", () => {
  test("shows the parsed table, handling quotes/multiline/UTF-8/BOM correctly", async ({ page }) => {
    await selectFile(page, "/tools/csv-viewer", fixture("sample.csv"));

    await expect(page.getByText("Café", { exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("hello, world", { exact: true })).toBeVisible();
    await expect(page.getByText("🎉 Party", { exact: true })).toBeVisible();
    await expect(page.getByText("Rows", { exact: true })).toBeVisible();
    await expect(page.getByText("4", { exact: true }).first()).toBeVisible();
  });

  test("handles a larger CSV file without freezing", async ({ page }) => {
    await selectFile(page, "/tools/csv-viewer", fixture("large.csv"));
    await expect(page.getByText("50,000", { exact: true }).first()).toBeVisible({ timeout: 30_000 });
    const rowsInDom = await page.locator("tbody tr").count();
    expect(rowsInDom).toBeLessThan(100);
  });
});

test.describe("Excel Viewer", () => {
  test("lists both sheets and switches between them", async ({ page }) => {
    await selectFile(page, "/tools/excel-viewer", fixture("sample.xlsx"));

    await expect(page.getByText("Alice", { exact: true })).toBeVisible({ timeout: 15_000 });
    const sheetSelect = page.getByRole("combobox");
    await expect(sheetSelect).toBeVisible();

    await sheetSelect.selectOption("Extra");
    await expect(page.getByText("Alice", { exact: true })).not.toBeVisible();
    await expect(page.getByRole("cell", { name: "1", exact: true }).first()).toBeVisible();
  });
});

test.describe("CSV to Excel", () => {
  test("converts and offers a real .xlsx download", async ({ page }) => {
    await selectFile(page, "/convert/csv-to-excel", fixture("sample.csv"));
    await clickConvert(page);
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /download \.xlsx/i }).click({ timeout: 15_000 });
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("sample.xlsx");
  });
});

test.describe("Excel to CSV", () => {
  test("shows a sheet picker and converts the selected sheet", async ({ page }) => {
    await selectFile(page, "/convert/excel-to-csv", fixture("sample.xlsx"));
    const sheetSelect = page.getByLabel("Sheet");
    await expect(sheetSelect).toBeVisible({ timeout: 15_000 });

    await sheetSelect.selectOption("Extra");
    await clickConvert(page);
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /download \.csv/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("sample.csv");
  });
});

test.describe("CSV to JSON", () => {
  test("converts with a selectable output shape", async ({ page }) => {
    await selectFile(page, "/convert/csv-to-json", fixture("sample.csv"));
    await clickConvert(page);
    await expect(page.getByRole("button", { name: /download \.json/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/output shape/i)).toBeVisible();
    await page.getByLabel("Output shape").selectOption("array-of-arrays");
    await clickConvert(page);
    await expect(page.getByRole("button", { name: /download \.json/i })).toBeVisible();
  });
});

test.describe("JSON to CSV", () => {
  test("converts a valid array-of-objects file", async ({ page }) => {
    await selectFile(page, "/convert/json-to-csv", fixture("sample.json"));
    await clickConvert(page);
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /download \.csv/i }).click({ timeout: 15_000 });
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("sample.csv");
  });

  test("shows a friendly error for malformed JSON", async ({ page }) => {
    await selectFile(page, "/convert/json-to-csv", fixture("malformed.json"));
    await expect(page.getByRole("alert")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/never uploaded/i)).toBeVisible();
  });

  test("shows a clear, specific error for a JSON shape that can't become a table", async ({ page }) => {
    await selectFile(page, "/convert/json-to-csv", fixture("scalar.json"));
    await expect(page.getByRole("alert")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/number/i)).toBeVisible();
  });
});

test("the selected file is never sent anywhere over the network", async ({ page, baseURL }) => {
  const externalRequests: string[] = [];
  const baseOrigin = baseURL ? new URL(baseURL).origin : null;

  page.on("request", (request) => {
    const url = new URL(request.url());
    if (baseOrigin && url.origin !== baseOrigin) {
      externalRequests.push(request.url());
    }
  });

  await selectFile(page, "/convert/csv-to-excel", fixture("sample.csv"));
  await clickConvert(page);
  await expect(page.getByRole("button", { name: /download \.xlsx/i })).toBeVisible({
    timeout: 15_000,
  });
  await page.waitForTimeout(500);

  expect(externalRequests).toEqual([]);
});

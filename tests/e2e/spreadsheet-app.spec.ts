import path from "node:path";
import { expect, test } from "@playwright/test";

const FIXTURES_DIR = path.join(__dirname, "..", "fixtures", "spreadsheet");

function fixture(name: string): string {
  return path.join(FIXTURES_DIR, name);
}

test.describe.configure({ timeout: 60_000 });

test.describe("Data Studio app hub (/data-studio)", () => {
  test("the page's reading-width column stays the same width before and after a file loads — it never widens, to keep room for ads in the side margins", async ({
    page,
  }) => {
    await page.goto("/pdf-tools");
    const pdfWidth = await page
      .getByRole("heading", { level: 1 })
      .evaluate((el) => el.closest("div")!.parentElement!.getBoundingClientRect().width);

    await page.goto("/data-studio");
    const emptyWidth = await page
      .getByRole("heading", { level: 1 })
      .evaluate((el) => el.closest("div")!.parentElement!.getBoundingClientRect().width);
    expect(emptyWidth).toBe(pdfWidth);

    await page.locator('input[type="file"]').first().setInputFiles(fixture("sample.csv"));
    await expect(page.getByText("Café", { exact: true })).toBeVisible({ timeout: 15_000 });
    const loadedWidth = await page
      .getByRole("heading", { level: 1 })
      .evaluate((el) => el.closest("div")!.parentElement!.getBoundingClientRect().width);
    expect(loadedWidth).toBe(emptyWidth);
  });

  test("opens a CSV, switches through every mode, edits with undo, then converts", async ({ page }) => {
    await page.goto("/data-studio");
    await page.locator('input[type="file"]').first().setInputFiles(fixture("sample.csv"));

    // Viewer mode (the hub's default) shows the parsed table.
    await expect(page.getByRole("tab", { name: "Viewer" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByText("Café", { exact: true })).toBeVisible({ timeout: 15_000 });

    // Editor mode: applying "Remove duplicate rows" records a step and
    // enables Undo; Undo removes it again.
    await page.getByRole("tab", { name: "Editor" }).click();
    const undoButton = page.getByRole("button", { name: /undo last edit/i });
    await expect(undoButton).toBeDisabled();

    await page.getByLabel("Operation type").selectOption("removeDuplicateRows");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(undoButton).toBeEnabled();
    await expect(page.getByRole("list").getByText(/remove duplicate rows/i)).toBeVisible();

    await undoButton.click();
    await expect(undoButton).toBeDisabled();
    await expect(page.getByText(/no edits applied yet/i)).toBeVisible();

    // Analyzer mode: schema/stats table for the same loaded data, no re-drop.
    await page.getByRole("tab", { name: "Analyzer" }).click();
    await expect(page.getByRole("table").getByText("string").first()).toBeVisible();

    // Converter mode: still the same data, now exported to JSON.
    await page.getByRole("tab", { name: "Converter" }).click();
    await page.getByLabel(/output format/i).selectOption("json");
    await page.getByRole("button", { name: "Convert", exact: true }).click();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /download \.json/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("sample.json");
  });

  test("converts CSV to ODS (SheetJS write path, distinct from the default XLSX path)", async ({ page }) => {
    await page.goto("/data-studio");
    await page.locator('input[type="file"]').first().setInputFiles(fixture("sample.csv"));
    await page.getByRole("tab", { name: "Converter" }).click();
    await page.getByLabel(/output format/i).selectOption("ods");
    await page.getByRole("button", { name: "Convert", exact: true }).click();

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /download \.ods/i }).click({ timeout: 15_000 });
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("sample.ods");
  });

  test("Editor mode: typing directly into a cell (the actual 'edit it like Excel' ask) is reflected on export", async ({
    page,
  }) => {
    await page.goto("/data-studio");
    await page.locator('input[type="file"]').first().setInputFiles(fixture("sample.csv"));
    await page.getByRole("tab", { name: "Editor" }).click();

    // "name" column (x=1), first data row (y=0) — starts as "Café" in the fixture.
    const cell = page.locator('td[data-x="1"][data-y="0"]');
    await expect(cell).toBeVisible({ timeout: 15_000 });
    await cell.click();
    await page.keyboard.type("Zelda");
    await page.keyboard.press("Enter");
    await expect(cell).toHaveText("Zelda");

    // Switching modes must not lose the manual edit — it's the live,
    // authoritative table everywhere, not just inside the grid.
    await page.getByRole("tab", { name: "Converter" }).click();
    await page.getByLabel(/output format/i).selectOption("json");
    await page.getByRole("button", { name: "Convert", exact: true }).click();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /download \.json/i }).click({ timeout: 15_000 });
    const download = await downloadPromise;
    const downloadPath = await download.path();
    const content = await (await import("node:fs/promises")).readFile(downloadPath!, "utf8");
    expect(JSON.parse(content)).toContainEqual(expect.objectContaining({ name: "Zelda" }));
  });

  test("Ctrl+Z undoes a bulk operation when focus is outside the grid (e.g. right after clicking Apply), not just the grid's own native undo", async ({
    page,
  }) => {
    await page.goto("/data-studio");
    await page.locator('input[type="file"]').first().setInputFiles(fixture("sample.csv"));
    await page.getByRole("tab", { name: "Editor" }).click();
    await page.getByText("Add a bulk operation", { exact: true }).waitFor();

    await page.getByLabel("Operation type").selectOption("deleteRows");
    await page.getByPlaceholder("Row numbers, e.g. 1, 3, 5").fill("1");
    // Focus is on this button after clicking it — not inside the grid.
    await page.getByRole("button", { name: "Apply", exact: true }).click();
    await expect(page.getByText("Delete 1 row", { exact: true })).toBeVisible();
    await expect(page.getByText("Café", { exact: true })).not.toBeVisible();

    await page.keyboard.press("Control+z");
    await expect(page.getByText("Café", { exact: true })).toBeVisible();
    await expect(page.getByText("No edits applied yet.", { exact: true })).toBeVisible();
  });

  test("network privacy: opening a file and editing it in the grid never sends a request anywhere off-origin", async ({
    page,
    baseURL,
  }) => {
    const externalRequests: string[] = [];
    const baseOrigin = baseURL ? new URL(baseURL).origin : null;
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (baseOrigin && url.origin !== baseOrigin) externalRequests.push(request.url());
    });

    await page.goto("/data-studio");
    await page.locator('input[type="file"]').first().setInputFiles(fixture("sample.csv"));
    await page.getByRole("tab", { name: "Editor" }).click();

    const cell = page.locator('td[data-x="1"][data-y="0"]');
    await expect(cell).toBeVisible({ timeout: 15_000 });
    await cell.click();
    await page.keyboard.type("Zelda");
    await page.keyboard.press("Enter");
    await expect(cell).toHaveText("Zelda");

    await page.waitForTimeout(500);
    expect(externalRequests).toEqual([]);
  });

  test("Editor mode on a large (50k-row) file: shows a formatting toolbar, never overflows the page horizontally, and scrolls continuously instead of paginating", async ({
    page,
  }) => {
    await page.goto("/data-studio");
    await page.locator('input[type="file"]').first().setInputFiles(fixture("large.csv"));
    await page.getByRole("tab", { name: "Editor" }).click();
    await expect(page.locator('td[data-x="0"][data-y="0"]')).toBeVisible({ timeout: 15_000 });

    // Toolbar (bold/alignment/color/etc.) is enabled.
    await expect(page.locator(".jss_toolbar")).toBeVisible();

    // The "Add a bulk operation" side panel sits in a row *above* the
    // table, not beside it in a fixed-width sidebar column that would
    // permanently steal width from the grid — both start at the same left
    // edge, and the table gets the full container width.
    const sidePanelLeft = await page.getByText("Add a bulk operation", { exact: true }).evaluate(
      (el) => el.closest("section")!.getBoundingClientRect().left
    );
    const tableLeft = await page.locator("table.jss_worksheet").evaluate((el) => el.getBoundingClientRect().left);
    expect(Math.abs(sidePanelLeft - tableLeft)).toBeLessThan(2);

    // The page itself never scrolls sideways — only the grid's own
    // container does (tableOverflow + tableWidth: "100%").
    const overflowsPage = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 5
    );
    expect(overflowsPage).toBe(false);

    // No click-through "page X of Y" pagination for a large dataset.
    await expect(page.getByText(/page \d+ of \d+/i)).toHaveCount(0);

    // Only a small, windowed slice of 50,000 rows is ever in the DOM...
    const initialRows = await page.locator("tbody tr").count();
    expect(initialRows).toBeLessThan(500);

    // ...and scrolling the grid's own container (not the page) continuously
    // reveals different rows, proving it's virtualized scroll, not a static
    // render of just the first page.
    const firstRowBefore = await page.locator("tbody tr").first().innerText();
    await page.locator(".jss_content").evaluate((el) => {
      el.scrollTop = 30000;
    });
    await page.waitForTimeout(400);
    const firstRowAfter = await page.locator("tbody tr").first().innerText();
    expect(firstRowAfter).not.toBe(firstRowBefore);
    expect(await page.locator("tbody tr").count()).toBeLessThan(500);
  });

  test("Editor mode: toolbar icons render as real glyphs, not literal ligature text like 'format_bold'", async ({
    page,
  }) => {
    await page.goto("/data-studio");
    await page.locator('input[type="file"]').first().setInputFiles(fixture("sample.csv"));
    await page.getByRole("tab", { name: "Editor" }).click();

    const icon = page.locator(".jss_toolbar i.material-icons").first();
    await expect(icon).toBeVisible({ timeout: 15_000 });

    // The self-hosted font actually loaded and is what's rendering the icon
    // — not a fallback to the site's body font, which is the exact bug this
    // guards against (the ligature name would render as plain visible text).
    await expect(icon).toHaveCSS("font-family", '"Material Icons"');
    const fontLoaded = await page.evaluate(
      () => [...document.fonts].some((f) => f.family === "Material Icons" && f.status === "loaded")
    );
    expect(fontLoaded).toBe(true);
  });

  test("Parquet through every tab: View (SQL-paginated), Editor (materialized + editable), Convert (edit preserved), Analyzer (SQL-based stats)", async ({
    page,
  }) => {
    const parquetFixture = path.join(__dirname, "..", "fixtures", "valid-basic.parquet");

    await page.goto("/data-studio");
    await page.locator('input[type="file"]').first().setInputFiles(parquetFixture);
    await expect(page.getByText("item-1", { exact: true })).toBeVisible({ timeout: 15_000 });

    await page.getByRole("tab", { name: "Editor" }).click();
    await expect(page.locator("table.jss_worksheet")).toBeVisible({ timeout: 15_000 });
    const cell = page.locator('td[data-x="0"][data-y="0"]');
    await cell.click();
    await page.keyboard.type("EDITED-VALUE");
    await page.keyboard.press("Enter");
    await expect(cell).toHaveText("EDITED-VALUE");

    await page.getByRole("tab", { name: "Analyzer" }).click();
    await expect(page.getByText("Duplicate rows", { exact: true })).toBeVisible({ timeout: 10_000 });

    await page.getByRole("tab", { name: "Converter" }).click();
    await page.getByLabel(/output format/i).selectOption("csv");
    await page.getByRole("button", { name: "Convert", exact: true }).click();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /download \.csv/i }).click({ timeout: 15_000 });
    const download = await downloadPromise;
    const content = await (await import("node:fs/promises")).readFile((await download.path())!, "utf8");
    expect(content).toContain("EDITED-VALUE");
  });

  test("Editor mode shows a cap message (not the grid) for a Parquet file over 50,000 rows — View/Analyze/Convert stay unaffected", async ({
    page,
  }) => {
    const largeParquetFixture = path.join(__dirname, "..", "fixtures", "large.parquet");

    await page.goto("/data-studio");
    await page.locator('input[type="file"]').first().setInputFiles(largeParquetFixture);
    await expect(page.getByText("100,000", { exact: true }).first()).toBeVisible({ timeout: 20_000 });

    await page.getByRole("tab", { name: "Editor" }).click();
    await expect(page.getByText(/Editor mode supports Parquet files up to 50,000 rows/)).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.locator("table.jss_worksheet")).not.toBeVisible();
  });

  test("Converter: CSV to Parquet produces a real Parquet file (new write path), never sent anywhere over the network", async ({
    page,
    baseURL,
  }) => {
    const externalRequests: string[] = [];
    const baseOrigin = baseURL ? new URL(baseURL).origin : null;
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (baseOrigin && url.origin !== baseOrigin) externalRequests.push(request.url());
    });

    await page.goto("/data-studio");
    await page.locator('input[type="file"]').first().setInputFiles(fixture("sample.csv"));
    await page.getByRole("tab", { name: "Converter" }).click();
    await page.getByLabel(/output format/i).selectOption("parquet");
    await page.getByRole("button", { name: "Convert", exact: true }).click();
    const downloadPromise = page.waitForEvent("download", { timeout: 15_000 });
    await page.getByRole("button", { name: /download \.parquet/i }).click({ timeout: 15_000 });
    const download = await downloadPromise;
    const bytes = await (await import("node:fs/promises")).readFile((await download.path())!);
    expect(bytes.subarray(0, 4).toString("ascii")).toBe("PAR1");

    await page.waitForTimeout(500); // let any stray async requests (there shouldn't be any) settle
    expect(externalRequests).toEqual([]);
  });

  test("non-tabular JSON (mixed array shape) falls back to a tree view: no error, Edit disabled, Convert restricted to JSON/XML/YAML", async ({
    page,
  }) => {
    await page.goto("/data-studio");
    await page.locator('input[type="file"]').first().setInputFiles(fixture("mixed-shape.json"));

    await expect(page.getByText("Array(3)", { exact: true }).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[role="alert"]:not(#__next-route-announcer__)')).toHaveCount(0);

    await page.getByRole("tab", { name: "Editor" }).click();
    await expect(page.getByText(/Editing isn.t available for this file/)).toBeVisible();

    await page.getByRole("tab", { name: "Converter" }).click();
    const options = await page.getByLabel(/output format/i).locator("option").allTextContents();
    expect(options.some((o) => /CSV|Excel|Parquet/i.test(o))).toBe(false);
  });
});

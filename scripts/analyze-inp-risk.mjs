// INP-risk check: measures long tasks (>50ms main-thread blocks) triggered
// by actually using a tool — dropping a file and clicking the action button
// — not just by cold page load. This is where a real INP problem would show
// up (a synchronous handler that blocks the main thread long enough to
// delay the next paint/interaction).
import path from "node:path";
import { chromium } from "playwright-core";

const BASE = process.env.AUDIT_BASE_URL ?? "http://localhost:3100";
const FIXTURES_DIR = path.resolve(process.cwd(), "tests", "fixtures");

async function withLongTaskTracking(browser, path_, action) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.addInitScript(() => {
    window.__longTasks = [];
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) window.__longTasks.push(Math.round(entry.duration));
      }).observe({ type: "longtask", buffered: true });
    } catch {}
  });
  await page.goto(`${BASE}${path_}`, { waitUntil: "networkidle" });
  await page.evaluate(() => {
    window.__longTasks = [];
  }); // reset: only count tasks from the interaction itself
  const start = Date.now();
  await action(page);
  const wallMs = Date.now() - start;
  const longTasks = await page.evaluate(() => window.__longTasks);
  await context.close();
  return { longTasks, wallMs };
}

const browser = await chromium.launch();

console.log("=== Long tasks (>50ms main-thread blocks) during real tool use ===\n");

const cases = [
  {
    label: "PNG to JPG: drop + convert a 200x150 image",
    path: "/convert/png-to-jpg",
    action: async (page) => {
      await page.locator('input[type="file"]').setInputFiles(path.join(FIXTURES_DIR, "image", "opaque.jpg"));
      await page.getByRole("button", { name: "Convert", exact: true }).click();
      await page.getByRole("button", { name: "Download" }).first().waitFor({ timeout: 15000 });
    },
  },
  {
    label: "Compress Image: drop + convert a 3000x2000 image (large.png)",
    path: "/tools/compress-image",
    action: async (page) => {
      await page.locator('input[type="file"]').setInputFiles(path.join(FIXTURES_DIR, "image", "large.png"));
      await page.getByRole("button", { name: "Compress", exact: true }).click();
      await page.getByRole("button", { name: "Download" }).first().waitFor({ timeout: 15000 });
    },
  },
  {
    label: "CSV Viewer: open a 50k-row CSV",
    path: "/tools/csv-viewer",
    action: async (page) => {
      await page.locator('input[type="file"]').setInputFiles(path.join(FIXTURES_DIR, "spreadsheet", "large.csv"));
      await page.getByText("Rows", { exact: true }).waitFor({ timeout: 15000 });
    },
  },
  {
    label: "Parquet Viewer: open a large parquet file",
    path: "/tools/parquet-viewer",
    action: async (page) => {
      await page.locator('input[type="file"]').setInputFiles(path.join(FIXTURES_DIR, "large.parquet"));
      await page.getByText("Rows", { exact: true }).waitFor({ timeout: 20000 });
    },
  },
];

for (const { label, path: p, action } of cases) {
  try {
    const { longTasks, wallMs } = await withLongTaskTracking(browser, p, action);
    const worst = longTasks.length ? Math.max(...longTasks) : 0;
    console.log(`${label}`);
    console.log(`  wall time: ${wallMs}ms, long tasks: ${longTasks.length}, worst: ${worst}ms ${longTasks.length ? `(all: ${longTasks.join(",")}ms)` : ""}`);
  } catch (err) {
    console.log(`${label}\n  FAILED: ${err.message.split("\n")[0]}`);
  }
}

await browser.close();

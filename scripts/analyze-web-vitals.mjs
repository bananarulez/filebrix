// Real Core Web Vitals measurement (not estimated): navigates to each route
// in a fresh Chromium context and reads the actual LCP/CLS values the
// browser itself computed via PerformanceObserver, plus long-task count as
// an INP-risk proxy (a long task on the main thread during/after load is
// what turns a click into a janky one).
//
// Usage: AUDIT_BASE_URL=http://localhost:3100 node scripts/analyze-web-vitals.mjs
import { chromium } from "playwright-core";

const BASE = process.env.AUDIT_BASE_URL ?? "http://localhost:3100";

const ROUTES = [
  ["Homepage", "/"],
  ["PNG to JPG", "/convert/png-to-jpg"],
  ["JSON Formatter", "/tools/json-formatter"],
  ["CSV Viewer", "/tools/csv-viewer"],
  ["Merge PDF", "/pdf/merge"],
  ["GeoJSON Viewer", "/geo/geojson-viewer"],
];

async function measure(browser, path_) {
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.addInitScript(() => {
    window.__vitals = { lcp: 0, cls: 0, longTasks: 0, longTaskTotalMs: 0 };
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) window.__vitals.lcp = entry.startTime;
      }).observe({ type: "largest-contentful-paint", buffered: true });
    } catch {}
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) window.__vitals.cls += entry.value;
        }
      }).observe({ type: "layout-shift", buffered: true });
    } catch {}
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.__vitals.longTasks += 1;
          window.__vitals.longTaskTotalMs += entry.duration;
        }
      }).observe({ type: "longtask", buffered: true });
    } catch {}
  });

  const start = Date.now();
  await page.goto(`${BASE}${path_}`, { waitUntil: "load" });
  await page.waitForTimeout(1500); // let LCP/CLS/longtask observers settle
  const loadMs = Date.now() - start;

  const vitals = await page.evaluate(() => window.__vitals);
  await context.close();
  return { ...vitals, loadMs };
}

const browser = await chromium.launch();
console.log("Route".padEnd(20), "LCP (ms)".padEnd(10), "CLS".padEnd(8), "Long tasks".padEnd(12), "Long task ms".padEnd(14), "Full load (ms)");
console.log("-".repeat(80));
for (const [name, path_] of ROUTES) {
  const r = await measure(browser, path_);
  console.log(
    name.padEnd(20),
    String(Math.round(r.lcp)).padEnd(10),
    r.cls.toFixed(4).padEnd(8),
    String(r.longTasks).padEnd(12),
    String(Math.round(r.longTaskTotalMs)).padEnd(14),
    r.loadMs
  );
}
await browser.close();

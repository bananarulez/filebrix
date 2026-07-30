// Performance audit tooling: reports the REAL gzip-compressed JS payload a
// browser downloads for a cold visit to each route, and — for a few
// representative tools — what loads *after* dropping a real file, to prove
// heavy engines (DuckDB-WASM, pdf.js, pdf-lib, MapLibre, xlsx) load only
// when the specific tool that needs them is actually used.
//
// Chunk hashes change on every build (Turbopack content-hashes filenames),
// so this always re-derives sizes/signatures from the current .next output
// rather than hardcoding anything.
//
// Usage:
//   NEXT_PUBLIC_SITE_URL=https://example.com npm run build
//   npx next start -p 3100 &
//   AUDIT_BASE_URL=http://localhost:3100 node scripts/analyze-bundle.mjs
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { chromium } from "playwright-core";
// Signatures live in one place so this reporting script and the CI gate
// (scripts/check-bundle-budget.mjs) can't drift. The table that used to live
// here had two wrapper-matching false positives and one signature that
// matched nothing — see that module's comment.
import { detectHeavyLibs } from "./lib/heavy-libs.mjs";

const BASE = process.env.AUDIT_BASE_URL ?? "http://localhost:3100";
const CHUNKS_DIR = path.resolve(process.cwd(), ".next", "static", "chunks");
const FIXTURES_DIR = path.resolve(process.cwd(), "tests", "fixtures");

function fmtKB(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

/** Reads every chunk once, gzips it (level 9, matching `next start`'s own compression), and tags heavy ones by content signature. */
function analyzeChunksOnDisk() {
  const info = new Map(); // filename -> { raw, gzip, libs }
  for (const file of fs.readdirSync(CHUNKS_DIR)) {
    if (!file.endsWith(".js")) continue;
    const buf = fs.readFileSync(path.join(CHUNKS_DIR, file));
    const gzip = zlib.gzipSync(buf, { level: 9 }).length;
    const libs = detectHeavyLibs(buf.toString("utf8"), buf.length);
    info.set(file, { raw: buf.length, gzip, libs });
  }
  return info;
}

async function chunksForRoute(page, routePath, interact) {
  const requested = [];
  const handler = (r) => {
    if (r.url().includes("/_next/static/chunks/") && r.url().endsWith(".js")) {
      requested.push(r.url().split("/chunks/")[1]);
    }
  };
  page.on("response", handler);
  await page.goto(`${BASE}${routePath}`, { waitUntil: "networkidle" });
  const cold = [...requested];
  if (interact) {
    requested.length = 0;
    await interact(page);
    await page.waitForTimeout(1200);
  }
  page.off("response", handler);
  return { cold, afterInteraction: interact ? [...requested] : [] };
}

function summarize(files, chunkInfo) {
  const rawTotal = files.reduce((sum, f) => sum + (chunkInfo.get(f)?.raw ?? 0), 0);
  const gzipTotal = files.reduce((sum, f) => sum + (chunkInfo.get(f)?.gzip ?? 0), 0);
  const heavyLibs = new Set();
  for (const f of files) for (const lib of chunkInfo.get(f)?.libs ?? []) heavyLibs.add(lib);
  return { fileCount: files.length, rawTotal, gzipTotal, heavyLibs: [...heavyLibs] };
}

const chunkInfo = analyzeChunksOnDisk();

console.log("=== Heaviest chunks in this build (raw / gzip) ===");
const sorted = [...chunkInfo.entries()].sort((a, b) => b[1].raw - a[1].raw).slice(0, 10);
for (const [file, { raw, gzip, libs }] of sorted) {
  console.log(`  ${file.padEnd(22)} raw ${fmtKB(raw).padEnd(10)} gzip ${fmtKB(gzip).padEnd(10)} ${libs.join(", ") || "(shared/framework)"}`);
}

const browser = await chromium.launch();

console.log("\n=== Cold-visit JS payload per route (gzip, i.e. real network transfer) ===\n");
const COLD_ROUTES = [
  ["Homepage", "/"],
  ["PNG to JPG", "/convert/png-to-jpg"],
  ["JSON Formatter", "/tools/json-formatter"],
  ["UUID Generator", "/tools/uuid-generator"],
  ["CSV Viewer", "/tools/csv-viewer"],
  ["Excel to CSV", "/convert/excel-to-csv"],
  ["Parquet Viewer", "/tools/parquet-viewer"],
  ["Merge PDF", "/pdf/merge"],
  ["GeoJSON Viewer", "/geo/geojson-viewer"],
  ["Coordinate Converter", "/geo/coordinate-converter"],
];
for (const [name, routePath] of COLD_ROUTES) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const { cold } = await chunksForRoute(page, routePath);
  const s = summarize(cold, chunkInfo);
  console.log(
    `${name.padEnd(24)} ${String(s.fileCount).padEnd(3)} files   gzip ${fmtKB(s.gzipTotal).padEnd(10)} raw ${fmtKB(s.rawTotal).padEnd(10)} heavy libs: ${s.heavyLibs.join(", ") || "none"}`
  );
  await context.close();
}

console.log("\n=== On-demand loading: heavy libs load ONLY for the tool that needs them ===\n");

async function checkInteraction(label, routePath, interact) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const { cold, afterInteraction } = await chunksForRoute(page, routePath, interact);
  const coldS = summarize(cold, chunkInfo);
  const afterS = summarize(afterInteraction, chunkInfo);
  console.log(`${label}`);
  console.log(`  cold visit:        ${coldS.fileCount} files, gzip ${fmtKB(coldS.gzipTotal)}, heavy: ${coldS.heavyLibs.join(", ") || "none"}`);
  console.log(`  after interaction: ${afterS.fileCount} files, gzip ${fmtKB(afterS.gzipTotal)}, heavy: ${afterS.heavyLibs.join(", ") || "none"}`);
  await context.close();
}

await checkInteraction("PNG to JPG (drop+convert a PNG) — expect: image engine only", "/convert/png-to-jpg", async (page) => {
  await page.locator('input[type="file"]').setInputFiles(path.join(FIXTURES_DIR, "image", "transparent.png"));
  await page.getByRole("button", { name: "Convert", exact: true }).click();
});

await checkInteraction("Parquet Viewer (drop a .parquet) — expect: duckdb-wasm only", "/tools/parquet-viewer", async (page) => {
  await page.locator('input[type="file"]').setInputFiles(path.join(FIXTURES_DIR, "valid-basic.parquet"));
});

await checkInteraction("GeoJSON Viewer (drop a .geojson) — expect: maplibre-gl only", "/geo/geojson-viewer", async (page) => {
  await page.locator('input[type="file"]').setInputFiles(path.join(FIXTURES_DIR, "geo", "sample.geojson"));
});

await checkInteraction("Merge PDF (drop 2 PDFs) — expect: pdf-lib + pdfjs-dist (thumbnails)", "/pdf/merge", async (page) => {
  await page
    .locator('input[type="file"]')
    .setInputFiles([path.join(FIXTURES_DIR, "pdf", "multi-page.pdf"), path.join(FIXTURES_DIR, "pdf", "rotated-pages.pdf")]);
});

await checkInteraction(
  "CSV Viewer (drop a CSV, stay in Viewer mode) — expect: no jspreadsheet-ce",
  "/tools/csv-viewer",
  async (page) => {
    await page.locator('input[type="file"]').setInputFiles(path.join(FIXTURES_DIR, "spreadsheet", "sample.csv"));
  }
);

await checkInteraction(
  "CSV Viewer (drop a CSV, then switch to Editor mode) — expect: jspreadsheet-ce only",
  "/tools/csv-viewer",
  async (page) => {
    await page.locator('input[type="file"]').setInputFiles(path.join(FIXTURES_DIR, "spreadsheet", "sample.csv"));
    await page.getByRole("tab", { name: "Editor" }).click();
  }
);

await browser.close();

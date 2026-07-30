// Self-hosts the DuckDB-WASM engine assets under /public/duckdb so the
// browser fetches them same-origin (no jsDelivr CDN, no CSP connect-src
// relaxation needed). Only the mvp + eh bundles are copied — the coi
// (threaded) bundle needs COOP/COEP headers we don't otherwise want.
// Runs as a postinstall step; public/duckdb/ is gitignored since it's a
// derived copy of node_modules content.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");
const sourceDir = join(projectRoot, "node_modules", "@duckdb", "duckdb-wasm", "dist");
const targetDir = join(projectRoot, "public", "duckdb");

const files = [
  "duckdb-mvp.wasm",
  "duckdb-eh.wasm",
  "duckdb-browser-mvp.worker.js",
  "duckdb-browser-eh.worker.js",
];

if (!existsSync(sourceDir)) {
  console.warn(`[copy-duckdb-assets] ${sourceDir} not found — skipping (is @duckdb/duckdb-wasm installed?)`);
  process.exit(0);
}

mkdirSync(targetDir, { recursive: true });

for (const file of files) {
  const source = join(sourceDir, file);
  const target = join(targetDir, file);
  if (!existsSync(source)) {
    console.warn(`[copy-duckdb-assets] missing ${source}, skipping`);
    continue;
  }
  copyFileSync(source, target);
}

console.log(`[copy-duckdb-assets] copied ${files.length} files to ${targetDir}`);

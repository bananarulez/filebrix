// Self-hosts the pdf.js engine assets under /public/pdfjs so the browser
// fetches them same-origin (no CDN, no CSP connect-src relaxation needed) —
// the same reasoning as scripts/copy-duckdb-assets.mjs. Unlike DuckDB's
// extension binaries, every one of these files ships inside the pdfjs-dist
// npm package itself, so nothing here is a one-time external fetch; it's a
// derived copy of node_modules content, regenerated on every install and
// gitignored under /public/pdfjs/.
import { copyFileSync, cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");
const pkgDir = join(projectRoot, "node_modules", "pdfjs-dist");
const targetDir = join(projectRoot, "public", "pdfjs");

if (!existsSync(pkgDir)) {
  console.warn(`[copy-pdfjs-assets] ${pkgDir} not found — skipping (is pdfjs-dist installed?)`);
  process.exit(0);
}

mkdirSync(targetDir, { recursive: true });

// Minified worker only — the main pdf.mjs bundle is loaded via normal
// dynamic import() and bundled/optimized by Next.js; only the worker script
// (which pdf.js loads itself via `new Worker(workerSrc)`, outside webpack's
// control) needs to be a plain static file.
copyFileSync(
  join(pkgDir, "build", "pdf.worker.min.mjs"),
  join(targetDir, "pdf.worker.min.mjs")
);

for (const dir of ["cmaps", "standard_fonts", "wasm", "iccs"]) {
  const source = join(pkgDir, dir);
  if (!existsSync(source)) {
    console.warn(`[copy-pdfjs-assets] missing ${source}, skipping`);
    continue;
  }
  cpSync(source, join(targetDir, dir), { recursive: true });
}

console.log(`[copy-pdfjs-assets] copied pdf.js worker + asset directories to ${targetDir}`);

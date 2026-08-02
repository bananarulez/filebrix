// Seeds DuckDB's two engine binaries into wrangler's *local* R2 simulation.
//
// `npm run start` and the Playwright suite both serve the site through
// `wrangler dev`, which is the only faithful local server for a static export:
// it applies public/_headers, public/_redirects, the 404 page and worker/
// exactly as the deployed site does. But it also applies public/.assetsignore,
// so the two oversized .wasm files aren't served as assets locally either —
// they go through the Worker to R2, the same as in production. Without this
// seed, every Parquet test fails against an empty local bucket.
//
// This writes to .wrangler/state (gitignored), not to the real bucket. The
// `--remote` flag is what would target production; see
// scripts/upload-engine-assets.mjs for that.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BUCKET = "filebrix-engine-assets";
const FILES = ["duckdb-mvp.wasm", "duckdb-eh.wasm"];

// Invoked as `node .../wrangler.js`, never through `npx`: on Windows npx is
// `npx.cmd`, and Node has refused to execFile a .cmd without `shell: true`
// since the CVE-2024-27980 fix in 20.12.
const WRANGLER = path.join(ROOT, "node_modules", "wrangler", "bin", "wrangler.js");

for (const name of FILES) {
  const source = path.join(ROOT, "public", "duckdb", name);
  if (!existsSync(source)) {
    console.error(
      `[seed-local-r2] public/duckdb/${name} is missing — run \`npm install\` first ` +
        "(scripts/copy-duckdb-assets.mjs writes it from node_modules)."
    );
    process.exit(1);
  }

  execFileSync(
    process.execPath,
    [
      WRANGLER,
      "r2",
      "object",
      "put",
      `${BUCKET}/duckdb/${name}`,
      `--file=${source}`,
      "--content-type=application/wasm",
      "--local",
    ],
    { cwd: ROOT, stdio: "inherit" }
  );
}

console.log("[seed-local-r2] Local R2 seeded.");

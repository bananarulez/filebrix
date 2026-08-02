// Uploads DuckDB-WASM's two engine binaries to the R2 bucket that
// `app/duckdb/[file]/route.ts` serves them from.
//
// They can't ship as ordinary static assets: Cloudflare caps an individual
// asset at 25 MiB on both the Free and Paid plans, and these are ~39 MB and
// ~34 MB. `public/.assetsignore` keeps them out of the upload manifest and
// this puts them in R2 instead, at keys the route maps 1:1 to their old URLs.
//
// Run after `npm install` (which writes public/duckdb/) and any time
// @duckdb/duckdb-wasm is upgraded — the filenames aren't content-hashed, so a
// bump changes the bytes behind the same key and the cache headers in
// next.config.ts/the route allow a day before clients pick it up.
//
// Usage: npm run cf:upload-engine-assets
import { execFileSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BUCKET = "filebrix-engine-assets";
const FILES = ["duckdb-mvp.wasm", "duckdb-eh.wasm"];

/*
 * Wrangler is run as `node node_modules/wrangler/bin/wrangler.js`, not via
 * `npx`. On Windows `npx` is `npx.cmd`, and Node has refused to let
 * execFile/spawn launch a .cmd without `shell: true` since 20.12 (the fix for
 * CVE-2024-27980) — so the obvious version of this script died with EINVAL
 * before wrangler ever ran. Invoking the JS entry point with the current Node
 * binary sidesteps the shell entirely and behaves the same on every platform.
 */
const WRANGLER = path.join(ROOT, "node_modules", "wrangler", "bin", "wrangler.js");

const missing = FILES.filter((name) => !existsSync(path.join(ROOT, "public", "duckdb", name)));
if (missing.length > 0) {
  console.error(
    `[upload-engine-assets] public/duckdb/ is missing ${missing.join(", ")}.\n` +
      "  Run `npm install` first — scripts/copy-duckdb-assets.mjs writes them from node_modules."
  );
  process.exit(1);
}

for (const name of FILES) {
  const source = path.join(ROOT, "public", "duckdb", name);
  const megabytes = (statSync(source).size / 1e6).toFixed(1);
  console.log(`[upload-engine-assets] ${name} (${megabytes} MB) -> ${BUCKET}/duckdb/${name}`);

  try {
    execFileSync(
      process.execPath,
      [
        WRANGLER,
        "r2",
        "object",
        "put",
        `${BUCKET}/duckdb/${name}`,
        `--file=${source}`,
        // WebAssembly.instantiateStreaming() rejects anything else, and R2
        // stores whatever content type it's given rather than sniffing.
        "--content-type=application/wasm",
        // Without this, wrangler 4 writes to the *local* simulated bucket and
        // reports success without the deployed Worker ever seeing the file.
        "--remote",
      ],
      { cwd: ROOT, stdio: "inherit" }
    );
  } catch (error) {
    // Report what actually happened rather than guessing at a cause. An
    // earlier version asserted "this is probably a permissions problem",
    // which sent someone hunting for an API token when the real fault was
    // this script failing to spawn wrangler at all.
    console.error(`\n[upload-engine-assets] Upload of ${name} failed: ${error.message}`);
    console.error(
      "  wrangler prints the reason above. If it is an authentication or\n" +
        "  permissions error, upload both files by hand instead (R2 -> " +
        `${BUCKET} -> folder "duckdb"), which needs no CLI access at all.`
    );
    process.exit(1);
  }
}

console.log("[upload-engine-assets] Done.");

// DuckDB-WASM autoloads the `parquet` reader as a separate signed extension
// binary fetched from extensions.duckdb.org *at query time* — this is
// different from the main engine bundle (which we already self-host via
// copy-duckdb-assets.mjs). Left unhandled, our strict CSP (connect-src
// 'self') correctly blocks that fetch, and DuckDB's failure mode for a
// missing extension is not a clean error but a low-level wasm crash
// ("function signature mismatch").
//
// Fix: self-host the extension too. next.config.ts rewrites any
// /duckdb-ext/:version/:platform/parquet.duckdb_extension.wasm request (the
// path DuckDB itself constructs) to our own file, ignoring the version
// segment — so this never needs updating just because the version string
// changes. `engines/parquet/index.ts` points `custom_extension_repository`
// at /duckdb-ext.
//
// Unlike the main engine bundle, these files aren't reproducible from
// node_modules — they only exist via this one-time network fetch — so
// they're committed to the repo rather than gitignored/regenerated on
// install. Re-run this manually if @duckdb/duckdb-wasm is upgraded to a
// version built against a different DuckDB engine release (check the
// Network tab for the failed extensions.duckdb.org request to find the new
// version string).
import { mkdirSync, createWriteStream } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import https from "node:https";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");
const targetDir = join(projectRoot, "public", "duckdb-ext-files");

// Must match the DuckDB engine version compiled into the installed
// @duckdb/duckdb-wasm version (currently 1.32.0 -> DuckDB v1.4.3).
const DUCKDB_VERSION = "v1.4.3";
const PLATFORMS = ["wasm_eh", "wasm_mvp"];
const EXTENSION_NAME = "parquet";

function download(url, destPath) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`GET ${url} -> ${res.statusCode}`));
          return;
        }
        const file = createWriteStream(destPath);
        res.pipe(file);
        file.on("finish", () => file.close(() => resolve()));
      })
      .on("error", reject);
  });
}

for (const platform of PLATFORMS) {
  const dir = join(targetDir, platform);
  mkdirSync(dir, { recursive: true });
  const url = `https://extensions.duckdb.org/${DUCKDB_VERSION}/${platform}/${EXTENSION_NAME}.duckdb_extension.wasm`;
  const dest = join(dir, `${EXTENSION_NAME}.duckdb_extension.wasm`);
  console.log(`fetching ${url}`);
  await download(url, dest);
  console.log(`  -> ${dest}`);
}

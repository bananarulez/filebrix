/**
 * Generates the full EPSG search index from the `epsg-index` dev dependency.
 *
 * `epsg-index` is ~16 MB installed and is a **dev** dependency — it never
 * ships. This script trims it to the four fields the CRS picker actually
 * needs (code, name, proj4 definition, whether the unit is degrees) and
 * writes a compact positional-array JSON: ~1.2 MB raw, ~140 KB gzipped, which
 * the app then lazy-loads as its own chunk only when someone searches beyond
 * the curated quick-select list.
 *
 * Same shape as the other postinstall asset scripts (copy-duckdb-assets.mjs
 * and friends): the output is reproducible from node_modules, so it's
 * generated rather than committed.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = path.join(ROOT, "node_modules", "epsg-index", "all.json");
const OUTPUT = path.join(ROOT, "src", "engines", "geospatial", "ops", "epsgIndex.generated.json");

if (!fs.existsSync(SOURCE)) {
  console.warn("[epsg-index] not installed — skipping full CRS index generation.");
  process.exit(0);
}

const all = JSON.parse(fs.readFileSync(SOURCE, "utf8"));

/**
 * Positional arrays rather than objects: `{"code":4326,"name":...}` repeated
 * 8,000 times spends most of its bytes on repeated key names.
 * Layout: [code, name, proj4, isDegreeUnit]
 */
const rows = [];
for (const [code, entry] of Object.entries(all)) {
  // A handful of EPSG records (datums, deprecated entries) carry no proj4
  // definition at all — proj4 can't use those, so they'd be dead search hits.
  if (!entry?.proj4) continue;
  const numericCode = Number(code);
  if (!Number.isFinite(numericCode)) continue;
  rows.push([numericCode, entry.name ?? `EPSG:${code}`, entry.proj4, /degree/i.test(entry.unit ?? "") ? 1 : 0]);
}

rows.sort((a, b) => a[0] - b[0]);

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, JSON.stringify(rows), "utf8");

const bytes = fs.statSync(OUTPUT).size;
console.log(
  `[epsg-index] wrote ${rows.length.toLocaleString()} CRS definitions to ` +
    `${path.relative(ROOT, OUTPUT)} (${(bytes / 1024 / 1024).toFixed(2)} MB raw)`
);

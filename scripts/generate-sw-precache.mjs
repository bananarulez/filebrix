// Generates public/sw.js from scripts/sw-template.js, injecting a build id and
// the real precache list derived from the actual build output.
//
// Why generated rather than hand-maintained: Turbopack content-hashes every
// chunk filename on every build, so a hardcoded list would be wrong the moment
// anything changes. Deriving it from `.next` is the same principle as
// scripts/check-bundle-budget.mjs — read what actually shipped, never guess.
//
// Why the build id must live INSIDE sw.js: browsers detect a service-worker
// update by byte-comparing the worker script. If sw.js were static and only a
// side-car manifest changed, no update would ever be detected and every user
// would keep the first build they ever loaded — the exact stale-shell failure
// this design exists to prevent.
//
// Runs as part of `npm run build` (see package.json).
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const NEXT_DIR = path.join(ROOT, ".next");
const APP_DIR = path.join(NEXT_DIR, "server", "app");
const TEMPLATE = path.join(ROOT, "scripts", "sw-template.js");
const OUTPUT = path.join(ROOT, "public", "sw.js");

if (!fs.existsSync(APP_DIR)) {
  console.error("✗ No .next/server/app — run `next build` before this script.");
  process.exit(1);
}

/**
 * Every prerendered route path, e.g. "/", "/convert/png-to-jpg".
 *
 * `_`-prefixed entries are excluded: Next prerenders internal documents
 * (`_not-found`, `_global-error`) alongside real routes, and they are not
 * fetchable as ordinary URLs — `/_not-found` answers 404 and `/_global-error`
 * answers 500. Including them made `cache.addAll` reject, which is
 * all-or-nothing, so the entire install failed and `serviceWorker.ready`
 * never resolved: the whole offline feature silently did nothing.
 */
function routePaths(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) routePaths(full, out);
    else if (entry.name.endsWith(".html")) {
      const rel = path.relative(APP_DIR, full).split(path.sep).join("/").replace(/\.html$/, "");
      if (rel.split("/").some((segment) => segment.startsWith("_"))) continue;
      out.push(rel === "index" ? "/" : `/${rel}`);
    }
  }
  return out;
}

const routes = routePaths(APP_DIR).sort();

/**
 * Every emitted static asset, enumerated from disk.
 *
 * Deliberately NOT scraped out of the prerendered HTML. A first version did
 * that with `/\/_next\/static\/[^"'\s)]+/g`, which silently captured a
 * trailing backslash from JSON-escaped `\"` inside Next's own inline scripts
 * — producing 43 malformed URLs that redirected rather than 200'd, and again
 * made the all-or-nothing `cache.addAll` reject.
 *
 * Reading the directory is also strictly more correct: chunks reachable only
 * through a dynamic `import()` (every engine chunk, by design — CLAUDE.md
 * rule 4, plus the generated EPSG catalogue) appear in no document's script
 * tags at all. Scraping would cache the shell and leave every actual tool
 * broken offline.
 */
const chunks = new Set();
function collectEmitted(dir, prefix) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collectEmitted(full, `${prefix}/${entry.name}`);
    else chunks.add(`${prefix}/${entry.name}`);
  }
}
const STATIC_DIR = path.join(NEXT_DIR, "static");
for (const sub of ["chunks", "css", "media"]) {
  const full = path.join(STATIC_DIR, sub);
  if (fs.existsSync(full)) collectEmitted(full, `/_next/static/${sub}`);
}

// Small, self-hosted engine assets worth precaching outright. The large ones
// (DuckDB's 72 MB of WASM variants, pdf.js's 5 MB of cmaps/fonts) are
// deliberately left to runtime caching — see sw-template.js.
const SMALL_PUBLIC_ASSETS = [];
for (const dir of ["maplibre", "fonts"]) {
  const full = path.join(ROOT, "public", dir);
  if (!fs.existsSync(full)) continue;
  const walk = (d, prefix) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, entry.name);
      if (entry.isDirectory()) walk(p, `${prefix}/${entry.name}`);
      else SMALL_PUBLIC_ASSETS.push(`${prefix}/${entry.name}`);
    }
  };
  walk(full, `/${dir}`);
}

const precache = [...new Set([...routes, ...chunks, ...SMALL_PUBLIC_ASSETS, "/manifest.webmanifest"])].sort();

/**
 * Resolve a precache URL to the file that would serve it, or null.
 * Used by the validation below, and by the size report at the end.
 */
function fileFor(url) {
  if (url.startsWith("/_next/")) return path.join(NEXT_DIR, url.slice("/_next/".length));
  const asHtml = path.join(APP_DIR, `${url === "/" ? "index" : url.slice(1)}.html`);
  if (fs.existsSync(asHtml)) return asHtml;
  const asPublic = path.join(ROOT, "public", url.slice(1));
  return fs.existsSync(asPublic) ? asPublic : null;
}

// Validate BEFORE writing. `cache.addAll` is all-or-nothing: one URL that
// doesn't answer 200 rejects the entire install, `serviceWorker.ready` never
// resolves, and offline support silently does nothing — with no error anywhere
// a user or a test would see. Both bugs this catches (Next's `_not-found` /
// `_global-error` internals, and backslash-terminated URLs scraped out of
// escaped JSON) were real, and both were invisible until a browser hung.
// Failing the build is the only place this is cheap to notice.
const missing = precache.filter((url) => {
  const file = fileFor(url);
  return !file || !fs.existsSync(file);
});
if (missing.length > 0) {
  console.error(`✗ ${missing.length} precache URL(s) have no file on disk — refusing to write a worker that would fail to install:`);
  for (const url of missing.slice(0, 20)) console.error(`    ${url}`);
  process.exit(1);
}

// Build id = hash of exactly what we're about to precache. Two builds with
// identical output produce an identical sw.js and therefore no pointless
// update; any change to any asset changes it.
const buildId = crypto.createHash("sha256").update(precache.join("\n")).digest("hex").slice(0, 12);

const template = fs.readFileSync(TEMPLATE, "utf8");
// replaceAll, not replace: a single-occurrence replace silently substituted a
// mention of the token inside the template's own header comment and left the
// real declaration as a literal placeholder — producing a syntactically
// invalid worker that still "generated successfully".
const output = template
  .replaceAll("__BUILD_ID__", buildId)
  .replaceAll("__PRECACHE_URLS__", JSON.stringify(precache, null, 2));

if (output.includes("__BUILD_ID__") || output.includes("__PRECACHE_URLS__")) {
  console.error("✗ A placeholder survived substitution — refusing to write a broken service worker.");
  process.exit(1);
}

fs.writeFileSync(OUTPUT, output, "utf8");

const bytes = (list) =>
  list.reduce((sum, url) => {
    const file = fileFor(url);
    return file && fs.existsSync(file) ? sum + fs.statSync(file).size : sum;
  }, 0);

console.log(`✓ public/sw.js written (build ${buildId})`);
console.log(`  ${routes.length} routes, ${chunks.size} static assets, ${SMALL_PUBLIC_ASSETS.length} engine assets`);
console.log(`  ${precache.length} precached URLs, ~${(bytes(precache) / 1048576).toFixed(1)} MB raw`);
console.log(`  runtime-cached on first use: /duckdb/*, /duckdb-ext*, /pdfjs/*`);
console.log(`  never cached: *.basemaps.cartocdn.com`);

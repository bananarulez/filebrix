// Performance budget gate. Fails the build when the JS a browser downloads
// for a cold visit grows past an agreed ceiling, or when an engine-specific
// heavy library leaks out of its dynamic-import boundary (CLAUDE.md rule 4)
// into code that every page loads.
//
// Why this exists: monetization is display ads + organic search, so Core Web
// Vitals are load-bearing, and nothing else in the suite fails if someone
// adds `import * as XLSX from "xlsx"` to a shared component. tsc, lint and
// Vitest would all stay green while every page silently grew by ~400 KB.
//
// It reads the REAL build output, never source imports — the point is what
// actually ships. Every route is prerendered to HTML, so each route's script
// tags are the truthful record of its cold-load chunk set; the shared set is
// their intersection. Turbopack content-hashes chunk filenames on every
// build, so nothing here hardcodes a name.
//
// Usage:
//   NEXT_PUBLIC_SITE_URL=https://example.com npm run build
//   node scripts/check-bundle-budget.mjs            # gate: exits 1 on violation
//   node scripts/check-bundle-budget.mjs --report   # measure only, always exits 0
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { detectHeavyLibs } from "./lib/heavy-libs.mjs";

// ---------------------------------------------------------------------------
// Budgets. Measured on the 2026-07-30 build (see PROJECT_LOG.md entry 34) and
// set with modest headroom — tight enough to catch an accidental heavy import,
// loose enough that ordinary feature work doesn't trip it. Raising either
// number is a deliberate decision to ship a slower site: measure with
// `--report`, then change it here in the same commit that justifies it.
// ---------------------------------------------------------------------------
const SHARED_GZIP_BUDGET_KB = 210; // measured 181.5 KB — the chunks EVERY route loads (~16% headroom)
const CANARY_GZIP_BUDGET_KB = 250; // measured 217.1 KB worst canary (homepage) — full cold load (~15% headroom)

// Routes that must never pull in an engine library, because nothing on them
// needs one. These are the canaries: a heavy library escaping its boundary
// shows up here first, whether it lands in a shared chunk or a page chunk.
const CANARY_ROUTES = [
  "/", // homepage — Universal File Drop only detects, never processes
  "/tools/uuid-generator", // pure crypto.randomUUID(), no engine at all
  "/tools/word-counter", // pure string stats
  "/developer-tools", // an index page: links only
];

const NEXT_DIR = path.resolve(process.cwd(), ".next");
const APP_DIR = path.join(NEXT_DIR, "server", "app");
const reportOnly = process.argv.includes("--report");

function fail(message) {
  console.error(`\n✗ ${message}`);
  process.exitCode = 1;
}

if (!fs.existsSync(APP_DIR)) {
  console.error(
    "✗ No .next/server/app found. Run a production build first:\n" +
      "    NEXT_PUBLIC_SITE_URL=https://example.com npm run build"
  );
  process.exit(1);
}

/** Every prerendered route's HTML file. */
function findHtmlFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) findHtmlFiles(full, out);
    else if (entry.name.endsWith(".html")) out.push(full);
  }
  return out;
}

function routeNameFor(htmlFile) {
  const rel = path.relative(APP_DIR, htmlFile).split(path.sep).join("/");
  const withoutExt = rel.replace(/\.html$/, "");
  return withoutExt === "index" ? "/" : `/${withoutExt}`;
}

const gzipCache = new Map();
function gzipSizeOf(chunk) {
  if (gzipCache.has(chunk)) return gzipCache.get(chunk);
  const full = path.join(NEXT_DIR, chunk);
  const size = fs.existsSync(full) ? zlib.gzipSync(fs.readFileSync(full), { level: 9 }).length : 0;
  gzipCache.set(chunk, size);
  return size;
}

const libsCache = new Map();
/** Heavy libraries inside one chunk, size-gated (see MIN_HEAVY_CHUNK_BYTES). */
function libsOf(chunk) {
  if (libsCache.has(chunk)) return libsCache.get(chunk);
  const full = path.join(NEXT_DIR, chunk);
  const libs = fs.existsSync(full)
    ? detectHeavyLibs(fs.readFileSync(full, "utf8"), fs.statSync(full).size)
    : [];
  libsCache.set(chunk, libs);
  return libs;
}

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;
const totalGzip = (chunks) => chunks.reduce((sum, c) => sum + gzipSizeOf(c), 0);

/** Heavy libraries present anywhere in a set of chunks, mapped to the chunk carrying them. */
function heavyLibsIn(chunks) {
  const found = new Map(); // lib name -> chunk filename
  for (const chunk of chunks) {
    for (const lib of libsOf(chunk)) {
      if (!found.has(lib)) found.set(lib, chunk);
    }
  }
  return found;
}

// --- Collect routes -> cold-load chunk sets -------------------------------
const routes = findHtmlFiles(APP_DIR).map((file) => ({
  route: routeNameFor(file),
  chunks: [...new Set(fs.readFileSync(file, "utf8").match(/static\/chunks\/[A-Za-z0-9_.-]+\.js/g) ?? [])],
}));

if (routes.length === 0) {
  console.error("✗ No prerendered routes found under .next/server/app — did the build succeed?");
  process.exit(1);
}

// The set every single route loads. Intersection of real script tags, not a
// manifest field, so it stays correct if Next changes its manifest shape.
const sharedChunks = routes
  .map((r) => r.chunks)
  .reduce((acc, chunks) => acc.filter((c) => chunks.includes(c)));

const sharedGzip = totalGzip(sharedChunks);

console.log(`Analyzed ${routes.length} prerendered routes.\n`);
console.log(`Shared by ALL routes: ${sharedChunks.length} chunks, ${kb(sharedGzip)} gzip`);
console.log(`  budget ${SHARED_GZIP_BUDGET_KB} KB — ${kb(SHARED_GZIP_BUDGET_KB * 1024 - sharedGzip)} headroom\n`);

console.log("Canary routes (must stay engine-free):");
const canaryRows = [];
for (const route of CANARY_ROUTES) {
  const match = routes.find((r) => r.route === route);
  if (!match) {
    fail(`Canary route ${route} was not prerendered — it may have been renamed or deleted. Update CANARY_ROUTES.`);
    continue;
  }
  const gzip = totalGzip(match.chunks);
  canaryRows.push({ route, gzip, chunks: match.chunks });
  console.log(`  ${route.padEnd(26)} ${String(match.chunks.length).padStart(3)} chunks  ${kb(gzip).padStart(9)} gzip`);
}
console.log();

if (reportOnly) {
  const heaviest = [...routes].sort((a, b) => totalGzip(b.chunks) - totalGzip(a.chunks)).slice(0, 8);
  console.log("Heaviest routes (report mode only, not budgeted):");
  for (const r of heaviest) {
    const libs = [...heavyLibsIn(r.chunks).keys()];
    console.log(`  ${r.route.padEnd(34)} ${kb(totalGzip(r.chunks)).padStart(9)}  ${libs.join(", ") || "no heavy libs"}`);
  }
  console.log("\n(--report: measurement only, no gate applied)");
  process.exit(0);
}

// --- Gate 1: shared bundle size -------------------------------------------
if (sharedGzip > SHARED_GZIP_BUDGET_KB * 1024) {
  fail(
    `Shared JS is ${kb(sharedGzip)} gzip, over the ${SHARED_GZIP_BUDGET_KB} KB budget.\n` +
      `  Every route pays this. Find what grew with:  node scripts/check-bundle-budget.mjs --report\n` +
      `  If the growth is genuinely necessary, raise SHARED_GZIP_BUDGET_KB in this file and say why in the commit.`
  );
}

// --- Gate 2: per-canary cold-load size ------------------------------------
for (const { route, gzip } of canaryRows) {
  if (gzip > CANARY_GZIP_BUDGET_KB * 1024) {
    fail(
      `${route} cold-loads ${kb(gzip)} gzip, over the ${CANARY_GZIP_BUDGET_KB} KB budget.\n` +
        `  This route should be near-empty of application logic.`
    );
  }
}

// --- Gate 3: the lazy-load boundary (CLAUDE.md rule 4) --------------------
const sharedHeavy = heavyLibsIn(sharedChunks);
if (sharedHeavy.size > 0) {
  for (const [lib, chunk] of sharedHeavy) {
    fail(
      `"${lib}" is in ${chunk}, which EVERY route loads.\n` +
        `  Engine libraries must stay behind a dynamic import() inside src/engines/* (CLAUDE.md rule 4).\n` +
        `  Look for a top-level \`import\` of it in shared UI or a page's module scope.`
    );
  }
}

for (const { route, chunks } of canaryRows) {
  for (const [lib, chunk] of heavyLibsIn(chunks)) {
    if (sharedHeavy.has(lib)) continue; // already reported above
    fail(
      `"${lib}" is loaded by ${route} (in ${chunk}), which needs no engine at all.\n` +
        `  It escaped its dynamic-import boundary (CLAUDE.md rule 4).`
    );
  }
}

if (process.exitCode === 1) {
  console.error("\nBundle budget check FAILED.\n");
} else {
  console.log("✓ Bundle budget check passed: size within budget, no heavy library outside its lazy boundary.\n");
}

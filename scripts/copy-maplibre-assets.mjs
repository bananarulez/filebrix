// Self-hosts maplibre-gl's own internal worker script under /public/maplibre
// so the browser fetches it same-origin — same reasoning as
// scripts/copy-pdfjs-assets.mjs and copy-duckdb-assets.mjs. Ships inside the
// maplibre-gl npm package itself, so this is a derived copy of node_modules
// content, regenerated on every install and gitignored.
//
// Why this is needed (confirmed empirically, not assumed): maplibre-gl
// computes its worker URL as `new URL("./maplibre-gl-worker.mjs",
// import.meta.url)` — relying on `import.meta.url` pointing at wherever its
// own module file physically lives. Under Next.js/Turbopack's dev bundling,
// that module is served from a hashed chunk URL with no real
// "maplibre-gl-worker.mjs" sibling, so the computed URL never resolves to a
// real file. The failure is silent: no thrown error, no failed network
// request (the guard `if (!/^https?:/.test(url)) return ""` inside
// maplibre-gl's own `getWorkerUrl()` short-circuits before any fetch is even
// attempted) — the GeoJSON source's `_workerID` simply never gets set, so it
// never finishes loading and nothing on it ever renders, while the raster
// basemap (which doesn't need this worker) renders fine. This is why the
// bug looked like "the map works" (basemap visible) while GeoJSON data
// silently never appeared. See engines/geospatial/map/maplibreClient.ts,
// which calls the library's own public `setWorkerUrl()` to point at this
// self-hosted copy instead of relying on that broken auto-discovery.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");
const pkgDir = join(projectRoot, "node_modules", "maplibre-gl", "dist");
const targetDir = join(projectRoot, "public", "maplibre");

if (!existsSync(pkgDir)) {
  console.warn(`[copy-maplibre-assets] ${pkgDir} not found — skipping (is maplibre-gl installed?)`);
  process.exit(0);
}

mkdirSync(targetDir, { recursive: true });

// maplibre-gl-worker.mjs has its own `import ... from "./maplibre-gl-shared.mjs"`
// (common code shared between the main-thread and worker bundles) —
// resolved as a literal relative URL at runtime, since the worker script is
// loaded directly by the browser, not processed by Next.js/Turbopack. Both
// files must live side by side here or the worker fails to load with no
// error surfaced anywhere except a silently-aborted network request for
// the missing sibling — confirmed empirically.
for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  copyFileSync(join(pkgDir, file), join(targetDir, file));
}

console.log(`[copy-maplibre-assets] copied maplibre-gl-worker.mjs + maplibre-gl-shared.mjs to ${targetDir}`);

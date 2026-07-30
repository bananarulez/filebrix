// Content signatures identifying an engine-specific heavy library inside a
// built chunk. Shared by scripts/analyze-bundle.mjs (which reports) and
// scripts/check-bundle-budget.mjs (which fails CI) so the two can't drift —
// same reason the registry is the single source of truth for tools.
//
// These match the *built* chunk text, never source imports, because the thing
// worth guarding is what actually ships. Turbopack content-hashes chunk
// filenames on every build, so nothing here may hardcode one.
//
// **Every signature must match the library itself and NOT our wrapper around
// it.** This is the trap: `engines/parquet/index.ts` compiles to a chunk
// containing `new t.AsyncDuckDB(...)` where `t` is the dynamically-imported
// namespace, and `map/maplibreClient.ts` contains the literal string
// "/maplibre/maplibre-gl-worker.mjs" it passes to setWorkerUrl(). A naive
// /AsyncDuckDB/ or /maplibre-gl-worker/ signature therefore matches the
// correctly-lazy wrapper and reports a violation that isn't real — which for
// a CI gate is worse than no check, since the fix is to disable it. Both
// signatures below were re-derived by diffing the real library chunk against
// its wrapper chunk (PROJECT_LOG.md entry 34); /compressedSize/ likewise
// replaced a jszip signature that matched *zero* chunks, i.e. would never
// have caught anything.
//
// MIN_HEAVY_CHUNK_BYTES is defense in depth on top of that: a "heavy library"
// is by definition large, so a small chunk merely referencing one is not what
// this guards against.
export const MIN_HEAVY_CHUNK_BYTES = 40_000;

// The curated in-bundle CRS registry (crsRegistry.ts, ~25 definitions —
// deliberately eager, see CLAUDE.md's two-layer CRS note) contains the same
// `+proj=` token as the ~7,760-entry generated catalogue that must stay lazy,
// so this one needs a count rather than a presence check.
const EPSG_FULL_INDEX_MIN_PROJ_DEFS = 500;

export const HEAVY_LIB_SIGNATURES = [
  { name: "maplibre-gl", test: (t) => /maplibre-gl-shared|RasterTileSource/.test(t) },
  { name: "duckdb-wasm", test: (t) => /getJsDelivrBundles|DuckDBAccessMode/.test(t) },
  { name: "pdfjs-dist", test: (t) => /pdfjs-dist\/build\/pdf\.mjs/.test(t) },
  { name: "pdf-lib", test: (t) => /\bpdf-lib\b/.test(t) },
  { name: "xlsx (SheetJS)", test: (t) => /SheetJS/.test(t) },
  { name: "jszip", test: (t) => /compressedSize/.test(t) },
  { name: "exifr", test: (t) => /GPSLatitudeRef|makerNote/.test(t) },
  { name: "jspreadsheet-ce", test: (t) => /jss_worksheet|bossanova\.uk\/jspreadsheet/.test(t) },
  {
    name: "epsg-index (generated catalogue)",
    test: (t) => (t.match(/\+proj=/g)?.length ?? 0) >= EPSG_FULL_INDEX_MIN_PROJ_DEFS,
  },
];

/**
 * Names of every heavy library whose signature appears in `text`.
 * `byteLength` (the chunk's raw size) gates the MIN_HEAVY_CHUNK_BYTES floor;
 * omit it to signature-check regardless of size.
 */
export function detectHeavyLibs(text, byteLength = Infinity) {
  if (byteLength < MIN_HEAVY_CHUNK_BYTES) return [];
  return HEAVY_LIB_SIGNATURES.filter((sig) => sig.test(text)).map((sig) => sig.name);
}

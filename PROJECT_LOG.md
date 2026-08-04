# Project Log — Universal Local File Toolbox

A running record of what's been built, why, and where the implementation
diverged from (or made a judgment call beyond) what was explicitly asked.
Read this to get oriented without re-reading every file. For the
day-to-day engineering *rules*, see `CLAUDE.md`. For the product spec, see
`README.txt`.

---

## 1. What this project is

A Next.js site offering many small, focused file tools (convert/view/edit)
that run **entirely in the browser** — no upload, no backend file
processing, no third-party file transmission, ever. Monetized later via
display ads; acquisition is organic search. Full spec in `README.txt`.

## 2. Where things stand

Seven phases done so far:

1. **Foundation** — registry, engine/worker infra, shared UI, homepage, 6
   category pages. No tools yet.
2. **UI polish pass** — filled the one missing shared piece
   (`ToolPageLayout`) and tightened header/footer navigation.
3. **Parquet Viewer** (`/tools/parquet-viewer`) — the first real tool, fully
   working, tested, and verified to never transmit the opened file anywhere.
4. **Spreadsheet & Structured Data engine + 6 tools** — `csv-viewer`,
   `excel-viewer`, `csv-to-excel`, `excel-to-csv`, `csv-to-json`,
   `json-to-csv`. First engine to actually use the Comlink `workerClient.ts`
   pattern built in the foundation pass (Parquet was the exception).
5. **Structured Data expansion: 10 more tools on the same engine** —
   `csv-to-xml`, `xml-to-csv`, `json-formatter`, `json-minifier`,
   `xml-formatter`, `xml-validator`, `json-to-xml`, `xml-to-json`,
   `json-to-yaml`, `yaml-to-json`. First tools that are paste-first (not
   drop-a-file-first) and the first with a hard security mandate (safe XML
   parsing) rather than just a data-shape one — populates `/developer-tools`,
   empty since the foundation pass.
6. **PDF engine + 11 tools** — `merge`, `split`, `rotate`, `extract-pages`,
   `delete-pages`, `reorder-pages`, `metadata-viewer`, `remove-metadata`
   (`/pdf/*`), `images-to-pdf`, `pdf-to-images`, `pdf-to-txt` (`/convert/*`).
   First engine built on two libraries with genuinely different execution
   models (pdf-lib in a real Comlink worker; pdf.js main-thread, owning its
   own internal worker), first with page-thumbnail UI, and first with a
   uniform "treat this whole class of input as unsupported" security
   decision (encrypted PDFs) rather than a per-field validation rule —
   populates `/pdf-tools`, empty since the foundation pass.
7. **Image engine + 13 tools** — `png-to-jpg`, `jpg-to-png`, `webp-to-jpg`,
   `jpg-to-webp`, `png-to-webp`, `webp-to-png`, `svg-to-png` (`/convert/*`),
   `resize-image`, `compress-image`, `rotate-image`, `flip-image`,
   `remove-image-metadata`, `image-metadata-viewer` (`/tools/*`). First
   engine needing **no third-party library at all** for its core pipeline
   — native Canvas/`OffscreenCanvas`/`createImageBitmap` running entirely
   inside a Comlink worker we wrote handle every format conversion, resize,
   rotate, flip, and compression operation; the one new dependency
   (`exifr`) is small and single-purpose (EXIF field display only).
   First engine with a genuinely thinner unit-test layer than any prior
   round, since nearly the whole pipeline touches `canvas` — populates
   `/image-tools`, empty since the foundation pass.

`registry/index.ts#tools` now has 41 entries total.

---

## 3. Architecture, as actually built

```
src/
  app/
    layout.tsx, page.tsx            — root shell + homepage
    {spreadsheet,data,pdf,image,geospatial,developer}-tools/page.tsx
                                     — 6 category pages, one static folder each
    tools/parquet-viewer/
      page.tsx                      — SEO/metadata/layout wiring (server component)
      ParquetViewerTool.tsx         — the interactive tool itself (client component)
    tools/{csv-viewer,excel-viewer}/page.tsx
    convert/{csv-to-excel,excel-to-csv,csv-to-json,json-to-csv,csv-to-xml,xml-to-csv}/page.tsx
                                     — thin wrappers rendering the shared spreadsheet components
    tools/{json-formatter,json-minifier,xml-formatter,xml-validator}/
      page.tsx + <Name>Tool.tsx      — 4 paste-first developer utility tools
    convert/{json-to-xml,xml-to-json,json-to-yaml,yaml-to-json}/
      page.tsx + <Name>Tool.tsx      — 4 paste-first developer conversion tools
    pdf/{merge,extract-pages,delete-pages,reorder-pages,rotate}/
      page.tsx + <Name>PageTool.tsx  — 5 tools, all rendering
                                        PdfPageWorkspaceTool with a different mode prop
    pdf/split/page.tsx + SplitPdfPageTool.tsx
    pdf/{metadata-viewer,remove-metadata}/
      page.tsx + <Name>PageTool.tsx  — both render PdfMetadataTool with a different mode prop
    convert/images-to-pdf/page.tsx   — renders ImagesToPdfTool directly (no colocated
    convert/pdf-to-images/page.tsx     wrapper — no function-prop crosses the
    convert/pdf-to-txt/page.tsx        server/client boundary, same as csv-to-xml/xml-to-csv)
    convert/{png-to-jpg,jpg-to-png,webp-to-jpg,jpg-to-webp,png-to-webp,webp-to-png}/
      page.tsx + <Name>PageTool.tsx  — 6 tools, all rendering ImageConvertTool
                                        with a different sourceFormat/targetFormat pair
    convert/svg-to-png/page.tsx      — renders SvgToPngTool directly (no colocated wrapper)
    tools/{resize-image,compress-image,rotate-image,flip-image}/
      page.tsx + <Name>PageTool.tsx  — 4 tools, all rendering ImageTransformTool
                                        with a different mode prop
    tools/{remove-image-metadata,image-metadata-viewer}/
      page.tsx + <Name>PageTool.tsx  — both render ImageMetadataTool with a different mode prop
    sitemap.ts, robots.ts
    (no app/api — intentionally empty, see rule 1 in CLAUDE.md)

  registry/
    types.ts       — ToolDefinition, FileFormat, Engine, RouteGroup, etc.
    index.ts        — tools[] array + lookup helpers (getToolBySlug, searchTools, ...)
    matrix.ts        — conversion capability matrix, derived from tools[]
    categories.ts    — the 6 fixed categories (slug/name/engine/description)
    tools/           — 41 registered ToolDefinitions, one file each
      README.md      — convention notes for adding more

  engines/
    shared/
      types.ts        — ToolProcessor/ProcessingResult/Progress (for engines that own a worker.ts)
      workerClient.ts  — generic Comlink wrapper (createEngineWorker/exposeEngine)
    parquet/
      types.ts   — ParquetSummary/ParquetColumn/GetPageParams/PreviewPage/ParquetSession
      index.ts   — DuckDB-WASM integration (does NOT use workerClient.ts — see §6)
    spreadsheet/
      types.ts        — CellValue/NormalizedTable/SheetInfo/WorkbookInfo/JsonShape
      normalize.ts     — buildNormalizedTable, shared by CSV/XLSX/JSON-array-of-arrays
      parsers/{csv,xlsx,json}.ts, serializers/{csv,xlsx,json}.ts
                        — pure functions, no File/Worker — really unit-tested (see §7)
      worker.ts        — thin File/bytes-IO adapter + exposeEngine() (runs Papa Parse/SheetJS)
      index.ts         — public API: lazy createEngineWorker() singleton + typed proxies
      xmlNames.ts       — sanitizeXmlElementName(), shared by the tabular and
                          hierarchical XML paths below
      xmlTable.ts       — tabular XML<->NormalizedTable (CSV<->XML); main-thread only
      format/json.ts, format/xml.ts
                        — format/minify/validate, preserve-the-value (not
                          tabularize), main-thread only (§8)
      convert/jsonXml.ts, convert/jsonYaml.ts
                        — hierarchical JSON<->XML and JSON<->YAML value
                          conversion, main-thread only (§8)
    pdf/
      types.ts          — PageRef/PdfDocumentInfo/PdfPageInfo/PdfMetadataInfo/PdfImageFormat
      structural/        — pdf-lib, no DOM dependency, runs in a real Comlink worker (§9)
        load.ts           — loadPdfDocument(): the one choke point every
                            structural op goes through; encrypted-PDF detection lives here
        inspect.ts, pages.ts, imagesToPdf.ts, metadata.ts
                          — inspectPdf, buildPdfFromSelection (the one
                            primitive behind merge/extract/delete/reorder/
                            rotate/split), buildPdfFromImages, read/removePdfMetadata
      worker.ts          — thin File/bytes-IO adapter + exposeEngine(), same pattern as spreadsheet/worker.ts
      index.ts           — public API: lazy createEngineWorker() singleton + typed proxies
      render/            — pdf.js, needs canvas/document, main-thread only, owns its own internal worker (§9)
        pdfjsClient.ts     — lazy import("pdfjs-dist"), self-hosted worker/cmap/font/wasm/icc URLs
        thumbnail.ts, rasterize.ts, extractText.ts, session.ts
                          — low-res thumbnail render, full-res page rasterize
                            (PDF→Images), text extraction (PDF→TXT),
                            and a session wrapper that opens a pdf.js
                            document once and reuses it across all three
    image/
      types.ts          — RasterFormat/FlipAxis/ImageProcessOptions/ImageDimensions
      transform/dimensions.ts, transform/mime.ts
                          — pure math (aspect-locked resize, rotation-swapped
                            dimensions) and format/mime/extension lookups —
                            the only genuinely unit-testable part of this engine (§10)
      pipeline.ts        — processImage(): decode (createImageBitmap, EXIF
                            orientation auto-applied) → rotate/flip → resize
                            → encode (convertToBlob); no DOM dependency, so
                            it runs in a real Comlink worker, same as
                            spreadsheet/worker.ts — no split needed here,
                            unlike PDF (§10)
      worker.ts          — thin File/bytes-IO adapter + exposeEngine()
      index.ts           — public API: lazy createEngineWorker() singleton + typed proxies
      render/svgToPng.ts — main-thread only: `createImageBitmap` can't decode
                            SVG blobs directly, so this uses a real `<img>`
                            element, sanitized first via sanitizeSvg() (§10)
      render/metadata.ts — main-thread, dynamic `import("exifr")`: reads a
                            curated EXIF field subset for the Metadata Viewer

  components/
    tools/        — FileDropZone, LocalProcessingBadge, FileInfo, FileTypeBadge,
                    ProcessingProgress, ProcessingStatus, ErrorPanel, DownloadResult,
                    RelatedTools, ToolInstructions, FAQ, AdSlot, ToolSearch,
                    UniversalFileDrop, DataPreview, VirtualizedTable
    spreadsheet/SpreadsheetViewerTool.tsx, SpreadsheetConverterTool.tsx
                    — shared, parameterized interactives; SpreadsheetConverterTool's
                      SpreadsheetFormat now includes "xml" too
    text-tools/TextTransformTool.tsx
                    — shared paste-first interactive (textarea + Open file +
                      Copy + Download), powers 8 of the 10 §8 tools
    pdf/PdfThumbnail.tsx           — lazy (IntersectionObserver) low-res page
                      thumbnail, aspect-ratio-correct placeholder, reused everywhere below
    pdf/PdfPageWorkspaceTool.tsx   — mode: "merge"|"extract"|"delete"|"reorder"|"rotate";
                      one component powering 5 of the 8 /pdf/* tools (§9)
    pdf/PdfSplitTool.tsx, ImagesToPdfTool.tsx, PdfToImagesTool.tsx,
        PdfToTextTool.tsx, PdfMetadataTool.tsx (mode: "view"|"remove")
                    — the other 6 PDF tools, one component each (or, for
                      metadata, one component for both view/remove)
    image/ImageBatchList.tsx      — shared batch UI (per-item thumbnail/
                      status/download + "download all as .zip"), reused by
                      every other image component below; callers must key it
                      by batch identity (batchKey() helper) rather than let
                      it react to prop changes internally (§10)
    image/ImageConvertTool.tsx    — sourceFormat/targetFormat props, powers
                      the 6 raster-to-raster conversions
    image/SvgToPngTool.tsx        — dedicated (main-thread SVG decode path)
    image/ImageTransformTool.tsx  — mode: "resize"|"compress"|"rotate"|"flip",
                      powers 4 tools
    image/ImageMetadataTool.tsx   — mode: "view"|"remove", powers 2 tools
    tool-page/ToolPageLayout.tsx   — shared shell every tool page renders into
    category/CategoryPage.tsx      — shared shell every category page renders into
    layout/SiteHeader.tsx, SiteFooter.tsx
    seo/StructuredData.tsx

  lib/
    detect/       — detectFile.ts (magic bytes + content sniff + extension fallback),
                    signatures.ts (the byte tables, incl. Parquet's PAR1 magic)
    seo/          — metadata.ts (buildToolMetadata/buildCategoryMetadata),
                    structuredData.ts (JSON-LD builders)
    analytics/    — events.ts (closed event-payload union), index.ts (track()/provider)
    security/     — sanitize.ts (DOMPurify wrapper: sanitizeHtml() for
                    general HTML, sanitizeSvg() for the SVG-specific
                    USE_PROFILES config — see §10), filenames.ts (safe download names)
    errors/       — ProcessingError.ts (typed, worker-boundary-serializable)
    format/bytes.ts — formatBytes(), extracted so FileInfo and the spreadsheet
                    components don't each keep their own copy
    format/deriveOutputFilename.ts — extracted from SpreadsheetConverterTool
                    once TextTransformTool needed the same logic

scripts/
  copy-duckdb-assets.mjs           — postinstall: copies DuckDB-WASM's own mvp/eh
                                      .wasm + .worker.js from node_modules into public/duckdb/
  fetch-duckdb-extensions.mjs      — one-time, NOT wired to postinstall: fetches the
                                      parquet extension binary (see §6) into
                                      public/duckdb-ext-files/
  generate-parquet-fixtures.py     — dev-only (pandas/pyarrow), generates tests/fixtures/*.parquet
  generate-spreadsheet-fixtures.mjs — dev-only (uses our own installed xlsx package),
                                      generates tests/fixtures/spreadsheet/* (incl. sample.xml)
  copy-pdfjs-assets.mjs            — postinstall: copies pdf.js's worker script +
                                      cmaps/standard_fonts/wasm/iccs directories from
                                      node_modules into public/pdfjs/ (same pattern as duckdb)
  generate-pdf-fixtures.mjs        — dev-only (uses our own installed pdf-lib),
                                      generates tests/fixtures/pdf/*.pdf (multi-page,
                                      rotated, mixed-sizes, large, scanned, malformed, empty)
                                      + two image fixtures via Python/Pillow
  generate-encrypted-pdf-fixture.py — dev-only, one-time (pdf-lib can't write encrypted
                                      PDFs; uses Python's pypdf instead), generates
                                      tests/fixtures/pdf/encrypted.pdf
  generate-image-fixtures.py       — dev-only (Pillow + piexif), generates
                                      tests/fixtures/image/*.{png,jpg,webp} incl. a
                                      transparent PNG, an EXIF-orientation-6 JPEG,
                                      a 3000x2000 "large" PNG, and a truncated/malformed
                                      JPEG (SVG fixtures are hand-written text files instead)

tests/
  unit/        — Vitest, pure logic (registry, matrix, detectFile, sanitize,
                filenames, ProcessingError, workerClient round-trip via
                MessageChannel, parquetEngine SQL-safety helpers; real,
                unmocked spreadsheet normalize/csv/xlsx/json parsing+serializing;
                and — also real, unmocked, jsdom's DOMParser turned out to
                support this fully — JSON/XML format+validate, JSON<->XML,
                JSON<->YAML, tabular XML<->table, and a dedicated XML
                security block: XXE, billion-laughs, script-injection-shaped input;
                pdfStructural.test.ts — real, unmocked pdf-lib calls against
                real fixtures: inspect/merge/extract/reorder/rotate,
                images-to-pdf, metadata read/remove, and the encrypted- and
                malformed-PDF error paths; imageTransformMath.test.ts — the
                one genuinely unit-testable slice of the Image engine:
                aspect-locked resize math, rotation-swapped dimensions,
                format/mime/extension lookups)
  component/   — Vitest + RTL (FileDropZone, ErrorPanel, ToolPageLayout,
                ParquetViewerTool + SpreadsheetViewerTool/SpreadsheetConverterTool
                + TextTransformTool + all 6 PDF components + all 5 Image
                components, engines mocked; IntersectionObserver stubbed
                globally in setupTests.ts for PdfThumbnail, jszip's default
                export mocked as a constructor function — not an arrow
                function, `new` on an arrow fn throws; `createImageBitmap`
                stubbed globally where ImageTransformTool's resize mode
                probes real dimensions, since jsdom has no canvas)
  e2e/         — Playwright against a production build (homepage smoke test,
                5 parquet-viewer tests, 10 spreadsheet-tools tests, 13
                structured-data-tools tests incl. a real XXE payload and a
                billion-laughs payload run through actual Chromium; 18
                pdf-tools tests covering all 11 pages plus encrypted/
                malformed/mixed-page-size/60-page/network-privacy cases; 23
                image-tools tests covering all 13 pages plus a real
                pixel-level transparency check and a real EXIF-orientation
                check — both decode the actual downloaded output back
                in-browser via a data URL + canvas rather than trusting the
                UI alone, see §10 — plus SVG script/external-reference
                security, malformed-file, and large-image cases)
  fixtures/    — the 4 generated .parquet files (valid/empty/malformed/large);
                fixtures/spreadsheet/ — csv/xlsx/json/xml fixtures incl. quoted/
                multiline/UTF-8/BOM CSV, a 2-sheet XLSX, a tabular XML sample,
                and a 50k-row CSV; fixtures/pdf/ — multi-page, rotated-pages,
                mixed-sizes, large (60pp), scanned (no text), malformed,
                empty, and encrypted PDFs, plus 2 sample images;
                fixtures/image/ — a transparent PNG, an opaque JPEG, a WebP,
                an EXIF-orientation-6 JPEG, a 3000x2000 "large" PNG, a
                truncated/malformed JPEG, and 4 hand-written SVGs (normal,
                script-payload, external-ref, malformed/non-SVG-text)
  helpers/toolFactory.ts — makeTool() mock-ToolDefinition factory for tests
```

---

## 4. Foundation phase — key decisions

- **Registry-driven, not hand-maintained lists.** `registry/index.ts#tools`
  is the single source of truth; the conversion matrix, sitemap, category
  pages, and related-tools links are all *derived* from it.
- **`createProcessor` is optional on `ToolDefinition`.** Originally spec'd
  as required, but writing the very first tool (a viewer, not a converter)
  showed that requirement didn't fit — a viewer queries its engine directly
  and has no "processor that produces a downloadable output." Made it
  optional rather than write a throwing stub. *(This is a deviation from
  the originally-planned schema — a real one, not cosmetic.)*
- **Dependency-injectable registry helpers.** `getToolsByEngine`,
  `searchTools`, etc. all take an optional `toolList` parameter defaulting
  to the real registry, so they're unit-testable with mock data without
  needing real tools registered.
- **CSP added early**, restricting `connect-src` to `'self'` — this is the
  main technical enforcement mechanism behind "files never leave the
  browser," beyond just code review discipline.

## 5. UI-shell phase — what was added on top of the foundation

- `ToolPageLayout` (the one piece missing from the original 18-item list):
  wraps every tool page in privacy badge → title/description → the tool
  itself → ad slot → how-it-works → FAQ → related tools, with a back-link
  to the owning category.
- `SiteHeader`/`SiteFooter` upgraded from a static tagline to real category
  navigation (found and fixed a real mobile bug here: the header nav was
  clipping off-screen with no scroll affordance — switched to `flex-wrap`).

## 6. Parquet Viewer — how it actually works, and where reality corrected the plan

**Engine choice:** DuckDB-WASM. Registers the browser `File` directly via
`registerFileHandle(name, file, DuckDBDataProtocol.BROWSER_FILEREADER, true)`
— range-based reads, no full-file memory copy. Row count, schema
(`DESCRIBE`), and every page of the preview (sort/search/pagination) are
plain SQL run through DuckDB, not custom JS chunking logic.

**Why `engines/parquet/index.ts` does NOT use `engines/shared/workerClient.ts`:**
DuckDB-WASM already owns its own Worker and message protocol internally
(`AsyncDuckDB`/`AsyncDuckDBConnection`). Wrapping that in Comlink too would
be pointless double indirection. `workerClient.ts` remains for engines
where *we* write the worker.ts ourselves.

**Self-hosting, not jsDelivr:** the default DuckDB-WASM quick-start fetches
its engine binary from jsDelivr at runtim. Instead, `copy-duckdb-assets.mjs`
copies the mvp+eh `.wasm`/`.worker.js` straight from `node_modules` into
`public/duckdb/` on every `npm install`, and `engines/parquet/index.ts`
points `selectBundle()` at those same-origin paths. This keeps
`connect-src 'self'` intact and removes a third-party runtime dependency.
(`public/duckdb/` is gitignored — it's fully reproducible from
`node_modules`, no reason to bloat the repo with it.)

**SQL-injection note (a genuine, non-obvious finding, not boilerplate
caution):** Parquet column names come from the file's own untrusted
schema — a malicious file could have a column literally named
`x"; DROP TABLE ...`. `SELECT *` avoids selecting individual columns, but
`ORDER BY <col>` and the search `WHERE` clause need identifiers, which SQL
can't parameter-bind. Fixed with `quoteIdentifier()` (wraps in `"`, escapes
interior quotes) *plus* whitelisting the column against the real schema
before use. The search term itself is a real bound `?` parameter via
`conn.prepare()`.

### Two real bugs found and fixed during implementation (not anticipated in the plan)

1. **`@duckdb/duckdb-wasm`'s npm `latest` tag pointed to an unstable
   dev/prerelease build** (`1.33.1-dev57.0`, not a real release). Discovered
   via `npm view @duckdb/duckdb-wasm dist-tags`. **Fixed by pinning to
   `1.32.0`**, the last real stable release.

2. **DuckDB-WASM silently autoloads a *second*, separate binary at query
   time.** `read_parquet()` doesn't just need the main engine — it triggers
   an autoload of a signed `parquet.duckdb_extension.wasm` from
   `https://extensions.duckdb.org/...`, discovered only by actually running
   the tool in a real browser and capturing network + console output. Our
   CSP correctly blocked that fetch (`connect-src 'self'`), but DuckDB's
   failure mode for a missing extension isn't a clean error — it's a
   low-level `RuntimeError: function signature mismatch` deep inside the
   wasm module, which gave zero indication of the real cause until network
   logging was added.

   **Fix:** self-host that extension too, in a way that survives future
   `@duckdb/duckdb-wasm` upgrades without needing to be touched again:
   - `scripts/fetch-duckdb-extensions.mjs` — a one-time (not postinstall —
     it needs network access, which shouldn't block `npm install` in
     offline/CI environments) fetch of the `wasm_eh`/`wasm_mvp` parquet
     extension builds into `public/duckdb-ext-files/`. **These files ARE
     committed to the repo** (unlike `public/duckdb/`) because they aren't
     reproducible from `node_modules` — only from that one-time CDN fetch.
   - `next.config.ts` gets a `rewrites()` rule that maps
     `/duckdb-ext/:version/:platform/:name.duckdb_extension.wasm` (the path
     DuckDB itself constructs) to `/duckdb-ext-files/:platform/:name...`,
     **ignoring the version segment entirely** — so it always serves our
     copy no matter what version string a future `@duckdb/duckdb-wasm`
     upgrade requests.
   - `engines/parquet/index.ts` runs `SET custom_extension_repository =
     '/duckdb-ext'` on every new connection, before any `read_parquet()` call.

   If a future engine does something similar (fetches its own sub-resource
   beyond the main bundle), check its behavior under our CSP directly — a
   cryptic low-level runtime error is a more likely symptom than a clean
   network failure.

### Testing approach (and why it's split the way it is)

- **Vitest can't run this in unit tests** — jsdom doesn't implement Web
  Workers, so anything touching real DuckDB-WASM needs a real browser.
  Unit tests instead cover the *pure logic*: `quoteIdentifier`,
  `buildOrderByClause`, `buildSearchClause` (column whitelisting/escaping),
  and `toProcessingError` (DuckDB-message → user-facing-error mapping).
- **Component tests** mock `@/engines/parquet` entirely (`vi.mock`) to
  drive the UI state machine (opening → reading → analyzing-schema →
  preparing-preview → ready/error) without needing a real engine.
- **E2E (Playwright) is where the real behavior is verified** — against
  four generated fixtures (`tests/fixtures/*.parquet`, made by
  `scripts/generate-parquet-fixtures.py` using pandas/pyarrow, which were
  already installed locally): a valid multi-type file, an empty one (0
  rows, schema still shown), a **footer-corrupted** one (valid `PAR1`
  header+footer so it passes our client-side magic-byte check, but the
  Thrift metadata blob is corrupted — chosen deliberately over plain
  garbage bytes as the more realistic failure path), and a ~100k-row file
  for pagination/responsiveness.
- One E2E test specifically records every network request during a real
  file-open and asserts none are cross-origin and none carry the Parquet
  magic bytes in a request body — this is the automated, repeatable version
  of "confirm the file never leaves the browser," not just a one-time
  manual claim.

### Playwright config changes (infrastructure, not app behavior)

- **`webServer.command` changed from `npm run dev` to `npm run build && npm
  run start`.** The dev server compiles each route on first request; with
  Playwright's default parallel workers all hitting an uncompiled route at
  once, `page.goto()` was timing out well past 60s. A production build
  serves pre-compiled routes and is also just the more correct thing for
  E2E to exercise.
- **`workers: 2`** (was the CPU-count-based default, 5 on this machine).
  Each worker launches its own full browser instance; several of them
  compiling/instantiating the ~35MB DuckDB-WASM module at once was enough
  contention to cause the same kind of timeout even against the built
  server. Verified stable at 2 across repeated runs.

---

## 7. Spreadsheet & Structured Data engine — how it works, and what came up

**Normalized table shape is arrays, not objects — deliberately different
from Parquet's.** `{ columns: string[]; rows: CellValue[][]; warnings:
string[] }`. Parquet's `Record<string, unknown>[]` came naturally from
Arrow rows; here rows-as-arrays is what CSV/XLSX naturally produce, avoids
duplicate-header-key problems, and lines up directly with the existing
`VirtualizedTable` prop shape from the foundation pass — reused with zero
changes.

**Pure parsers/serializers, thin worker wrapper — this is the core
architectural move, and it also solves testing.** Papa Parse and SheetJS
both run fine in plain Node (no DOM/Worker dependency for their core
parse/write functions). So `parsers/{csv,xlsx,json}.ts` and
`serializers/{csv,xlsx,json}.ts` are pure functions (text/bytes in,
`NormalizedTable`/text/bytes out) with **real Vitest unit tests, not
mocked** — including self-contained XLSX round-trips (serialize a table,
re-parse it, compare) since SheetJS needs no fixture files to test against.
`worker.ts` is a thin adapter (reads the `File`, calls the pure functions,
`exposeEngine()`s them); `index.ts` is the only thing UI code imports,
lazily creating the worker via `createEngineWorker`. This is the first
engine to actually exercise that helper — Parquet was the documented
exception.

**Shared row-normalization helper.** CSV parsing, XLSX sheet parsing, and
JSON array-of-arrays parsing all start from "raw rows as arrays" and need
identical handling: derive/synthesize headers from row 1, pad short rows
with `null`, truncate (+warn) long rows so the table stays rectangular.
One function, `buildNormalizedTable`, used by all three. JSON
array-of-objects (and a single object, treated as a 1-element array of
objects) instead unions object keys into columns — a genuinely different
shape, kept as its own path rather than forced into the row-array model.

**JSON shape handling (the "don't silently produce bad output"
requirement):** array of objects, single object (one-row table), array of
arrays, and array of plain values all convert sensibly. A bare scalar
top-level value, or an array mixing objects/arrays/primitives, is
explicitly rejected with a specific explanation of what shape was found —
never a best-effort garbage table. A nested object/array *inside an
otherwise-tabular row* is stringified into that cell with a warning rather
than rejected (same precedent as Parquet Viewer's nested STRUCT/LIST
display).

**CSV injection guard (a genuine, non-obvious finding):** the CSV
serializer sets Papa Parse's `escapeFormulae: true`. Without it, a cell
value like `=cmd|'/c calc'!A1` — plausible input for the JSON-to-CSV
converter, since JSON can contain anything — would be interpreted as a
live formula by Excel/LibreOffice when the downloaded file is later
opened. Confirmed via a unit test that the serializer actually prefixes
`'` on such values.

**XLSX pre-check needed a stronger guard than expected.** SheetJS is
deliberately permissive — `XLSX.read()` on 4 bytes of garbage didn't
throw; it silently produced a 1-cell "workbook" containing the raw bytes
as a text cell (SheetJS tries to guess legacy formats rather than fail).
Discovered by an assumption-testing unit test (`toThrow()` failed).
**Fix:** check the ZIP magic bytes (`PK\x03\x04`) ourselves before ever
calling `XLSX.read()` — a real `.xlsx` is always a ZIP archive, so this
has zero false positives and correctly rejects garbage/legacy-format input
that SheetJS would otherwise "helpfully" parse into nonsense.

**`ProcessingError` needed the serialize/reconstruct round-trip for real,
for the first time.** Parquet's engine never actually exercised this path
(DuckDB owns its own worker protocol; errors were always caught
main-thread-side in `engines/parquet/index.ts`). Here, `parsers/*.ts`
throws `ProcessingError` instances *inside* `worker.ts`, which runs inside
a real Worker behind our own Comlink wrapper — and structured clone does
not preserve custom Error subclasses, only plain `Error(message)` survives
by default. `worker.ts` catches `ProcessingError` and re-throws
`.toJSON()` (a plain, cloneable object); `index.ts`'s `reconstructError()`
checks `ProcessingError.isSerializedProcessingError()` and rebuilds it with
`.fromSerialized()`. This is exactly what those two static helpers were
built for in the foundation pass, unused until now.

**Two shared, parameterized interactive components instead of six
bespoke ones.** `SpreadsheetViewerTool` (parameterized by `format: "csv" |
"xlsx"`) powers both viewers; `SpreadsheetConverterTool` (parameterized by
`sourceFormat`/`targetFormat`) powers all four converters. Both live under
`components/spreadsheet/` and import only the engine's public API, never
Papa Parse/SheetJS directly.

### Testing approach

- **Real, unmocked unit tests** for the parser/serializer/normalize layer
  (see above) — a genuine advantage over Parquet's engine, where jsdom's
  lack of a Worker implementation forced pure-logic-only unit tests.
- **Component tests** mock `@/engines/spreadsheet` entirely, same pattern
  as `ParquetViewerTool.test.tsx`.
- **E2E** (`tests/e2e/spreadsheet-tools.spec.ts`) against fixtures made by
  `scripts/generate-spreadsheet-fixtures.mjs`: a CSV with quoted fields, an
  embedded newline, accented characters, an emoji, and a leading BOM; a
  2-sheet XLSX with a date column; JSON in a valid array-of-objects shape,
  a syntactically-malformed shape, and a valid-but-unsupported scalar
  shape; and a 50k-row CSV for the large-file/virtualization check. Same
  network-recording assertion pattern as the Parquet suite.

---

## 8. Structured Data expansion (JSON/XML/YAML) — how it works, and what came up

**Two execution models, decided by a fact, not a preference — checked, not
assumed.** Before writing any code, searched and confirmed `DOMParser` does
not exist inside Web Workers (no `window`/DOM there at all — not a jsdom
quirk, a real platform limitation). That single fact settles the
architecture: every XML-touching function is main-thread-only; nothing in
this round touches `engines/spreadsheet/worker.ts`. JSON/YAML have no such
constraint but stay main-thread too, since routing trivial, fast value
transforms through Comlink would add ceremony for no benefit.

**XML parsing uses native `DOMParser`/`XMLSerializer` — no new
dependency, and a deliberate security choice.** Browsers' DOMParser doesn't
fetch external resources or resolve external entities/DTDs, so it's
XXE-resistant by construction, from an implementation already
security-audited by browser vendors — safer than hand-rolling a parser
(much larger attack surface for a security-critical feature) or trusting a
third-party XML library's own track record. Verified with a real XXE
payload, a billion-laughs payload, and script-injection-shaped input, both
in unit tests (jsdom's DOMParser, confirmed to behave safely — a payload
targeting `file:///etc/passwd` comes back as a parse error, "undefined
entity," never the file's content) **and** in Playwright against real
Chromium, not just asserted from general knowledge of how browsers work.

**One new dependency: `js-yaml` 5.2.1.** Read its actual shipped type
declarations before use rather than assuming v3/v4 API knowledge still
applied — confirmed `load()` is safe-by-default in this major version (its
tag set has no function/regexp/unsafe-type constructors), and set
`maxAliases` explicitly as defense-in-depth against a YAML-anchor
equivalent of billion-laughs.

**`components/text-tools/TextTransformTool.tsx` — the first *paste-first*
shared tool component.** Every prior interactive tool (Parquet, CSV/XLSX)
was drop-a-file-first; these 8 tools (all except the 2 CSV↔XML converters,
which reuse `SpreadsheetConverterTool` since they're genuinely file-based)
are paste-first with an "Open file" button as the secondary affordance.
Output always renders via `<textarea readOnly>` — never
`dangerouslySetInnerHTML` — so "no unsafe HTML rendering" holds by
construction, not by remembering to sanitize.

**Two genuinely different XML conversions, kept as separate code paths on
purpose.** `xmlTable.ts` (tabular, `<rows><row>...</row></rows>`, reuses
`NormalizedTable`/`buildNormalizedTable` directly) for CSV↔XML, versus
`convert/jsonXml.ts` (hierarchical, arbitrary nested JSON) for JSON↔XML.
Forcing arbitrary JSON through the tabular path would lose structure;
forcing tabular CSV data through a generic hierarchical mapper would add
complexity the tabular case doesn't need. Both share `xmlNames.ts`'s
`sanitizeXmlElementName()` so key/column-name sanitization is consistent
either way.

**Documented, not glossed-over, structural limitations for XML↔JSON** (the
task's explicit "don't pretend every XML document can be perfectly
round-tripped" requirement): a repeated XML tag becomes a JSON array, but a
single occurrence stays a plain value rather than a 1-item array — so
round-tripping can't always tell "always a list" apart from "happened once
here." Mixed content collapses into a single `#text`, losing exact
position. Comments/processing instructions are dropped. Namespace prefixes
are kept literally, never resolved. Every leaf value becomes a string after
a JSON→XML→JSON round trip, since XML has no native number/boolean type.
All of this is spelled out in each tool's own FAQ copy, not just in code
comments — confirmed actually rendered on the page via a real browser
screenshot, not just present in the registry data.

**A real, unplanned bug caught by a test that failed its own assumption:**
SheetJS-style permissiveness doesn't apply here, but the tabular
`parseXmlTable` needed a root-children-share-one-tag-name check with a
*specific* error message (not a generic "malformed") — the plan anticipated
this, and a unit test confirmed the message actually names the conflicting
tags rather than just failing generically.

### Testing approach

- **Real, unmocked unit tests for everything, including the security
  cases** — jsdom's `DOMParser`/`XMLSerializer`/`document.implementation.createDocument`
  all turned out to work, confirmed via a throwaway scratch test *before*
  committing to writing the real suites (worth checking early: this could
  easily have gone the DuckDB/Worker-only-testing way instead).
- **Component tests** mock the engine, same pattern as the other two tool
  batches.
- **E2E** (`tests/e2e/structured-data-tools.spec.ts`, 13 tests) covers all
  10 pages plus a dedicated "XML security" block: a real XXE payload run
  through both the Validator and XML→JSON with network recording (zero
  external requests, no file content anywhere in the page), a
  billion-laughs payload (must not hang), and script-tag-shaped content
  (must render as inert escaped text, confirmed via a `dialog` listener
  that never fires).

---

## 9. PDF engine — how it works, and what came up

**Two libraries, two execution models, deliberately split within one engine
folder — a new pattern, not a repeat of the CSV/XML split.** `pdf-lib`
(structural manipulation: merge/split/rotate/extract/delete/reorder/
metadata/images→PDF) has no DOM dependency at all — confirmed via `npm view
pdf-lib dependencies` (only `@pdf-lib/standard-fonts`, `@pdf-lib/upng`,
`pako`, `tslib`) before relying on it, not assumed — so it runs in a real
Comlink worker exactly like the Spreadsheet engine. `pdf.js` (rendering
thumbnails/PDF→Images, and PDF→TXT text extraction) needs `document`/
`canvas`, so it's main-thread-only, and it owns its own internal worker
protocol (`pdf.worker.min.mjs`) the same way DuckDB-WASM does — CLAUDE.md
named this exact pattern back in the foundation phase ("pdf.js later"),
before this engine existed. `engines/pdf/structural/*` + `worker.ts` +
`index.ts` follow the spreadsheet-engine shape; `engines/pdf/render/*`
follows the parquet-engine shape. Nothing here was assumed by analogy
without checking — pdf-lib's dependency tree was read directly.

**One primitive powers 5 of the 8 `/pdf/*` tools — the concrete answer to
"build reusable infrastructure, not 11 unrelated implementations."**
`buildPdfFromSelection(sources, selection: PageRef[])` copies an ordered
list of `{ sourceIndex, pageIndex, rotationDelta? }` references into a new
PDF via `pdf-lib`'s `copyPages`/`addPage`. Each tool differs only in how
its UI *computes* `selection`:
- **Merge** — all pages of all dropped files, in whatever order the user arranges.
- **Extract** — only the pages the user checked (single file).
- **Delete** — all pages *except* the checked ones (the UI computes the
  complement; same primitive underneath).
- **Reorder** — all pages of one file, rearranged, nothing removed.
- **Rotate** — all pages of one file, unchanged order, with `rotationDelta`
  set on whichever pages the user rotated.
- **Split** calls this *same* primitive once per contiguous page range the
  user marks, then zips the N outputs with `jszip` (new dependency, the one
  named as a candidate all the way back in the original foundation-phase
  dependency review, first actually used here).

`images-to-pdf` and the metadata tools are genuinely different input
shapes (raster images in; Info-dictionary reads/writes) and are kept as
separate primitives rather than forced through the page-selection
abstraction — the same "don't force a bad fit" call made for JSON↔XML vs.
tabular CSV↔XML in the previous round.

**Metadata removal drops the whole Info-dictionary reference, not
field-by-field blanking.** `doc.setTitle(""); doc.setAuthor(""); ...` would
leave empty-string values in the dictionary (still "metadata," just blank)
and wouldn't touch any nonstandard fields a particular PDF producer added.
Checked `pdf-lib`'s own source (not just its `.d.ts`) and found
`PDFDocument.context` and `.context.trailerInfo.Info` are both public —
setting `trailerInfo.Info = undefined` removes the trailer's reference to
the whole dictionary in one step, a cleaner and more complete removal.
Documented honestly in the tool's FAQ that a separate embedded XMP metadata
stream, if a PDF has one, isn't touched by this (pdf-lib has no API for
that stream) — stated as a real limitation, not silently ignored.

**Encrypted PDFs: one choke point, uniform treatment, verified against a
real encrypted fixture — not mocked.** `structural/load.ts`'s
`loadPdfDocument()` is called by every structural operation and raises a
clear `ProcessingError` for any PDF where `pdf-lib`'s own `doc.isEncrypted`
is true, before any tool-specific logic runs. `pdf-lib` has no real
decryption path, so partial per-tool support was never on the table. To
actually test this (not just reason about it), Python's `pypdf`
(`pip install pypdf` — pure Python, no compiled deps; Python + pandas/
pyarrow were already available from the Parquet round) generated a real
password-protected fixture, since `pdf-lib` itself can't write one.

**pdf.js needs 4 self-hosted asset directories, not just the worker
script — found by inspecting the installed package directly, not from
pdf.js's own docs (which default to a CDN this project never uses).**
`node_modules/pdfjs-dist` ships `cmaps/` (`.bcmap`, confirmed — this is
what tells `getDocument()`'s `cMapPacked` option should be `true`),
`standard_fonts/`, `wasm/` (image codecs), and `iccs/` (color profiles), on
top of `build/pdf.worker.min.mjs`. `scripts/copy-pdfjs-assets.mjs` (added
to the same `postinstall` chain as `copy-duckdb-assets.mjs`) copies all
five into `public/pdfjs/`; `render/pdfjsClient.ts` points `workerSrc`/
`cMapUrl`/`standardFontDataUrl`/`wasmUrl`/`iccUrl` at those same-origin
paths. Missing one of these doesn't hard-fail — pdf.js just silently
degrades for whichever PDFs exercise that path (wrong glyphs, undecoded
images) — which is a worse failure mode than a clean error and easy to
miss without deliberately testing a PDF that needs it. (One real API
mismatch caught by checking the actual installed types rather than
trusting memory of pdf.js's API: `isEvalSupported` doesn't exist as a
`getDocument()` option in this major version — grepped the shipped `.d.ts`
before writing the call.)

**`pdf.js`'s `PDFDocumentProxy` has no `.destroy()` — its
`.loadingTask.destroy()` is the actual cleanup call.** Assumed the more
common `doc.destroy()` API shape at first (matching, e.g., DuckDB's
connection-close pattern); `tsc` caught this immediately (`Property
'destroy' does not exist on type 'PDFDocumentProxy'`), and the shipped
`.d.ts` showed `.loadingTask` — the object `getDocument().promise` actually
resolves *from* — has the real `destroy()`. Fixed in
`engines/pdf/render/session.ts`, not worked around.

**One shared thumbnail component, lazy by construction.**
`components/pdf/PdfThumbnail.tsx` renders nothing until an
`IntersectionObserver` reports it's scrolled near-visible, then renders at
a fixed small width via `pdf.js` — never full page resolution for a
thumbnail grid. This is what makes "avoid rendering every full-resolution
page immediately" true for a 60-page PDF without any tool needing to
implement its own virtualization; verified in e2e (`large.pdf`, 60 pages)
that fewer than 60 `<img>` elements are ever actually rendered.

**One shared page-workspace component, not five.**
`components/pdf/PdfPageWorkspaceTool.tsx` takes a `mode` prop
(`"merge"|"extract"|"delete"|"reorder"|"rotate"`) and a small per-mode
config object controlling which UI affordances show (checkbox vs.
move-buttons vs. rotate-buttons, single- vs. multi-file input, the primary
action's label and empty-selection message) — the five tools genuinely
share one component, not five copies with minor edits.

**Reordering is button-based (move-left/move-right), not native HTML5
drag-and-drop — a deliberate accessibility call, not a shortcut.** Native
HTML5 drag-and-drop isn't keyboard-operable, which would make
reordering/merging pages impossible for keyboard-only users — a real
regression given README's own accessibility requirements. Move/remove/
rotate buttons are fully keyboard-accessible by construction and need no
extra ARIA wiring beyond a clear `aria-label` per button. Same reasoning
applied to `ImagesToPdfTool`'s image reordering.

**Real bug caught by ESLint's stricter React rules, not by manual
review:** reading `sessionsRef.current[...]` (or `sessionRef.current`)
directly inside JSX during render — needed for thumbnails to know which
open pdf.js session to render from — triggered
`react-hooks/refs`'s "Cannot access refs during render" rule. Refs are
correct for the *unmount-cleanup* effect (which must reach whatever
session is currently open without a stale closure) but wrong for anything
read during render. Fixed by mirroring the same value into real `useState`
for render-time reads, keeping the ref only as the cleanup effect's
non-stale reference — written from event handlers, never read during
render. A related rule (`react-hooks/set-state-in-effect`) flagged
`PdfThumbnail`'s effect resetting `dataUrl`/`failed` synchronously before
its async render kicked off; fixed by not resetting eagerly at all — the
previous thumbnail stays visible until the new one resolves (relevant only
after a rotation changes a page's `cacheKey`), which is better UX than a
flash back to a loading placeholder anyway.

### Testing approach

- **`structural/*.ts` gets real, unmocked unit tests** (`pdfStructural.test.ts`)
  against real fixtures generated by our own installed `pdf-lib` — the same
  "pure logic, no DOM, so no reason to mock" reasoning as the Spreadsheet
  engine's parsers, now applied to a second engine.
- **`render/*.ts` (pdf.js) is e2e-only** — confirmed via a throwaway script
  that jsdom's `canvas.getContext("2d")` returns `null` without the native
  `canvas` package, which this project deliberately doesn't add just for
  tests (a native addon, real weight, for a testing-only concern). Text
  extraction doesn't strictly need canvas, but is exercised through the
  same e2e suite for simplicity rather than splitting test strategy within
  one small module.
- **Component tests** mock `@/engines/pdf` and
  `@/engines/pdf/render/session` entirely, same pattern as the other two
  engines. `IntersectionObserver` needed a global stub added to
  `tests/setupTests.ts` (jsdom doesn't implement it) — reusable by any
  future lazy-rendering component, not just PDF's. `jszip`'s mocked default
  export had to be a real `function`, not an arrow function — Vitest
  warned that `new (() => {})()` isn't valid JS, an easy mistake once and
  fixed the same way in both files that needed it.
- **E2E** (`tests/e2e/pdf-tools.spec.ts`, 18 tests) covers all 11 pages
  against real fixtures generated by `scripts/generate-pdf-fixtures.mjs`
  (our own `pdf-lib`) and `generate-encrypted-pdf-fixture.py` (`pypdf`),
  plus dedicated cases: an encrypted PDF failing clearly across tools
  (not just one), a malformed PDF (corrupted trailer/xref, same technique
  as the malformed Parquet fixture) failing clearly, mixed page sizes
  rendering without error, a 60-page PDF confirmed to lazy-render fewer
  than 60 thumbnails, and a network-recording test confirming zero
  off-origin requests during a real merge operation. One real
  infrastructure bug surfaced while running this suite the first time: a
  `node` server left running on port 3000 from earlier in this session
  (predating the PDF routes) made Playwright's `reuseExistingServer` reuse
  that stale build instead of rebuilding, so every test 404'd on
  `page.goto()`. Not a code bug — but worth remembering that a stray
  long-lived dev server silently poisons the next E2E run.

### Known limitations and risks not yet exercised (honest gaps, not just
polished claims)

- ~~**Every PDF fixture is generated by `pdf-lib` itself**~~ — **largely
  closed in entry 35.** Five fixtures now come from producers the engine
  doesn't share: reportlab (ordinary text document, CJK document,
  scanner-style image-only page) and qpdf/pikepdf (a linearized
  "fast web view" file, and one rewritten into PDF 1.5 object streams
  behind a binary cross-reference stream). All five load and process
  correctly, so **the "a legitimate PDF could still trip `MALFORMED_FILE`"
  risk is now ruled out for linearization, object/xref streams and
  third-party object layout specifically** — the three structures that
  paragraph actually named. What remains untested is the long tail: real
  Acrobat/Word output, phone scanning apps, and damaged-but-readable files
  from the wild, none of which can be generated reproducibly.
- **Digital signatures are detected and warned about, but the warning is
  all there is** (closed in §31 — kept here in reduced form because the
  underlying capability gap remains). `pdf-lib` still doesn't understand
  signatures, so a signed PDF still comes out unsigned; the change is that
  the user is now told before they commit, and every affected tool's FAQ
  says so. Re-signing, or preserving a signature through an edit, remains
  impossible with this toolchain.
- **Signature detection is structural, not cryptographic.** It looks for an
  AcroForm field with `/FT /Sig`, which is what a signed PDF has — but it
  never validates the signature, so it cannot distinguish a valid signature
  from an expired, broken, or forged one, and would not notice a signature
  attached by some non-AcroForm mechanism. The fixture is a real signature
  *field*, not a real certificate.
- **`render/*.ts` (all pdf.js rendering: thumbnails, PDF→Images) has zero
  unit-test coverage**, by construction (the jsdom canvas gap above) — it's
  only ever validated by the specific e2e assertions written for this
  round. A future change that subtly breaks rendering in a way none of
  those assertions happen to catch could ship unnoticed until someone
  manually opens a tool.
- ~~**No progress indicator for Merge/Extract/Delete/Reorder/Rotate**~~ —
  closed in §32. `buildPdfFromSelection()` now reports per copied page and
  all six tools render a real `ProcessingProgress` bar.
- ~~**No stale-request guard in `PdfPageWorkspaceTool`/`PdfSplitTool`'s
  file-open handlers**~~ — closed in §32, and it turned out to be more than
  ordering: the losing run also leaked its render sessions and could pair
  one file's page list with another's sessions. Both tools now carry a
  request token bumped on every drop/clear.
- ~~**The CJK/non-embedded-standard-font code path
  (`cmaps`/`standard_fonts` self-hosting) ... never exercised by an actual
  test**~~ — **closed in entry 35.**
  `tests/fixtures/pdf/real-cjk-noembed.pdf` draws CJK text in
  `/Type0 /HeiseiMin-W3`, an Adobe standard Asian face the file references
  but does not embed (verified: no `/FontFile` anywhere in the bytes), so
  rendering it *requires* resolving a CMap from the self-hosted assets.
  PDF→TXT extracts the actual characters (`日本語のテキストサンプル`), not
  just the Latin text beside them — which matters because the failure mode
  here is silent degradation, so asserting "something came back" would have
  passed even with the assets missing.
- **True large-scale memory/performance behavior is untested.** The
  "large" fixture is 60 pages / ~13KB (small, since it's pdf-lib-generated
  text-only pages) — this exercises the lazy-thumbnail-rendering *code
  path*, not real memory pressure from an actual 100+MB PDF with embedded
  images, which is the scenario the sequential-rendering/lazy-thumbnail
  design is actually meant to protect against.
- **`OUT_OF_MEMORY` error mapping in `structural/load.ts` is inferred from
  matching error-message substrings**, not empirically triggered by an
  actual out-of-memory condition — unlike the Parquet engine's equivalent,
  which was at least exercised against a real ~100k-row file. Whether the
  message-matching heuristic actually fires for pdf-lib's real OOM error
  shape is unconfirmed.

---

## 10. Image engine — how it works, and what came up

**No third-party image library at all — the first engine that didn't need
one.** Every prior engine wrapped a real npm package (DuckDB-WASM, SheetJS/
Papa Parse, pdf-lib/pdf.js) around its core work. Here, the browser's own
Canvas/`OffscreenCanvas`/`createImageBitmap`/`ImageBitmap` APIs already do
decode, resize, rotate, flip, and lossy/lossless encode natively — adding
a library would have meant reimplementing what the platform already does
for free. The only new dependency this round is `exifr` (7.1.3, MIT, zero
runtime dependencies of its own — confirmed via `npm view` before adding
it), and it's used for exactly one thing: reading EXIF fields for display
in the Metadata Viewer, not for any part of the actual image pipeline.

**One core primitive, `processImage()`, in a real Comlink worker — no
split needed, unlike PDF.** Confirmed empirically before writing any
pipeline code: `OffscreenCanvas` + `createImageBitmap` work fully inside a
real, self-written `new Worker(...)` (created one, drew to it, called
`convertToBlob()`, got a valid image blob back). Since nothing in the core
pipeline needs `document`, `engines/image/pipeline.ts` runs entirely in
`engines/image/worker.ts`, the same shape as the Spreadsheet engine — this
engine did *not* need PDF's structural/render split, because nothing here
needed a second, DOM-dependent execution model for its *main* work. Two
much smaller pieces still had to stay main-thread, for two different,
verified reasons (see below): SVG→PNG and EXIF reading.

**EXIF orientation is auto-applied by the browser's decoder, on every
decode path, unconditionally — the single most consequential empirical
finding of this round.** Generated a real JPEG with EXIF orientation=6
(via Python's `piexif`) with a deliberately asymmetric red/blue pattern,
then checked `createImageBitmap()` with `imageOrientation: "none"`,
`"from-image"`, no option at all, and a plain `<img>` element — all four
produced *identically* oriented pixels, not the four different results the
spec's per-option semantics would suggest. **Practical effect: this engine
never writes manual "read the orientation tag, then rotate" logic
anywhere** — every tool's output is already correctly oriented for free,
which is a real simplification the original plan didn't assume until this
was checked. Canvas re-encoding (`toBlob`/`convertToBlob`) also strips all
EXIF data from its output — confirmed separately by scanning re-encoded
bytes for the `Exif\0\0` marker and finding none — which is why "Remove
EXIF Metadata" needed no special code path at all: it's the exact same
`processImage()` call every other tool makes, with no extra options.
(Verified against this project's Chromium **and, as of entry 35, Firefox** —
the orientation test is `@cross-browser`-tagged and runs in both. WebKit
runs the same subset in CI only, for an antivirus reason described there.)

**SVG→PNG is the one operation that must stay main-thread, for a
different reason than pdf.js or XML did.** `createImageBitmap()` cannot
decode an SVG `Blob` directly in this Chromium build (confirmed: `"The
source image could not be decoded"`) — only a real `<img>` element can,
and `Image`/`HTMLImageElement` don't exist inside a Worker. This is also
what makes SVG rasterization safe from script execution *by construction*,
separately confirmed with a real `<script>`-carrying SVG payload (loaded
via `<img>`, the script never ran, in both a component test and a real
Chromium e2e test) — on top of `lib/security/sanitize.ts`'s new
`sanitizeSvg()`, which runs DOMPurify with its dedicated `USE_PROFILES: {
svg: true, svgFilters: true }` config (the default HTML profile doesn't
recognize SVG-only elements as safe, so it's the wrong config for this).
Belt-and-suspenders, not either alone.

**Batch processing is one shared component, not per-tool duplication.**
`components/image/ImageBatchList.tsx` handles the queue (sequential, not
parallel — same peak-memory reasoning as `PdfToImagesTool`), per-item
thumbnail/status/download, and the "download all as .zip" (`jszip`,
already a dependency from the PDF round) button, reused by
`ImageConvertTool`, `SvgToPngTool`, `ImageTransformTool`, and
`ImageMetadataTool`'s remove mode. It's keyed by batch identity
(`batchKey()`, exported alongside it) rather than reacting to prop changes
internally via an effect — a deliberate choice, see the bug note below.

**Transparency handling is explicit, not silent — a real requirement, not
a nice-to-have.** Converting a transparent PNG/WebP to opaque JPEG fills
the canvas with a user-chosen background color (white by default) *before*
compositing the source on top via `destination-over`, rather than letting
transparent pixels fall through to canvas's default transparent-black.
Verified with a real pixel-level check in e2e: downloaded the actual
converted output, decoded it back in-browser via a data URL + canvas, and
sampled a pixel that was transparent in the source — confirming it came
back as the chosen background color, not black.

**PNG "compression" is explained honestly rather than showing a slider
that silently does nothing.** `toBlob`'s `quality` argument is only
consulted for `image/jpeg`/`image/webp` — PNG is lossless, full stop. The
Compress Image tool detects a `.png` file in the batch and shows a plain
explanation instead of a quality control that would have no visible
effect, pointing at PNG→WebP as the actual lossy-compression path.

### Two real bugs, both caught by tooling before shipping

1. **React's `react-hooks/refs`/`set-state-in-effect` lint rules flagged
   patterns this codebase had used without issue in earlier rounds** —
   `ImageBatchList` originally reset its entry list inside a `useEffect`
   reacting to the `files` prop, calling `setEntries()` synchronously at
   the top of the effect body (the same shape PDF's `PdfThumbnail` hit and
   fixed earlier). Fixed by restructuring so initialization happens via a
   lazy `useState` initializer once per mount, and callers key the
   component by batch identity (`batchKey(files)` plus any processing
   options) so a new batch or changed setting gets a fresh mount instead of
   an in-place update — the same "let React remount instead of fighting an
   effect's dependency array" pattern, now applied a third time.
2. **A raw "Convert"/"Rotate"/"Resize"/"Download" button-name match is not
   safe against substring collisions with surrounding hint text or other
   buttons — this bit multiple e2e tests in this round, not just one.**
   `getByRole("button", { name: "Convert" })` matched a `FileDropZone`'s
   accessible name because its own hint text contains "convert**ed**";
   `getByRole("button", { name: "Rotate" })` matched all of "Rotate left"/
   "Rotate right"/the actual submit button; a "Download" count matched the
   "Download all N as .zip" button too. Fixed with `{ exact: true }`
   everywhere a short action label could plausibly be a substring of
   something else on the page — documented as a standing gotcha in
   CLAUDE.md so it isn't rediscovered a fourth time.

### Known limitations and risks not yet exercised

- ~~**Firefox/Safari's EXIF-auto-orientation behavior is assumed
  spec-consistent with Chromium, not verified**~~ — **closed for Firefox in
  entry 35**: the orientation assertion is `@cross-browser`-tagged and
  Firefox agrees with Chromium exactly. Safari/WebKit remains genuinely
  open — the project exists and runs in CI, but has never completed a run,
  because the development machine's antivirus quarantines WebKit's
  executable. One partial WebKit run also raised a *separate* suspicion
  worth chasing: PNG→JPG produced no output at all there. See entry 35.
- ~~**Animated WebP handling is asserted in FAQ copy based on general
  `createImageBitmap` behavior, not verified**~~ — **closed in entry 35**:
  `tests/fixtures/image/animated.webp` is a real 3-frame animated WebP
  (frames red/green/blue) and the converted output samples red, so "only a
  single static frame is used" is now a verified claim rather than an
  inference. The FAQ copy was correct.
- **`ImageTransformTool`'s resize/rotate/flip/compress settings apply to an
  entire batch uniformly** — there's no per-file override within one batch
  run; a user wanting different rotations for different images has to
  process them in separate batches. Documented as a scope choice in the
  component's own comment, not raised to the user anywhere on the page
  itself.
- **True large-image memory behavior is only lightly exercised.** Partly
  addressed in entry 35: `tests/fixtures/image/photo-large.jpg` is 6 MP of
  noisy photographic content (~24 MB decoded RGBA), replacing reliance on
  the old gradient that compressed to ~23 KB and therefore never had a
  realistic memory profile. Still deliberately short of a
  multi-hundred-MB camera photo or a large batch of them — this suite runs
  on a machine already sensitive to resource pressure.
- **PNG-specific "true" compression (palette reduction, etc.) is out of
  scope, by design, not by omission** — the Compress Image tool is honest
  about this in its own copy, but no tool in this engine actually performs
  real PNG-specific size reduction; PNG→WebP is the only path offered.

### Testing approach

- **Unit (real, unmocked)**: only `transform/dimensions.ts` and
  `transform/mime.ts` — pure math and lookup tables with zero DOM
  dependency. This is a smaller share of total engine logic than any prior
  round's unit layer, honestly, because almost everything else in this
  engine touches `canvas`.
- **E2E-only**: the entire `pipeline.ts` (decode/transform/encode),
  `render/svgToPng.ts`, and `render/metadata.ts` — the same jsdom-canvas
  gap documented for PDF's `render/*.ts` applies here across a much larger
  fraction of the engine's actual behavior.
- **Component tests** mock `@/engines/image`, `@/engines/image/render/
  svgToPng`, and `@/engines/image/render/metadata` entirely, same pattern
  as the other three engines; `createImageBitmap` is stubbed globally
  where `ImageTransformTool`'s resize mode probes real dimensions.
- **E2E** (`tests/e2e/image-tools.spec.ts`, 23 tests) covers all 13 pages,
  plus dedicated real-pixel-level checks (not just "a download appeared")
  for transparency and EXIF orientation — both download the actual
  produced output and decode it back in-browser via a data URL + canvas,
  the same technique used during the pre-implementation empirical research
  — a script-carrying SVG's script never running, an SVG with an external
  resource reference never triggering a network request, a truncated/
  malformed JPEG and a plain-text-not-really-SVG file both failing
  clearly, a 3000x2000 image processing without hanging, and a
  network-recording test confirming zero off-origin requests during a
  real conversion.

---

## 11. Deviations from what was explicitly asked — summary

These are the places the implementation differs from a literal reading of
the instructions given, with the reasoning:

| What was asked / originally planned | What was actually done | Why |
|---|---|---|
| `createProcessor` required on every `ToolDefinition` | Made optional | A viewer tool has no conversion output; a required-but-throwing stub was worse than fixing the type |
| Generic `app/<group>/[slug]/page.tsx` dynamic route (literal reading of early CLAUDE.md wording) | One static folder per tool (`app/tools/parquet-viewer/page.tsx` + colocated client component) | Re-read CLAUDE.md's own "Adding a tool" steps — it already listed the page as a separate manual step; simpler and more debuggable for a one-tool-at-a-time build-out. CLAUDE.md wording was then tightened to say this explicitly. |
| DuckDB-WASM via its default jsDelivr CDN bundle | Fully self-hosted (main bundle **and**, once discovered, the parquet extension) | Keeps `connect-src 'self'` intact, removes a third-party runtime dependency, matches "keep operational costs low" |
| (implicit) use whatever `@duckdb/duckdb-wasm` version npm installs | Pinned to `1.32.0`, not `latest` | `latest` was an unstable dev/prerelease tag that crashed at runtime |
| `npm run dev` as the E2E web server | `npm run build && npm run start` | Dev-server on-demand compilation caused real timeout flakiness under parallel test workers |
| Default Playwright worker count | Capped at 2 | Prevented resource contention from multiple concurrent WASM-compiling browser instances |
| `ProcessingStatus` component states (as originally built in the foundation pass) | Extended with `opening-file`, `analyzing-schema`, `preparing-preview`, `ready` | The exact 4-phase wording requested for this tool didn't fit the original enum; extended it as a shared, reusable addition rather than a one-off local string |
| CSP `script-src` (as originally set) | Added `'wasm-unsafe-eval'` | Needed for `WebAssembly.instantiate()` under strict CSP; does not grant JS `eval()`, `connect-src` untouched |
| 6 independent tool implementations (implied by listing 6 tools) | 2 shared, parameterized components (`SpreadsheetViewerTool`, `SpreadsheetConverterTool`) | The task itself said "the goal is NOT to build each converter independently" — this is the literal fulfillment of that at the UI layer, mirroring the engine-level reuse |
| `xlsx` at whatever version `npm install xlsx` resolves | Uninstalled npm's `xlsx@0.18.5`, installed `xlsx@0.20.3` directly from `cdn.sheetjs.com` (SheetJS's own recommended install method) | npm's registry copy is frozen at 0.18.5, which carries two high-severity, directly-relevant CVEs (prototype pollution, ReDoS) unfixed on npm — exploitable exactly because this tool's whole job is parsing untrusted files |
| "JSON Formatter" and "JSON Validator" as implied separate concepts | One combined tool/registry entry, `json-formatter` | The task's own numbered list names them together as one line item ("1. JSON Formatter & Validator") — formatting doubles as validation, since a thrown parse error *is* the invalidity signal |
| A generic table-oriented `NormalizedTable` treatment for JSON↔XML (consistency with how CSV/XLSX/JSON↔CSV all work) | A separate, hierarchical `convert/jsonXml.ts` path, not routed through `NormalizedTable` | Arbitrary JSON is not tabular; forcing it through the table abstraction would either reject most real JSON or silently lose structure — the plan's own "don't force a bad abstraction" principle, applied a second time in this round |
| Routing all engine work through `engines/shared/workerClient.ts` for consistency with the CSV/XLSX engine | All new JSON/XML/YAML code is main-thread-only | `DOMParser` does not exist inside Web Workers — confirmed via search before deciding, not assumed |
| README §12 lists 12 initial PDF tools (incl. "TXT to PDF") | 11 tools implemented, TXT to PDF excluded | The actual build instruction for this round named exactly these 11 (matching README's separate §44 Phase-2 subset, which also excludes it); not a scope gap, just this round's explicit list |
| A per-tool encrypted-PDF handling decision | One choke point (`loadPdfDocument()`), uniform "unsupported" treatment across all 11 tools | `pdf-lib` has no real decryption path, so every tool would hit the same wall — a single, honest error beats 11 slightly-different ones |
| `doc.setTitle(""); doc.setAuthor(""); ...` field-by-field metadata blanking (the more obvious approach) | `doc.context.trailerInfo.Info = undefined` — drops the whole dictionary reference | Checked `pdf-lib`'s actual source, not just its public API surface; a more complete removal (covers nonstandard fields too), still using only public properties |
| Native HTML5 drag-and-drop for page/image reordering (the more common implementation choice) | Move-left/move-right/remove/rotate buttons | Native drag-and-drop isn't keyboard-operable — would make reordering impossible for keyboard-only users, a real accessibility regression |
| `doc.destroy()` to close a pdf.js document (assumed API shape, by analogy with DuckDB's connection close) | `doc.loadingTask.destroy()` | `tsc` caught the wrong method immediately; the real `destroy()` lives on `PDFDocumentProxy.loadingTask`, confirmed in the shipped `.d.ts` |
| A dedicated image-manipulation library (e.g. a Jimp/sharp-style npm package), the more common implementation choice for a browser image tool | No third-party image library at all — native Canvas/`OffscreenCanvas`/`createImageBitmap` | The platform already does decode/resize/rotate/flip/encode natively; confirmed `OffscreenCanvas`+`createImageBitmap` work fully inside a real Worker before committing to this, rather than assuming a library was needed |
| Manual EXIF-orientation-tag reading and rotation logic (the assumption going into this round, per the plan) | No orientation-correction code anywhere in the engine | Empirically confirmed the browser's own decoder auto-applies orientation on every decode path unconditionally — writing manual correction logic would have double-rotated every oriented photo |
| A malformed-JPEG fixture corrupting only the file's tail bytes (the first attempt) | Truncating the file roughly in half instead | Browsers' JPEG decoders tolerate tail corruption (a missing/damaged EOI marker) well enough to still decode a slightly-glitched image — the fixture had to actually remove a real chunk of scan data to reliably fail `createImageBitmap()` |
| A malformed-SVG fixture with one unclosed tag (the first attempt) | Plain, non-XML text content instead | DOMPurify's sanitizer uses a forgiving HTML-style parser that auto-repairs a single unclosed tag, so the "almost-valid" fixture actually succeeded instead of failing — needed content with no markup structure at all to reliably fail |

Nothing here weakens the "files never leave the browser" guarantee — every
change either keeps that guarantee intact through a different mechanism
(self-hosting instead of a CDN) or is unrelated to it (test infra, type
schema).

---

## 12. Commands

```
npm run dev          # dev server
npm run build         # production build
npm run start         # serve the production build
npm run lint          # ESLint
npx tsc --noEmit      # TypeScript check
npm run test          # Vitest (unit + component)
npm run test:e2e      # Playwright (builds + starts the app itself)
python scripts/generate-parquet-fixtures.py       # regenerate Parquet test fixtures (needs pandas/pyarrow)
node scripts/generate-spreadsheet-fixtures.mjs    # regenerate CSV/XLSX/JSON/XML test fixtures
node scripts/fetch-duckdb-extensions.mjs          # re-fetch the parquet extension (needs network; only if upgrading duckdb-wasm)
node scripts/generate-pdf-fixtures.mjs            # regenerate PDF test fixtures (uses our own installed pdf-lib)
python scripts/generate-encrypted-pdf-fixture.py  # regenerate the one encrypted PDF fixture (needs pypdf: pip install pypdf)
python scripts/generate-image-fixtures.py         # regenerate image test fixtures (needs Pillow + piexif)
```

## 13. Suggested next steps

- A Geospatial engine/tool set (GeoJSON/KML/GPX) is the one core-engine
  domain from README's original list not yet built — the pattern has now
  held across a DuckDB-owned-worker engine, a Comlink-worker engine, a
  main-thread-only engine, an engine that legitimately splits across both
  models internally (PDF), and an engine needing no third-party library at
  all (Image) — Geospatial would likely need MapLibre GL JS/Turf.js and is
  the first genuinely map-rendering-shaped domain.
- Image engine limitations worth closing if this area gets revisited: the
  first two on this list were closed in entry 35 — animated WebP is now
  verified against a real 3-frame fixture, and EXIF auto-orientation is
  verified in Firefox as well as Chromium (WebKit runs in CI only). What
  remains open: Safari/WebKit has still never completed a run, and per-file
  (rather than whole-batch) resize/rotate/flip/compress settings aren't
  supported.
- ODS was named in the brief as a future spreadsheet-engine format but
  isn't implemented yet — `buildNormalizedTable` should accommodate it
  without restructuring, but that's untested until it's actually added.
- README §18's remaining Developer & Data Utilities (Base64 encode/decode,
  URL encode/decode, UUID generator, hash generator, Unix timestamp
  converter, regex tester, SQL formatter, text/JSON diff) would all fit the
  existing `TextTransformTool` shape directly — no new shared component
  needed, just new pure transform functions and registry entries.
- If a second DuckDB-based tool is added, check whether it needs a
  different DuckDB extension (e.g. `json`) — same self-hosting pattern
  applies, just add another folder under `public/duckdb-ext-files/`.
- README §12's "potential later" PDF tools (Compress PDF, HTML to PDF,
  Markdown to PDF, PDF page numbering, Watermark PDF) and TXT to PDF (in
  the initial list but not this round's instruction) aren't implemented —
  Watermark/page-numbering would fit `engines/pdf/structural/` directly;
  Compress PDF would need real investigation into what pdf-lib can actually
  reduce (image re-encoding, mostly) versus what would just be a false
  promise, per README's own "don't promise quality that can't be reliably
  delivered locally" rule.
- Remove PDF Metadata's FAQ already discloses that a PDF's separate XMP
  metadata stream (if present) isn't touched — closing that gap would need
  a lower-level edit to the document's `/Metadata` catalog entry, not
  currently implemented.

---

## 14. Product-layer / implementation-layer audit (formalizing an already-real split)

By the time this pass ran, the codebase had already evolved well past what
§§1–13 above describe: `registry/categories.ts` already names the five
user-facing products Data Studio / PDF Studio / Image Studio / Geospatial
Studio / Developer Toolkit; four of them are real unified multi-tab apps
(`SpreadsheetDataApp`, `PdfStudioApp`, `ImageStudioApp`,
`GeospatialStudioApp`, sharing `components/app-shell/AppShell.tsx`) layered
*on top of* every Tool's own still-live, still-indexed page, not replacing
them; and breadcrumbs/nav/homepage all already read `category.name` rather
than hand-writing a label. None of that later evolution — the AppShell
layer, `AppId`/`AppMode`/`ToolAppEntry` in `registry/types.ts`, the
Spreadsheet Editor's `jspreadsheet-ce` grid — is narrated in §§1–13, which
stop at the original 7-phase build-out; this entry doesn't backfill that
narrative, only records the audit below.

The ask: make the product/implementation distinction explicit and
consistent — Applications and Tools are what a user thinks in terms of;
Engines/Registry/Components are what a contributor thinks in terms of;
"Engine" should never leak into user-facing text; existing URLs must keep
working.

**What the audit found, checked rather than assumed:**
- Grepped every `.ts`/`.tsx` under `src/` for the literal string "Engine" —
  every match is an import path, a type name (`Engine`, `EngineWorkerHandle`),
  or a code comment. Zero matches in rendered JSX text, SEO title/description
  strings, FAQ copy, or any other user-facing string.
- Checked the homepage, `SiteHeader`, `ToolPageLayout`'s breadcrumbs, and all
  five category pages: every one already renders `category.name` (a
  registry value), never a hand-typed "PDF Tools"/"Image Tools" string.
- Checked `next.config.ts#redirects()`: `/spreadsheet-tools` and
  `/data-tools` both permanently redirect to `/data-studio`; every other
  category kept its original slug (`pdf-tools`, `image-tools`,
  `geospatial-tools`, `developer-tools`) even though its display name
  changed — so no other redirect was needed, and none was added.
- Checked `lib/seo/metadata.ts`, `lib/seo/structuredData.ts`, and
  `app/sitemap.ts`: all derive titles/descriptions from registry data
  (`tool.seo`, `CATEGORY.name`/`.description`), none hardcode a stale
  category name or mention "engine."

**What changed:** documentation only, no application code. Added rule 10 to
`CLAUDE.md` (Product layer vs. implementation layer) making the
Applications/Tools vs. Engines/Registry/Components split, and the
"'Engine' is implementation-only" rule, an explicit standing rule rather
than something only inferable from reading the registry and category code —
so a future tool/page addition has a rule to follow instead of only
precedent to reverse-engineer. `README.txt` (the original, largely historical
product spec) was deliberately left untouched, consistent with this
project's existing convention of recording naming evolution and deviations
in `CLAUDE.md`/`PROJECT_LOG.md` rather than editing the original spec
document — e.g. the Data/PDF/Image/Geospatial Studio renames themselves are
already documented that way, not in `README.txt`.

---

## 15. Shared Studio framework (`StudioLayout` + `registry/studios.ts`)

Before this pass, all four Studio pages (`/data-studio`, `/pdf-tools`,
`/image-tools`, `/geospatial-tools`) hand-rolled their own page-level
chrome — breadcrumbs, header, privacy badge, FAQ, related-tools, ad slot,
spacing — around each Studio's own app component, duplicating the same
shell four times with only the content differing. The ask: factor that
shell into one generic, reusable layout, with each Studio contributing
only configuration, no functional changes to any tool.

**What changed:**
- `src/components/studio/StudioLayout.tsx` — the new generic shell,
  architecturally the Application-level counterpart to the existing
  `ToolPageLayout` (which already played this role one level down, for
  individual tool pages). Renders breadcrumbs, header (title, description,
  `LocalProcessingBadge`), an `AdSlot`, `FAQ`, and `RelatedTools` — all
  driven by a `StudioConfig` prop — around a `children` slot for the
  Studio's own interactive application.
- `src/registry/studios.ts` — `StudioDefinition`/`StudioConfig` and
  `getStudioConfig(slug)`, holding each Studio's description, accepted
  file types, actions, default action, related engines, and FAQ as plain
  data. Title and engine aren't duplicated here — `getStudioConfig` merges
  in `CategoryDefinition` (rule 8's existing single source of truth) for
  those two fields.
- All four page files (`app/data-studio/page.tsx`, `app/pdf-tools/page.tsx`,
  `app/image-tools/page.tsx`, `app/geospatial-tools/page.tsx`) now do
  nothing but call `getStudioConfig(slug)` and render
  `<StudioLayout studio={STUDIO}><TheStudioApp .../></StudioLayout>` — no
  page hand-writes its own header/FAQ/related-tools block anymore.
- `tests/component/StudioLayout.test.tsx` — covers header/description/
  privacy badge rendering, FAQ items sourced from config, related actions
  filtered to the Studio's own engine(s) (not every registered tool), and
  the breadcrumb trail.

**Deliberate scope boundary:** the drop zone and action-navigation tab bar
stay owned by each Studio's own app component (`SpreadsheetDataApp`,
`PdfStudioApp`, `ImageStudioApp`, `GeospatialStudioApp`), passed in as
`children`, not absorbed into `StudioLayout` itself. Both are already
generic and shared via `AppShell`/`Toolbar` one layer down, but stay wired
to per-engine file-parsing and mode state that doesn't flatten into a
single cross-engine component without rewriting that logic — composition
via `children` is what keeps `StudioLayout` itself generic, per the ask,
rather than `StudioLayout` growing per-Studio conditionals.

**Verification:** `tsc --noEmit`, lint, and the full Vitest suite (587
tests, including the new `StudioLayout` tests) all pass; a clean
`rm -rf .next` production build succeeds and emits all four Studio routes
plus every individual tool page unchanged. The full Playwright e2e suite
(pinned to `workers: 1`, see below) caught one real regression from
`StudioLayout` always rendering the FAQ on the same page as the app:
`geo-tools.spec.ts`'s Analyze-tab test asserted `getByText("WGS84
(EPSG:4326)")` without `{ exact: true }` — a plain substring match, the
Playwright gotcha already documented earlier in this file — and once the
Geospatial Studio FAQ's "What coordinate reference system is used?" answer
(which also starts with "WGS84 (EPSG:4326)") became reachable on the same
`/geospatial-tools` page as the Analyze tab's own CRS value, the query
started resolving to two elements instead of one. Fixed by adding
`{ exact: true }` to that one assertion — a test-only fix, no application
code changed. Full suite (175 tests) is green after the fix. No engine,
tool-processing, or registry-entry logic changed anywhere in this pass —
it was a page-layer refactor only.

`playwright.config.ts`'s `workers` was separately dropped from 2 to 1 (see
its own inline comment) after this machine hard-crashed — an ungraceful
power-cycle with no BSOD dump, consistent with a thermal/power cutoff, not
a software fault — during a full e2e run. Unrelated to the Studio
refactor itself, but recorded here since it's why every e2e run in this
entry took ~2 minutes at one worker instead of running both Chromium
instances in parallel.

---

## 16. Data Studio absorbs JSON/XML/YAML tooling (Developer Toolkit's JSON category retired)

Nine tools — JSON Formatter, JSON Minifier, XML Formatter, JSON Validator,
XML Validator, and the 4 JSON⇄XML/YAML converters — were registered as
Developer Toolkit tools (`engine: "developer"`, `devCategory: "json"`)
even though their actual implementation had *always* lived in
`engines/spreadsheet/format/{json,xml}.ts` and
`engines/spreadsheet/convert/{jsonXml,jsonYaml}.ts` (confirmed by reading
each tool's own interactive component's imports, not assumed from the
`ToolDefinition.engine` field, which turned out to be the wrong signal
here). The ask: make product-layer ownership (registry `engine`, category,
navigation, breadcrumbs) match that implementation reality — Data Studio
becomes the single place these tools are reachable from — while changing
zero tool behavior and preserving every existing URL.

**What changed (architecture/navigation only):**
- All 9 tools' `ToolDefinition.engine` moved from `"developer"` to
  `"spreadsheet"`, and their `devCategory: "json"` field was removed (that
  field is Developer-Toolkit-only). This one change cascades correctly
  through the whole app with no other code changes needed, because both
  `ToolPageLayout` (breadcrumbs) and `StudioLayout` (Data Studio's related-
  actions list) already derive category ownership from `tool.engine` via
  `CATEGORIES.find(c => c.engine === tool.engine)` / `getToolsByEngine` —
  exactly the single-source-of-truth path rule 8 requires. No page, no
  breadcrumb component, no related-tools component needed touching.
- `registry/types.ts`'s `DevCategorySlug` union dropped `"json"`; TypeScript
  itself then forced the one remaining reference (`DevCategoryIcon`'s
  `Record<DevCategorySlug, ReactNode>`) to drop its now-invalid `json` key —
  a real example of "let the compiler find every call site," not just a
  convenience.
- `registry/devCategories.ts`'s `DEV_CATEGORIES` array dropped the "JSON"
  entry, so `/developer-tools`'s landing page (which maps over that array
  for its cards) and `app/sitemap.ts` (which maps over it for sub-category
  URLs) both stopped referencing it automatically — no page/sitemap code
  changed, only the data it reads.
- JSON Diff (`devCategory: "json"`, `engine: "developer"`) was the one
  exception: its comparison logic has nothing to do with the Spreadsheet
  engine (it's `engines/developer/diff.ts`'s `diffJson`, sharing a
  component with Text Diff), so it stayed in Developer Toolkit rather than
  moving to Data Studio — but "json" no longer exists as a devCategory, so
  it moved to `devCategory: "text"`, pairing it with the tool it already
  shares a UI component with. Text's tool count went from 11 to 12.
- `src/app/developer-tools/json/page.tsx` (the route itself) was deleted,
  and `next.config.ts#redirects()` gained a permanent
  `/developer-tools/json` → `/data-studio` redirect — same treatment and
  reasoning as the existing `/spreadsheet-tools` and `/data-tools`
  redirects, so any inbound links/search ranking to the retired category
  page transfer to its replacement instead of 404ing.
- `registry/categories.ts`'s Developer Toolkit `description` (which feeds
  `/developer-tools`'s `<meta>` description) dropped "JSON" from its
  category list — it named a category that no longer exists.
- No change to `registry/studios.ts` — Data Studio's `relatedEngines`
  already included `"spreadsheet"`, so all 9 tools started appearing in
  `/data-studio`'s "Related actions" section automatically once their
  `engine` changed, with zero Studio-config edits needed.

**What did NOT change:** every one of the 9 tools' `slug`/`routeGroup` (so
`/tools/json-formatter`, `/tools/json-validator`, `/tools/xml-validator`,
`/convert/json-to-xml`, etc. all still resolve exactly as before); their
`createProcessor`-less `TextTransformTool`-based implementation; their FAQ,
SEO title/description, and `keywords`; `searchTools()` (format-agnostic,
unaffected); `categorizeActions()`/Universal File Drop grouping (keyed off
`tool.category`, e.g. `"utility"`/`"convert"`, never `tool.engine`); and
`getRelatedTools()` (resolves each tool's own `relatedTools` slugs
regardless of engine, so cross-category related-tool links, like JSON
Diff → JSON Formatter, keep working unchanged).

**Verification:** `tsc --noEmit` (confirms `DevCategoryIcon` and every
other `DevCategorySlug` consumer compiles with `"json"` gone), lint, and
the full Vitest suite all pass. Two e2e test files needed updates to match
the new, intentionally-changed counts/URLs (not because anything broke
unexpectedly): `tests/e2e/seo.spec.ts` — the ">6 tools triggers a filter"
test moved from `/developer-tools/json` (retired) to `/developer-tools/text`
(now 12 tools); the "every category page returns 200" list dropped
`developer-tools/json`; the retired-URL-redirect test gained
`developer-tools/json` → `/data-studio` alongside the pre-existing two.
`tests/e2e/developer-tools.spec.ts` — the landing page test now expects 4
cards (not 5) with Text at 12 tools; the Text category tool-list test now
expects JSON Diff alongside the other 11. Full Playwright suite (pinned to
`workers: 1`, see entry 15) passes after these updates.

---

## 17. Top-level navigation redesigned around Applications

Before this pass, `SiteHeader`, `SiteFooter`, the homepage's own grid, and
`not-found.tsx` each independently mapped over `CATEGORIES` and rendered a
flat list of 5 links under `aria-label="Categories"`. Functionally this
already avoided a flat tool list (the 5 `CATEGORIES` entries already *are*
the 5 Applications, per the product/implementation-layer split in rule 10)
— but it named the nav after the implementation-layer concept ("Categories")
rather than the product-layer one ("Applications"), and gave a user no way
to see what an Application actually *does* before clicking into it. The
ask: make the primary nav genuinely Applications-first, surface each
Application's own capabilities directly in the nav, and make sure that
holds up as the tool count grows well past 150 — without adding a single
new tool-level URL or duplicating any existing data.

**What changed:**
- New `registry/navigation.ts#getAppNavItems()` — the single source all
  four nav surfaces now read from, replacing each one's own
  `CATEGORIES.map()`. For each of the 5 `CATEGORIES` entries it attaches a
  `capabilities` preview: `STUDIOS[].actions` for the four Studios (the
  *exact* list already driving each Studio's own in-app tab bar — not a
  second copy that could drift out of sync) or `DEV_CATEGORIES` for
  Developer Toolkit (its real sub-category pages). This is the concrete
  mechanism behind "scales past 150 tools": nav size is a function of 5
  Applications × ≤6 capabilities each, never of total tool count — verified
  directly in `tests/unit/navigation.test.ts`.
- `SiteHeader` was rewritten around a native `<details>`/`<summary>`
  disclosure per Application, instead of a flat link row. Chosen
  specifically to avoid a hand-rolled dropdown: no client-side open/close
  state, no click-outside-to-close handler, no focus-trap code, and no
  `"use client"` directive — the browser provides all of that for a
  `<details>` element for free, keyboard- and touch-accessible by default,
  so the header stays a zero-JS server component. A Studio's own
  capabilities preview as plain, unlinked text inside its panel — a
  Studio's tabs are client-side state within one URL, not separate routes,
  so a link straight to `/data-studio` labeled "Editor" would silently land
  on the View tab instead, a misleading affordance actively worse than not
  linking at all. Developer Toolkit's capabilities, by contrast, link
  directly to their real `/developer-tools/{slug}` URLs, since those really
  are separately addressable.
- `SiteFooter` and `not-found.tsx` were simplified to read from
  `getAppNavItems()` too (for the single-source-of-truth property) but kept
  as flat link lists — a secondary/recovery nav doesn't need the same
  capability-preview treatment as the primary one.
- The homepage's own Applications grid gained an inline capability preview
  under each Application's name (e.g. "Viewer · Editor · Converter ·
  Analyzer" under Data Studio), so the same "clearly present capabilities"
  property holds at the site's main entry point, not just in the header.
- `aria-label="Categories"` → `aria-label="Applications"` everywhere (header,
  footer, homepage grid, 404 page), and `ToolSearch`'s no-results copy
  ("browse by category below") was updated to match.

**What did NOT change:** every existing URL (no route was added, moved, or
removed — `getAppNavItems()` only reads existing `CATEGORIES`/`STUDIOS`/
`DEV_CATEGORIES` data and links to existing pages); any Studio app's actual
tab-switching behavior or any tool's implementation; `StudioLayout`,
`ToolPageLayout`, or breadcrumbs (unrelated to the sitewide nav, untouched).

**Verification:** `tsc --noEmit`, lint, and the full Vitest suite — including
two new files, `tests/unit/navigation.test.ts` (asserts `getAppNavItems()`'s
shape, ordering, and the Studio-vs-Developer-Toolkit capability/link split
directly against real registry data) and `tests/component/SiteHeader.test.tsx`
(asserts each disclosure starts closed, opens on click by checking the
native `open` attribute — chosen over a visibility assertion since jsdom
doesn't apply the `<details>` UA stylesheet that hides collapsed content in
a real browser) — all pass. A clean production build succeeds. A new e2e
file, `tests/e2e/site-navigation.spec.ts`, verifies the real-browser
behavior a jsdom test can't: collapsed panels are actually not visible
before opening (real UA stylesheet), opening reveals the right capability
labels and none of the tools underneath them, Developer Toolkit's capability
links navigate to their real pages, and both the homepage grid and footer
render correctly — scoped per landmark (`header`/`main`/`footer`) since a
page can carry more than one `nav[aria-label="Applications"]` at once (the
homepage has three).

The full Playwright run caught one real regression, a clean example of why
this matters more for a change to the root layout than most: because
`SiteHeader` renders on every page, its capability `<li>` text is present
in the DOM (just CSS-hidden by the `<details>` UA stylesheet while closed)
site-wide — and Playwright's `getByText` locator matches DOM text
regardless of visibility, unlike `getByRole` queries against the
accessibility tree. `universal-file-drop.spec.ts` had an unscoped
`page.getByText("View", { exact: true })` assertion, which now also
matches Image Studio's and Geospatial Studio's own header capability label
(both use the literal "View" as their first Studio action) — a 3-way
strict-mode collision. Fixed by switching that assertion to
`getByRole("heading", { name: "View", exact: true })`, since the thing it
actually needed to check is a real heading and the header's `<li>` items
aren't headings — more precise than adding a container scope, and a
narrower, more future-proof fix than a broad rescope would have been.
Grepped the whole suite for every other unscoped `getByText`/`getByRole`
call matching any of the new capability labels ("View", "Edit", "Convert",
"Viewer", "Editor", "Converter", "Analyzer", "Analyze", "Pages",
"Metadata", "Security", "Text", "Encoding", "SQL", "Utilities") before
concluding this was the only one — checked, not assumed, given the header
change's sitewide blast radius. Full Playwright suite (pinned to
`workers: 1`, see entry 15) passes after the fix.

---

## 18. Studio UX review — action placement across Data/PDF/Image/Geospatial Studio

A deliberate UX audit of all four Studio apps' internal tab/action
structure — not architecture-only this time, but reading each app's actual
render logic and click paths, and cross-checking every "obviously similar"
pattern between Studios (metadata handling, validate-vs-repair actions,
format-bridging converters) for a genuine inconsistency versus a
considered, already-documented design choice. Goals: every action in its
correct capability, no duplicated functionality, intuitive workflows, each
Studio staying focused, minimal clicks for common tasks — with an explicit
instruction not to add new features unless they clearly improve
consistency.

**What was checked, and cleared (documented here so a future pass doesn't
re-litigate the same questions):**
- PDF Studio's Pages (Merge/Split/Extract/Delete/Reorder/Rotate), Convert
  (Images→PDF/PDF→Images/PDF→Text) and Metadata (View/Remove) tabs: every
  action fits its tab, no overlap. Metadata already unifies View/Remove
  under one `ActionPicker` — this turned out to be the *correct* existing
  pattern, and the template the Image Studio fix (below) was made to match.
- Geospatial Studio's Edit tab: Simplify and Repair (GeoJSON Validator,
  labeled "Repair") both mutate the file's content, so Edit is the right
  home for both — confirmed by reading `GeoJsonValidatorTool.tsx` itself
  rather than assuming from the label. Initially flagged the "Repair" label
  as a possible mismatch against the tool's own name ("GeoJSON Validator"),
  but the tool's own registry description ("Check a GeoJSON file for
  structural problems, with an optional... automatic repair") and an
  explicit code comment ("Rendered by the shared GeospatialStudioApp (Edit
  tab, locked to 'repair')") show this was already a deliberate, considered
  choice, not an oversight — left unchanged. Analyze's read-only validation
  display and Edit's interactive repair both call the same
  `validateGeoJson()`/`repairGeoJson()` functions — shared engine logic
  presented two different ways for two different needs (check vs. fix),
  not duplicated functionality.
- Cross-Studio placement of format-bridging tools (Images→PDF and PDF→
  Images in PDF Studio; SVG→PNG in Image Studio): each lives in the Studio
  that produces the format a user is trying to create, matching how a user
  would actually search for the tool — confirmed correct, not moved.
- Data Studio's View-mode search/sort (a non-destructive display reorder)
  versus Edit-mode's bulk Sort operation (an actual data mutation): reads
  as duplication at a glance but are genuinely different capabilities —
  confirmed by reading `SpreadsheetDataApp.tsx` directly rather than
  assuming from naming.

**What changed — Image Studio's Metadata tab:**
"Remove Metadata" was one of ten options in the Edit tab's action picker,
mixed in among pixel-level transforms (Resize/Compress/Rotate/Flip/
Brightness/Contrast/Grayscale/Crop) it has nothing to do with — inconsistent
with PDF Studio's own Metadata tab, which already unifies View/Remove
together, and non-intuitive: a user wanting to strip a photo's GPS data
before sharing it would naturally look for a "Metadata" tab, not scan
through Edit's options to find it last. `ImageMetadataTool` already
supported a `mode: "view" | "remove"` prop (the exact same shape as
`PdfMetadataTool`) — the capability existed, it was just placed under the
wrong tab.
- `components/image/ImageStudioApp.tsx`: removed `"remove-metadata"` from
  `EditAction`/`EDIT_ACTIONS` (now 9 actions, all genuinely pixel/visual-
  content transforms); added `MetadataMode`/`METADATA_MODES`/
  `lockedMetadataMode`, mirroring `PdfStudioApp`'s `MetadataMode` exactly;
  the Metadata tab now renders a View/Remove `ActionPicker` in front of
  `ImageMetadataTool`, same shape as PDF Studio's Metadata tab.
- `app/tools/remove-image-metadata/page.tsx`: now locks
  `initialTab="metadata" lockedMetadataMode="remove"` (was
  `initialTab="edit" lockedEditAction="remove-metadata"`).
- `app/tools/image-metadata-viewer/page.tsx`: now explicitly locks
  `lockedMetadataMode="view"` (previously relied on the tab's old
  hardcoded-to-view-only render; now that the tab has a real picker, this
  keeps the dedicated viewer page's picker hidden, matching how
  `pdf-metadata-viewer` locks `lockedMetadataMode="view"`).
- `registry/tools/remove-image-metadata.ts`: `appEntry.mode` updated from
  `"edit"` to `"metadata"` (this is registry/navigation metadata only —
  `category: "edit"`, which drives the unrelated, coarser-grained Universal
  File Drop VIEW/CONVERT/EDIT/TOOLS grouping, was deliberately left
  unchanged, matching `remove-pdf-metadata`'s identical `category: "edit"`
  + `appEntry.mode: "metadata"` split — the two fields answer different
  questions and don't need to agree).

**What did NOT change:** every URL (`/tools/remove-image-metadata`,
`/tools/image-metadata-viewer`, `/image-tools`) resolves exactly as before;
`ImageMetadataTool`'s own implementation (unchanged — it already supported
both modes); every other Edit action; SEO title/description/FAQ for both
tools.

**Net effect on clicks for the two affected tasks:** viewing EXIF data —
unchanged (Metadata tab was already the right place). Removing EXIF
data — same click count from the Studio hub (Metadata tab → Remove →
drop), but now *discoverable* where a user would actually look, instead of
buried as the 10th item in an unrelated picker — the real problem being
fixed here was findability/correctness of placement, not click count.

**Verification:** `tsc --noEmit` (confirms every `EditAction`/
`lockedEditAction` consumer still compiles with `"remove-metadata"` gone),
lint, and the full Vitest suite pass. A clean production build succeeds.
`tests/e2e/image-tools.spec.ts` gained two tests — Metadata tab shows both
View and Remove and Edit's picker no longer offers Remove Metadata; both
locked metadata pages hide their picker but keep the top-level tabs
switchable — and one existing assertion needed `[aria-label="Action"]`
scoping (the new sub-picker's own "View" tab collided with the top-level
Toolbar's "View" tab under a bare `getByRole("tab", { name: "View" })`,
same category of landmark-scoping issue as entry 17's header regression).
Full Playwright suite (`workers: 1`) passes after the fix.

---

## 19. Global site search (Applications + capabilities + formats + tools)

The ask was to implement a global search, with a note that "something like
this already is there" to check first. It was: `components/tools/
ToolSearch.tsx`, backed by `registry/index.ts#searchTools()`, matching a
query against every tool's `name`/`description`/`keywords`. Audited it
against the actual requirement (discover Applications, capabilities, tools,
*and* file formats; rank Applications before tools) using the three given
examples as a concrete test:
- "PDF" → expected PDF Studio first: **would have partially worked** —
  "PDF Studio" isn't a `ToolDefinition`, so `searchTools()` could never
  return it at all, only the individual PDF tools, unranked relative to
  anything else.
- "CSV" → expected Data Studio: **would have failed outright** — "Data
  Studio" doesn't contain "csv," and Studios aren't tools, so nothing about
  the old implementation could ever surface it.
- "Resize" → expected Image Studio: **would have failed outright**, same
  reason, and worse — "Image Studio" doesn't even contain "resize," so no
  amount of better string matching on the Application's own name would
  have fixed this one; it requires resolving *through* the one tool that
  matched ("Resize Image") to that tool's owning Application.

Conclusion: the existing implementation covered "tools" only, one of the
four required result types, and had no Applications-first ranking because
it had no Application results at all. Rebuilt rather than patched, since
"discover Applications by name/capability/format, then tools, ranked
Applications-first" is a different function shape than "filter tools by
three text fields."

**What changed:**
- New `registry/search.ts#searchSite(query)` — see the `CLAUDE.md` entry
  for the full matching/ranking mechanism (name, capability via
  `getAppNavItems()`, accepted format via `STUDIOS[].acceptedFileTypes` +
  `lib/detect/formatLabels.ts`, and owning-Application resolution for a
  tool-only match). Reuses `searchTools()` unchanged for the tool half —
  no duplicated matching logic, per rule 3.
- `components/tools/ToolSearch.tsx` → `components/tools/SiteSearch.tsx`
  (renamed — the old name was no longer accurate once the component
  stopped being tools-only). Renders a single ranked list; Application
  results are bold with an "Application" tag so the apps-first ranking is
  visible, not just structural. One call site (`app/page.tsx`) updated.
- All three worked examples from the request became real test cases
  (`tests/unit/search.test.ts`, `tests/component/SiteSearch.test.tsx`,
  `tests/e2e/homepage.spec.ts`) verifying the exact claimed behavior, not
  just that *some* results come back.

**What did NOT change:** `searchTools()` itself, `getAppNavItems()` itself,
any tool's registry data, any URL. This is new capability layered on
existing, already-correct registry data — no duplication of the matching
logic those two functions already implement.

**A concrete case worth recording:** the "Resize" example only resolves
because `searchSite()` looks up a *matched tool's* owning Application
(`findOwningApp()`), not because "Resize" was added anywhere as an
Application-level capability label. Image Studio's own top-level
capabilities (from `STUDIOS[].actions`) are only View/Edit/Convert/
Metadata — "Resize" is a sub-action nested inside the Edit tab's own action
picker (`ImageStudioApp.tsx`'s `EDIT_ACTIONS`), a level of detail
`registry/studios.ts` deliberately doesn't track (see entry 17's reasoning
for why Studio actions preview as unlinked text rather than links, for the
same "tabs aren't separate routes" reason). Search reaching Image Studio
through Resize Image's own tool-level match, rather than needing every
Studio's full sub-action vocabulary duplicated into the registry, is what
keeps this addition cheap and consistent with the existing architecture —
worth remembering if a future request asks for capability-level search
depth beyond what a tool's own match already provides for free.

**Verification:** `tsc --noEmit`, lint, and the full Vitest suite —
including the two new test files — pass. A clean production build
succeeds. `tests/e2e/homepage.spec.ts`'s new search tests needed
`getByRole("list")`/`getByRole("listitem")` scoping, since an Application's
name (e.g. "PDF Studio," "Data Studio") also appears as a real link in the
homepage's own Applications grid and the footer on the same page — the
same landmark-scoping lesson as entries 17 and 18, now a confirmed
recurring pattern whenever a change adds text that already exists
elsewhere on a page also under test. Full Playwright suite (`workers: 1`)
passes after the fix.

---

## 20. Header dropdown reverted to plain, button-styled links

Real usage (a screenshot from the user) surfaced the exact failure mode
entry 17 didn't anticipate: native `<details>` has no built-in mechanism
to close one disclosure when another opens, so hovering/clicking across
Data Studio, PDF Studio and Image Studio in quick succession left multiple
panels open and visually overlapping — "Open PDF..." and "Open Image
Studio" rendered on top of each other, unreadable. This is genuine
`<details>` behavior working as designed, not a CSS bug, but it made the
header nav actively worse than the flat link row it replaced.

**What changed:** `SiteHeader` reverted to one plain `<Link>` per
Application — no `<details>`/`<summary>`, no capability-preview panel, no
"Open X" secondary link. Per explicit follow-up feedback, each link is
now styled with a visible border and padding (a bordered pill, not bare
underlined text) so it reads as clickable at a glance — stronger affordance
than the original pre-entry-17 header had, even though the interaction
model (direct link, no menu) is the same. `SiteFooter` was never changed
in entry 17 (already a flat link list) and needed no further change here.

**What did NOT change:** the homepage's own Applications grid still shows
each Application's capability preview inline (e.g. "Viewer · Editor ·
Converter · Analyzer" under Data Studio) — that one never had the
overlapping-panels problem, since it's static content directly on the
page, never a popover, so there was no reason to remove it. `registry/
navigation.ts#getAppNavItems()` is unchanged and still the single source
`SiteHeader`, `SiteFooter`, the homepage grid, and `not-found.tsx` all
read from — only how `SiteHeader` renders that data changed.

**Tests:** `tests/component/SiteHeader.test.tsx` and `tests/e2e/
site-navigation.spec.ts` (entry 17) were rewritten to match — the
disclosure-open/capability-preview assertions are gone, replaced with
direct link/href checks per Application (plus one check that each link's
class list includes a real border utility, so the "looks clickable"
requirement itself has a test, not just the click-through behavior). The
homepage grid, footer, and 404-page nav tests from entry 17 were
unaffected and kept as-is.

**Verification:** `tsc --noEmit`, lint, and the full Vitest suite pass. A
clean production build succeeds. Full Playwright suite (`workers: 1`)
passes.

---

## 21. SEO architecture review — the missing Capability layer

Audited the site against nine stated goals. Five were already met and
needed no change: every tool has its own landing page (78/78, guarded by
`registryIntegrity.test.ts`); every Application has its own landing page
(5/5); canonical URLs on every page type (`buildToolMetadata`/
`buildCategoryMetadata`/`buildHomeMetadata`); breadcrumbs, visible and as
`BreadcrumbList` JSON-LD, from one component so the two can't disagree;
and related tools on both tool and Application pages. Four had real gaps.

**Gap 1 — no capability index pages (the significant one).** A Studio's
capabilities were client-side tabs with *no URL at all*: `/pdf-tools`
rendered Pages/Convert/Metadata/Security as `useState`, so nothing between
"Application" and "tool" existed for a crawler. The only crawlable path
into a tool from its Application was one flat, undifferentiated "related
actions" list of every tool in the engine (26 links on Data Studio). Added
13 capability index pages — `/{categorySlug}/{capability}` — making the
hierarchy Home → Application → Capability → Tool, every level a real page.

**Gap 2 — Studio pages emitted no structured data whatsoever.** They
rendered a visible FAQ with no `FAQPage` markup behind it and had no
application-level `SoftwareApplication` block, while tool pages one level
*down* had both. That's the site's highest-value page type missing the
markup its less-important pages already had. Fixed in `StudioLayout`;
`buildSoftwareApplicationJsonLd` was refactored onto a shared
`buildApplicationJsonLd(name, description, url)` so the tool and
Application levels emit structurally identical markup by construction
rather than by two similar-looking call sites.

**Gap 3 — index pages had no `ItemList`.** Developer Toolkit's
sub-category pages (the only pre-existing capability-layer pages) left a
crawler to infer "this page enumerates tools" from a list of anchors.
Added `CollectionPage` + `ItemList` there and on the new capability pages —
the same page *kind*, so deliberately the same markup.

**Gap 4 — no "related applications" anywhere.** The internal link graph was
five disconnected per-Application trees; the only route between two
Applications was the header nav or the homepage. Added
`components/seo/RelatedApplications.tsx` to every Application, capability
and Developer-Toolkit index page.

**Data-model decision worth recording.** Capability membership needed a
signal that already existed for 44 tools (`appEntry.mode`) but not for the
9 JSON/XML/YAML tools, which belong to Data Studio (`engine: "spreadsheet"`,
moved there in entry 16) yet render `TextTransformTool` rather than the
Studio app — so they legitimately have no `appEntry`. Rather than
weakening `appEntry`'s meaning (it answers *rendering*: "this page mounts
the Studio app in this mode") or duplicating a mode onto all 44, added a
separate optional `ToolDefinition.capability` answering *navigation*, and
`getToolCapability() = appEntry?.mode ?? capability`. A test asserts no
tool sets both, so the two can't become redundant-and-drifting.

**Thin-content decision.** Three capabilities are real in-app features with
no standalone tool behind them (PDF Studio's Security, Image Studio's View,
Geospatial Studio's Analyze). The literal reading of "every capability has
its own index page" would generate three pages listing zero tools — thin
content that hurts the crawlability goal it's meant to serve. Those three
deliberately get no page (they 404), encoded as "no `indexDescription`,"
with an integrity test asserting the converse so a capability that *gains*
a tool can't silently stay unindexed. Flagged to the user rather than
decided silently.

**Rankings/URL preservation:** purely additive — 13 new URLs, zero
existing URL added, moved, removed or re-canonicalized. No tool page's
title, description, canonical, FAQ or content changed. Duplicate content
avoided by making a capability page a *list* (unique H1, unique
`indexDescription`, only its own tools) rather than another mount of the
Studio app that sits one level above it.

**Verification:** `tsc --noEmit`, lint, and the full Vitest suite —
including two new files, `tests/unit/capabilities.test.ts` (13 tests) and
6 new `registryIntegrity` assertions — pass. A clean production build
statically prerenders all 13 new pages. A new `tests/e2e/
seo-architecture.spec.ts` (15 tests) verifies the parts only a real
browser can: every capability page returns 200 with a self-referencing
canonical, each emits valid `CollectionPage`/`ItemList` JSON-LD whose
`numberOfItems` matches its rendered list, the three tool-less
capabilities return 404 rather than a thin page, the sitemap lists exactly
the pages that exist, structured-data types are consistent per page type,
and Home → Application → Capability → Tool is traversable by clicking
alone. Full Playwright suite (`workers: 1`) passes.

---

## 22. GeoJSON Viewer map bug: mispositioned canvas + polygons never rendering

A user-reported bug with a real screenshot and a real fixture file
(`praha.json`, 2 polygons) — the map rendered detached from its intended
box, overlapping the header, and no polygon appeared on it at all. Both
findings were confirmed empirically in a real browser (Playwright scripts
in the scratchpad, not assumed from reading source) before writing any
fix, and each fix was verified by reverting it and confirming the
regression test actually fails without it — not just that it passes with
it.

**Bug 1 — canvas escapes its container in dev.** DOM inspection showed
`.maplibregl-canvas` positioned at the *viewport's* top-left (`top: 0,
left: 0` relative to the page, not its parent), with zero elements on the
page carrying MapLibre's own `maplibregl-map` class anywhere. Traced
through maplibre-gl's actual minified source: `Map` constructor
synchronously does `container.classList.add("maplibregl-map")`
(`_setupContainer()`), and `Map.remove()` does
`container.classList.remove("maplibregl-map")` — unconditionally, with no
awareness of whether another `Map` instance is still attached to that same
container. React Strict Mode (on by default, dev-only) double-invokes
`GeoMap.tsx`'s map-creation effect on mount; because `createGeoMap()` is
async, the *cancelled* first instance's async continuation can resolve and
call `.destroy()` (→ `Map.remove()`) *after* the *surviving* second
instance has already attached to the same physical container DOM node —
stripping the `position: relative` class the still-live map's `position:
absolute` canvas depends on. Confirmed the exact mechanism with
instrumented logging (temporary, removed after diagnosis): 2 `Map`
instances constructed, 1 destroyed, 1 survives, final DOM has exactly 1
canvas but 0 elements with the MapLibre class.

**Fix:** `GeoMap.tsx`'s container div now sets `relative` itself,
defensively, independent of whichever class-removal race outcome occurs.
**Scope note, checked not assumed:** this race is Strict-Mode-specific and
does not occur in a production build (Strict Mode doesn't double-invoke
effects there), so it never affects real deployed users — confirmed by
reverting the fix, rebuilding for production, and re-running the e2e
suite: the position assertion still passed (only reproducible under `npm
run dev`, exactly where the user's own screenshot came from). The fix is
kept anyway since it's zero-risk and fixes the actual dev workflow this
was hit in.

**Bug 2 — GeoJSON data never renders, on any build (the more serious one).**
With positioning fixed, the basemap rendered correctly but the dropped
polygons still never appeared, and the map wasn't even fitting to the
correct zoom/bounds. Instrumented `maplibreClient.ts` to expose the live
`Map` instance and traced state directly: `setUserData`/`fitToBounds` were
being called correctly on the *right* (surviving) instance, with correct
data and bbox — but `map.getSource("user-data")._workerID` stayed
`undefined` forever, and `map.isSourceLoaded(...)` never became `true`, no
matter how long the test waited. No thrown error, no failed network
request for a worker script anywhere. Root cause, found by reading
maplibre-gl's own minified source directly: it computes its internal
tiling-worker's URL as `new URL("./maplibre-gl-worker.mjs",
import.meta.url)`, assuming its own module is served from the same
directory as that worker file — true for the raw npm package, false once
Next.js/Turbopack bundles the module into a hashed chunk URL. maplibre-gl's
own `getWorkerUrl()` has a guard (`if (!/^https?:/.test(url)) return ""`)
that short-circuits before ever attempting a fetch when the computed
`import.meta.url` doesn't look like a real page URL under Turbopack's
bundling — so the failure surfaces as *nothing at all*, not an error. This
is exactly why the bug looked like "the map works": the raster basemap
source doesn't need this worker, so it rendered fine regardless, while the
GeoJSON source silently never left its unloaded state.

**Fix:** maplibre-gl v6 exports a public `setWorkerUrl()` for exactly this
scenario — the same shape as this project's existing DuckDB-WASM/pdf.js
precedent (rule 4): self-host the library's own worker asset instead of
trusting its bundler-relative auto-discovery. Added
`scripts/copy-maplibre-assets.mjs` (wired into `postinstall`, gitignored
output under `public/maplibre/`, same pattern as `copy-pdfjs-assets.mjs`)
and call `maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs")`
once, right after the dynamic `import("maplibre-gl")` resolves in
`getMaplibre()`. One further wrinkle, also found empirically rather than
assumed: the worker script itself has its own `import ... from
"./maplibre-gl-shared.mjs"`, resolved as a literal relative URL at runtime
since the worker is loaded directly by the browser rather than processed
by Turbopack — copying only the worker file left that import
silently-aborting too (a second, one-level-deeper instance of the exact
same failure mode). Both files must be copied together; the script does.

**Verification, in order:** (1) reverted the `setWorkerUrl` fix and
rebuilt for production — the new e2e test failed with the exact expected
assertion (`color.b - color.r` no longer distinguishable from the
basemap), proving the test has real teeth, not just a passing shape. (2)
Restored the fix, rebuilt again — same test passes. `tests/fixtures/geo/
polygon.geojson` (new, minimal — none of the existing geo fixtures contain
polygon geometry) plus a new `tests/e2e/geo-tools.spec.ts` test samples
the actual composited pixel color at a dropped polygon's fitted center via
a screenshot-and-redecode trick (a live WebGL canvas can't be read with
plain `canvas.drawImage()` — its drawing buffer clears immediately after
compositing, confirmed empirically when a first attempt at this test
returned uniform black — so the test screenshots the canvas element and
decodes *that* PNG through a real `<img>` + 2D canvas instead, the same
technique `tests/e2e/image-tools.spec.ts` already uses for the image
engine's own pixel-level assertions). `tsc --noEmit`, lint, and the full
Vitest suite pass. A clean production build succeeds and
`public/maplibre/` contains both required files. Full Playwright suite
(`workers: 1`) passes.

**Not fixed, flagged for later:** `map/style.ts`'s raster tile URL
template includes a literal `{r}` retina-suffix placeholder that
maplibre-gl doesn't actually support substituting (a Leaflet.js
convention, not a MapLibre one) — CARTO's tile servers tolerate the
literal string and still serve tiles, confirmed the basemap renders
correctly end to end regardless, so this isn't currently breaking
anything. Left alone rather than bundled into this fix, since it's an
unrelated, non-blocking issue outside what was reported — worth a future
one-line cleanup (removing `{r}`) if retina tile sharpness ever becomes a
real complaint.

---

## 23. GeoJSON Viewer: basemap switching, fullscreen, and click-to-highlight

Follow-up feature request after entry 22's bug fix, once the user could
see the map working correctly: an expand-to-fullscreen control, a way to
change the basemap, and a richer feature list — every feature shown (not
truncated), clicking one highlights it on the map, and shows its
coordinates.

**What changed:**
- `map/style.ts`: `BASEMAP_STYLES` now has 3 CARTO raster variants (Light/
  Dark/Voyager), all under the one CSP-already-allowed tile host, so
  switching needs zero CSP change. The `{r}` retina-suffix token flagged
  as "not currently broken, low priority" in entry 22 was removed here —
  triplicating a token that was never doing anything (confirmed then, not
  reconfirmed here) across 3 new style variants wasn't worth carrying
  forward.
- `map/maplibreClient.ts`: added `maplibregl.FullscreenControl()`
  (MapLibre's own, zero custom code); `setBasemap(id)` (calls
  `map.setStyle()`, then replays the last-set user data and selection once
  the new style loads — `setStyle` wipes every source/layer, which isn't
  obvious from the call site); `setSelectedFeature(index | null)`
  (`generateId: true` + `setFeatureState` + a `["case", ["feature-state",
  "selected"], ...]` paint expression per layer — the idiomatic MapLibre
  highlight mechanism, not a re-filter/re-add-layers approach). Selecting a
  feature also pans the camera to it (`easeTo`, zoom untouched) so a
  selection is actually visible on a dataset spanning a wide area.
- `components/tools/VirtualizedTable.tsx` gained optional `onRowClick`/
  `selectedRowIndex` props (both additive — every other caller, including
  Data Studio's View mode, is structurally unaffected; verified by the
  existing 7-test suite still passing unchanged). Reused rather than
  building a second virtualized list for this one tool, and specifically
  chosen over a plain `<table>` because it's already proven against a
  10,000-row case — a dataset with hundreds/thousands of features showing
  *every* row (per the ask) needed that, not just this one's small
  examples.
- `components/geo/GeoJsonViewerTool.tsx`'s property table now derives the
  *full* feature list directly from the already-in-memory parsed GeoJSON
  (`extractFeatureList`/`asRecord`, `engines/geospatial/ops/shape.ts`,
  imported directly rather than routed through the worker — both are pure/
  DOM-free with nothing expensive to offload), not the worker-computed
  `summary.propertyPreview` capped at 5 (that field is untouched, still
  used as-is for the Analyze-style stats block above it). Selecting a row
  shows a coordinate detail panel — a clean "lat, lng" line for a Point,
  pretty-printed raw coordinates for every other geometry type, since
  there's no single-line summary that stays correct for a Polygon's nested
  rings. Falls back to a bare "Feature N" label when nothing in the file
  has properties at all, so even an unattributed geometry file stays
  browsable/selectable rather than the whole list disappearing.
- `GeoMap.tsx`'s basemap `<select>` renders as a *sibling* of MapLibre's
  container div (inside a shared `relative` wrapper), not as a React child
  of it — MapLibre appends its own DOM children into that div
  imperatively, so giving it real React children too would mean two
  systems fighting over one element's child list. The container's `role`
  changed from `"img"` to `"region"` accordingly, since `role="img"` would
  hide the real interactive controls it now hosts (MapLibre's zoom/
  compass/fullscreen buttons, the basemap picker) from assistive tech.

**What did NOT change:** any tool's URL, any existing tool's default
rendering (`VirtualizedTable`'s new props are both optional), the worker-
computed `summarizeGeoJson()`/`GeoJsonSummary` shape, or `GpxViewerTool`/
`CsvToGeoJsonTool` (both share `GeoMap` via `LazyGeoMap`, so they gained
fullscreen/basemap-switching automatically, for free, without their own
code changes — confirmed via the full `geo-tools.spec.ts` run, not
assumed).

**Verification:** `tsc --noEmit`, lint, and the full Vitest suite —
including a new `tests/unit/geoMapStyle.test.ts` (asserts all 3 basemaps
exist, stay on the CSP-allowed host, and carry no unsubstituted `{r}`) and
3 new `VirtualizedTable` tests (default behavior unchanged when the new
props are omitted; `onRowClick` reports the absolute row index, not a
windowed one; `selectedRowIndex` highlights exactly one row) — pass. A
clean production build succeeds. Four new `tests/e2e/geo-tools.spec.ts`
tests, using a new `tests/fixtures/geo/many-points.geojson` (7 named
points, since none of the existing fixtures have enough distinctly-named
features to prove the 5-row cap is actually gone): all 7 dropped features
appear (not truncated); clicking a row sets `aria-selected`, shows the
correct "lat, lng" coordinate text, and "Clear selection" removes both;
the fullscreen control renders; switching to "Dark" triggers a real
network request for `dark_all` tiles. Full Playwright suite (`workers: 1`)
passes, including the existing "coordinates never sent over the network"
privacy test (unaffected — all 3 basemap variants share the same CSP-
scoped host and URL-construction logic, only the path segment differs).

---

## 24. Feature list gets a Type column; a real flaky test found and hardened

Small follow-up once entry 23's feature list was actually in front of the
user: rows named by whatever a file's author chose (`"asdf123"`, `"!!zzz!!"`)
gave no way to tell a Point from a Polygon at a glance. Added a leading
"Type" column to `GeoJsonViewerTool`'s table, computed straight from each
feature's own `geometry.type` — deliberately not derived from any property,
since a `name` field is free-text the file's author wrote and was exactly
the thing not to be trusted here. New `tests/fixtures/geo/weird-names.geojson`
(a Polygon/Point/LineString each carrying a deliberately unhelpful name)
plus a new e2e test assert the Type column shows the right geometry type
for each, independent of what the name says.

**A real, pre-existing flaky test was found and fixed along the way, not
caused by this change.** Running the full `geo-tools.spec.ts` file (32
tests together) failed the polygon-pixel-color assertion from entry 22 —
`renders the map inside its own container, and renders the dropped polygon
on it`; running that same test alone immediately after passed cleanly.
Root cause: the test slept a fixed `2000`ms then sampled the canvas once,
which isn't robust to normal variance in tile-fetch + GeoJSON-worker timing
under load (e.g. running back-to-back with 31 other tests in one worker
process) — a fixed sleep can't distinguish "still legitimately loading"
from "actually broken," while a real user waiting slightly longer than 2
seconds would have seen the correct result. Fixed by switching to
`expect.poll(...)`, retrying the same screenshot-and-decode sampling every
tick for up to 15s instead of sampling once after a guess — genuinely
faster in the common case too (resolves the instant the condition is true,
measured ~1.8s vs. the old fixed 2s+ wait), not just more tolerant of slow
runs. Confirmed fixed by re-running the full 32-test file plus the single
test 3x in a row (`--repeat-each=3`) — all green, whereas before this fix
the full-file run had already demonstrated it could fail. First instance
in this codebase of `expect.poll` for e2e assertions — worth reaching for
again over a `waitForTimeout` + single sample whenever a test asserts on
something that finishes loading asynchronously with no other observable
"done" signal to wait on directly.

**Verification:** `tsc --noEmit`, lint, and the full Vitest suite pass. A
clean production build succeeds. Full `tests/e2e/geo-tools.spec.ts` (32
tests, including the new Type-column test and the newly-hardened
polygon-rendering test) passes, confirmed stable via a 3x repeat of the
previously-flaky test specifically. Full Playwright suite (`workers: 1`)
passes.

## 25. GeoJSON Viewer: switching the basemap could permanently lose the loaded data

Real bug report: switching the map's basemap style made the loaded
GeoJSON's points/polygons/lines disappear — and switching back to the
original style did *not* bring them back either. Root-caused entirely
inside `engines/geospatial/map/maplibreClient.ts`'s `waitForLayers()`/
`setBasemap()`, in two layers, both confirmed empirically (real Playwright
scripts against the live dev server, plus reading maplibre-gl's own source
in `node_modules`, not assumed from its docs) before being fixed:

1. **`"load"` vs. `"style.load"`.** The original code waited on
   `map.once("load", finish)` to know when it was safe to add the GeoJSON
   source/layers. maplibre-gl's own `.d.ts` documents `"load"` as firing
   once — "the first visually complete rendering of the map" — and never
   again after `setStyle()`; `"style.load"` fires on the initial load *and*
   every subsequent `setStyle()`. With `"load"`, every `setBasemap()`
   call's internal `ready` promise was permanently unresolved: the user's
   data never got re-added to the new style, and switching back to the
   original basemap didn't recover it either, since `ready` was already a
   dead promise. Fixed by switching to `"style.load"` (and the matching
   synchronous check, `isStyleLoaded()`, not `loaded()` — the latter also
   factors in tile loading, irrelevant to whether it's safe to call
   `addSource`/`addLayer`).
2. **A synchronous-event race, found only after the first fix still left
   the very first `setBasemap()` call broken.** Reading maplibre-gl's
   source (`node_modules/maplibre-gl/dist/maplibre-gl-dev.mjs`): `setStyle()`
   diffs the new style against the current one, and when the diff can be
   applied without a full rebuild (`Style.setState()`), it fires
   `"style.load"` *synchronously*, inside that same `setStyle()` call —
   not on a later tick. The code called `map.setStyle(...)` first and only
   registered `map.once("style.load", ...)` afterward, so on whichever
   switch happened to take that synchronous path, the event fired and was
   gone before anything was listening for it — confirmed with a
   `setInterval` poll showing `isStyleLoaded()` flip `true` within one
   tick of `setStyle()` while a listener registered just after it never
   fired at all. Fixed by threading the actual `setStyle()` call through
   `waitForLayers(trigger)` as a callback invoked *between* registering the
   listener and a synchronous `isStyleLoaded()` fallback check — safe
   regardless of which internal path (sync diff vs. async full reload) a
   given switch takes. An intermediate attempt got this wrong in the other
   direction: calling `waitForLayers()` before `setStyle()` with the
   fallback check evaluated immediately caught the *previous* style's
   already-loaded state and resolved the promise before the switch even
   started, silently losing the real post-switch event since the promise
   was `.once()` and already spent — caught immediately by re-running the
   same empirical Playwright check, not assumed fixed from the code alone.

New e2e test in `tests/e2e/geo-tools.spec.ts`, "switching the basemap —
including the very first switch — preserves the loaded GeoJSON on the
map": drops `polygon.geojson`, samples the polygon's blue fill at the
canvas center (same technique as entry 22's test) before any switch, after
switching to dark (the first-ever switch, which is what reproduced the
bug), and after switching back to light — using `expect.poll` per entry
24's precedent, not a fixed sleep.

**Verification:** `tsc --noEmit`, lint, and the full Vitest suite (634
tests) pass. A clean production build succeeds. Before writing the
permanent test, the fix was verified with real, throwaway Playwright
scripts against the live dev server: pixel-counting a 7-point dataset
across a `["voyager", "dark", "light", "dark", "voyager", "dark"]` switch
sequence (all 6 switches correctly show all 7 points, where the first
switch previously showed 0), and a separate polygon-fill check across the
first switch and back. Full Playwright suite (`workers: 1`) passes.

## 26. Studio tool pages become deep-link entry points, not second implementations

Goal: each Studio should have exactly one implementation of its UI, with an
individual tool URL initializing that shared app in the right state rather
than rendering a parallel copy — and without an HTTP redirect, a URL change,
or any loss of the tool page's own SEO identity.

**Most of this was already true, and the audit mattered more than the
refactor.** Classifying all 78 tool pages first (rather than assuming the
premise) found 44 of them already rendering `<StudioApp initialTab=...
locked*Action=... />` — the exact target architecture, built incrementally
by the four earlier Studio-unification passes (entries covering Data, PDF,
Image and Geospatial Studio). The real remaining gaps were narrower and
different from "many pages duplicate the Studio UI":

1. **Three byte-identical private copies of `ActionPicker`** (Geo, Image and
   PDF Studio each had one, ~35 lines, confirmed identical with `diff` rather
   than by eye — a code comment in each even documented the duplication as
   deliberate: "not shared — each Studio owns its own, matching precedent").
   Consolidated into `components/app-shell/ActionPicker.tsx`. Each Studio
   still owns its own action ids/labels, which are genuinely per-Studio data;
   only the rendering is shared.
2. **The 9 JSON/XML/YAML tools** (`json-formatter`, `json-minifier`,
   `xml-formatter`, `json-validator`, `xml-validator`, `json-to-xml`,
   `xml-to-json`, `json-to-yaml`, `yaml-to-json`) — the last Studio-owned
   tools whose pages rendered bespoke UI. Each had its own colocated
   `TextTransformTool` wrapper next to its `page.tsx`, and each was the
   reason `ToolDefinition.capability` existed as a parallel field to
   `appEntry`.

The 9 collapsed into one parameterized `components/spreadsheet/
StructuredTextTool.tsx` (an `action` prop, same "parameterize, don't
duplicate" shape as `GeoConverterTool`'s `kind` and `DiffTool`'s `mode`),
which `SpreadsheetDataApp` now mounts from new second-level action pickers
in its Edit/Analyze/Convert tabs. Each action id *is* the owning tool's
registry slug, so a page passes its own slug straight through as the locked
action. Two incidental de-duplications came free: the JSON and XML
formatters' hand-rolled indent radio fieldsets both became the pre-existing
shared `RadioOptionGroup`.

**Deliberate scoping decisions:**
- **The action picker is hidden whenever `lockedFormat` is set.** A page
  committed to one file format (`/tools/csv-viewer`) has no business
  offering JSON/XML text tools in its Edit tab, and this also keeps all 44
  pre-existing Studio pages pixel-identical — the new actions only surface
  on the hub and on the 9 tools' own pages.
- **`initial*` preselects; `locked*` also hides the picker.** A locked page
  still switches top-level tabs, which is what makes it a superset entry
  point rather than a dead end — asserted directly in the new tests.
- **Developer Toolkit was excluded**, because it deliberately isn't a Studio
  (CLAUDE.md rule 10) — there is no unified app to deep-link into. Its 25
  tools already reach single-implementation via shared parameterized
  components (`TextTransformTool`, `TextStatsTool`, `DiffTool`). Forcing a
  Studio shell around them to satisfy "apply this everywhere" would have
  contradicted an explicit standing architectural decision to buy nothing.
- **`ToolDefinition.capability` was kept, not deleted**, even though no tool
  uses it now. It remains the supported escape hatch for a future Studio
  tool with genuinely bespoke UI, and its fallback branch in
  `getToolCapability` is now unit-tested against a synthetic tool so a dead
  branch can't rot unnoticed.

**SEO is unchanged by construction, not by care.** The 9 pages kept their
`page.tsx` entirely — `generateMetadata`, `StructuredData`, `ToolPageLayout`,
FAQ and How-it-works steps all untouched; only the single child element
swapped from `<JsonFormatterTool />` to `<SpreadsheetDataApp initialMode=
"edit" lockedEditAction="json-formatter" />`. Their registry entries swapped
`capability: "edit"` for `appEntry: { app: "spreadsheet-data", mode: "edit" }`
with the *same* mode, so `getToolCapability` returns exactly what it did
before and every capability index page lists exactly the same tools.

**Verification:** the deep-link contract was checked empirically in a real
browser before any permanent test was written — a throwaway Playwright script
confirming, for four representative entry points, that the URL never changes,
the right tab arrives preselected, the tool works immediately with no second
selection, the locked page hides its action picker while keeping tabs
switchable, the hub exposes the same tools as in-app actions, and no page
errors fire. That became a permanent 11-test "Data Studio deep-link entry
points" block in `tests/e2e/structured-data-tools.spec.ts`, which additionally
asserts a real 200 at each path (never a redirect), the canonical URL still
being the tool's own, and JSON-LD still parsing with a schema.org context.
One pre-existing unit test failed as expected (it asserted json-formatter had
*no* `appEntry` — the old architecture) and was rewritten to assert the new
one plus the retained fallback branch. `tsc --noEmit`, lint, full Vitest
(635 tests), a clean production build and the full Playwright suite all pass.

## 27. Geospatial Studio gains the core GIS workflows (CRS, geometry ops, analysis)

Expanded Geospatial Studio from "view/convert/simplify/validate" into a
toolbox covering the operations a browser-based GIS is actually expected to
have, without adding a single new top-level tab — everything landed under the
existing View/Edit/Analyze/Convert capabilities.

**Coordinate reference systems (the headline).** New `ops/crsRegistry.ts` +
`ops/crs.ts`, built on `proj4` (the one genuinely new runtime dependency;
`utm` remains for the unrelated text-based coordinate converter). Source and
target are searchable by EPSG code, name or alias — "krovak", "british
national grid" and "4326" all resolve — with quick-select buttons for the
four the spec called out (4326 / 3857 / 5514 / 25833) and a paste-your-own
proj4/WKT escape hatch.

- **A curated CRS registry, not a bundled EPSG database.** proj4 transforms
  between any two systems but only once handed a definition string, and it
  ships only two built in. Bundling all ~6,000 EPSG codes would cost
  megabytes in a browser-only app; ~24 curated global/national systems plus
  a custom-definition input covers real files without that. Documented in the
  module's own header so the trade-off isn't rediscovered later.
- **The transform walks the document directly rather than going through
  turf**, because turf's helpers normalize away exactly what must survive:
  feature `properties`, feature `id`, foreign members, and the precise
  geometry type (turf refuses `GeometryCollection` outright). Only the
  innermost `[x, y]` pairs change; everything else survives because the
  operation clones the input and mutates nothing else.
- **CRS is detected, never assumed.** A legacy 2008-style `crs` member is
  read and adopted automatically; a file without one is reported as
  undetected rather than silently treated as WGS 84 — assuming would quietly
  corrupt exactly the projected files this tool exists for.

**Geometry operations** (`ops/geometry.ts`): Buffer (configurable distance +
units, positive and negative), Dissolve (optionally by attribute), Merge
Features, Split Multi Geometry. **Analysis** (`ops/analysis.ts`): Centroid,
Bounding Box, Convex Hull, Feature Statistics. **Geometric validation**
(`ops/topology.ts`): self-intersections, consecutive duplicate vertices,
degenerate and zero-area rings — merged into the existing validator's issue
list, which already had the right `ValidationIssue` shape and UI.

**Two real bugs were caught by verification, not by types:**

1. **The Krovak definition was ~1,200 km wrong.** The first draft used
   `+lon_0=42.5` instead of `24.8333…`, putting Prague at (-1965925, -720556)
   instead of (-744241, -1042539). `tsc`, lint and a naive "does it produce
   output" check would all have passed. Caught by unit tests asserting
   *reference coordinates* for four landmarks, which are now permanent —
   plus a round-trip assertion per CRS.
2. **The CRS tool silently transformed nothing.** All three new components
   passed `parseAnyGeoFile`'s `{ geojson, sourceFormat }` wrapper straight to
   the engine instead of the document inside it. Buffer failed loudly
   ("Unrecognized GeoJSON type"), but reprojection failed *silently* — the
   wrapper matched no branch, so the file downloaded unchanged and the
   browser check passed. Only after strengthening that check to parse the
   actual download and assert S-JTSK metre ranges did it surface. The
   permanent e2e test asserts output values for exactly this reason.

**One feature was deliberately removed after it was built.** The topology
checker originally flagged RFC 7946 ring winding order. It works, but this
repo's own `sample.geojson` — hand-written and valid by every practical
measure — has a clockwise exterior ring, as does much real data, and nothing
in the pipeline cares (MapLibre and turf both ignore winding). A warning
nobody can act on devalues the self-intersection findings next to it, so it
was cut and the reasoning recorded in `checkRings`' doc comment. Keeping "a
clean file reports no problems" true was worth more than spec pedantry.

**Architecture.** The seven load→derive→download operations share one
parameterized `GeoOperationTool` (`operation` prop) rather than seven
near-identical components — same shape as `GeoConverterTool`'s `kind` and
`StructuredTextTool`'s `action`. CRS got its own component only because two
searchable pickers plus auto-detection is a genuinely different interaction.
All new ops run in the existing Comlink worker alongside validate/simplify;
all reuse `extractFeatureList`/`asRecord` for root-shape dispatch rather than
re-implementing it. Four new SEO landing pages (`crs-converter`,
`geojson-buffer`, `geojson-dissolve`, `geojson-statistics`) are locked deep
links into the Studio per entry 26's pattern — no duplicated UI. Adding
`geojson-statistics` gave Geospatial Studio's Analyze capability its first
standalone tool, so it earned an index page (`/geospatial-tools/analyze`)
that was deliberately absent while it hosted only the in-app summary.

**Verification:** 37 new geometry/analysis/topology unit tests + 28 CRS unit
tests (701 total), 9 new e2e tests (42 in `geo-tools.spec.ts`), a full
real-browser pass before any permanent test was written, `tsc --noEmit`,
lint, a clean production build and the full Playwright suite.

## 28. Studio pages drop the capability nav and Related Applications block

Product decision: the four Application pages (`/data-studio`, `/pdf-tools`,
`/image-tools`, `/geospatial-tools`) no longer render the "Browse by
capability" pill nav or the "Related applications" cross-link block. Both
lived in `components/studio/StudioLayout.tsx`, so removing them there covered
all four at once and left `ToolPageLayout`, capability pages and Developer
Toolkit pages untouched.

**The crawl consequence is real and worth recording.** `StudioLayout` was the
*only* internal link into the capability index pages — the homepage's
Applications grid renders capability labels as plain text (`.join(" · ")`),
not links, and the header nav links Applications only. So the 14 capability
pages (`/data-studio/view`, `/pdf-tools/pages`, …) are now reachable through
`sitemap.xml` alone. They are still real, indexable, canonical pages that
link down to their tools and sideways to siblings; what they lost is any
inbound link from within the site. The Application → Tool path still works
via each Studio page's own "Related tools" list, so nothing became
unreachable — only the middle layer lost its entry point. If that layer is
ever meant to earn organic traffic, the fix is one inbound link from
somewhere, not restoring the whole nav.

> **Closed in entry 36.** That "one inbound link from somewhere" is now the
> tool-page breadcrumb: `ToolPageLayout` renders Home → Application →
> Capability → Tool, so all 56 Studio-owned tool pages link up into the 14
> capability pages. The removal recorded above still stands — Studio pages
> render neither the capability nav nor `RelatedApplications`, and the tests
> asserting that are unchanged.

Three `seo-architecture.spec.ts` tests asserted exactly what was removed and
were rewritten rather than deleted, so the new intent is now the thing under
test: a Studio page must render *neither* nav (locking the removal in), the
`RelatedApplications` block still works on the index pages that kept it, and
the crawl path is now Home → Application → Tool, with Capability → Tool
verified separately for sitemap arrivals.

**Verification:** `tsc --noEmit`, lint, full Vitest (701), a clean production
build and the full Playwright suite all pass.

## 29. Geospatial Studio gets one shared file workspace and format-gated actions

Two user-reported problems, one root cause: every geo tool owned its own
`file` state and its own `FileDropZone`. Switching tabs unmounted the tool and
silently discarded the loaded file, and each tab presented yet another drop
zone asking for a specific format.

**`components/geo/GeoWorkspace.tsx`** now owns the file, its detected format,
the parsed GeoJSON (or CSV table) and the bbox, and renders the Studio's one
drop zone above the tabs. All ten tools became presentational, reading
`useGeoWorkspace()` — roughly 60 lines of duplicated file/drop/clear/error
handling deleted per tool. `GeospatialStudioApp` split into a thin provider
wrapper plus a body that consumes the context (a component can't consume a
provider it renders itself).

**Actions are gated on the detected format** (`actionFormats.ts`): an action
the file can't support is `aria-disabled` with a `title` explaining why, and
the picker falls back to the first supported action instead of mounting a tool
that can't read the file. `aria-disabled` rather than `disabled` is
deliberate — a truly disabled button is skipped by keyboard focus and fires no
mouse events in several browsers, so the tooltip carrying the explanation
would never show. Playwright confirmed the semantics from the other side: it
refuses to click an `aria-disabled` element at all, so the permanent test
needs `force: true` to prove the app's own handler is *also* a no-op.

**Two lint rules shaped the final design more than the original plan did.**
`react-hooks/set-state-in-effect` rejected the obvious "reset previous results
at the top of the load effect" pattern in all ten tools. Rather than fight it,
the workspace exposes a `documentKey` that bumps on every load/clear and is
folded into each tool's React `key` — a new file remounts the tool with fresh
state, so there is nothing to reset. The same rule rejected
`setIsLoading(true)`, which turned out to be a genuine improvement: every
tool's loading flag is now *derived* (`!result && !error`) instead of stored,
so a spinner can't get stuck out of sync with the data. `rules-of-hooks` also
caught `useMemo` calls that had ended up below an early return during the
refactor.

**Test coverage moved with the behaviour rather than being deleted.** The four
geo component tests drove each tool's own drop zone, which no longer exists.
They now use a small `tests/component/geoWorkspaceHarness.tsx` that injects an
already-loaded document via the exported `GeoWorkspaceContext` — so they test
the tool, not the file pipeline. The two "shows a friendly error for malformed
GeoJSON" tests mocked a parser the tools no longer call; that behaviour is now
the workspace's, so they were replaced by a new `GeoWorkspace.test.tsx` (5
tests) covering detection, the CSV branch, parse errors, `documentKey`
bumping, and clearing.

Two pre-existing e2e tests asserted the old architecture and were rewritten,
not deleted. One is now a better assertion than before: dropping a GPX while
the GeoJSON viewer is active auto-selects the GPX viewer, where previously the
user had to switch action *and* re-drop the file. The other ("Coordinate
Editing shows a placeholder — no file drop") asserted zero file inputs on the
page; the shared drop zone is always present now, so it asserts one, while
keeping what the test was really about — that the placeholder does no engine
work and makes no off-origin request.

**Verification:** a real-browser pass first (one drop zone; file surviving all
four tab switches; gating disabling GPX-only actions for a GeoJSON and
flipping when a GPX is loaded; a disabled click doing nothing; a tool running
off the shared file without a re-drop; the locked `/geo/geojson-buffer` page
still working), then made permanent as 4 new e2e tests. `tsc --noEmit`, lint,
full Vitest (704), a clean production build and the full Playwright suite all
pass.

## 30. Full EPSG catalogue search, and a real diff viewer

Two user requests: "can the CRS converter search *all* CRS, not just a few?"
and "make Text Diff more professional, like diffchecker".

**CRS: 24 curated systems became 8,017.** `scripts/generate-epsg-index.mjs`
trims the `epsg-index` dev dependency (~16 MB, never shipped) to the four
fields the picker needs, as positional arrays rather than objects — 1.23 MB
raw, **141 KB gzipped**, lazy-loaded as its own chunk on the first search.
The curated list stays in the main bundle as the instant layer: quick-select
buttons and the first keystrokes answer synchronously with nothing
downloaded, and curated entries merge ahead of bulk ones so a common CRS
keeps its aliases and hand-verified definition.

The worker never loads the catalogue. `CrsConverterTool` resolves a code to
`{ code, proj4 }` on the main thread and sends that pair; `resolveCrs` now
accepts either form (`CrsRef`). Existing callers pass plain strings and are
unaffected.

A satisfying independent confirmation: the generated index's EPSG:5514
definition is character-for-character the one entry 27 arrived at by hand
after the `lon_0=42.5` bug — including `lon_0=24.8333333333333`.

**Diff: a genuine viewer instead of a tinted `<pre>`.** The engine now
returns aligned `rows` alongside the existing flat `lines` (kept as the
export shape, so the old tests still pin it): per-side line numbers, a
`modified` type pairing each deletion with the addition that replaced it,
word-level segments inside those pairs, and `blockIndex` grouping contiguous
changes. The UI gained split/unified views, line numbers on both sides,
word-level highlighting, next/previous navigation over change blocks with
`n`/`p` shortcuts, an added/removed/unchanged summary, and ignore-case /
ignore-whitespace options.

**Three library behaviours had to be worked around, two found by tests:**
1. `diffLines` accepts neither `ignoreCase` nor a `comparator` — only
   `diffArrays` does. Case-insensitive comparison routes through `diffArrays`
   over pre-split lines; the default stays on `diffLines` so the common case
   is unchanged.
2. **The `diff` library returns the *new* string's value for loosely-matched
   tokens.** So with ignore-case on, the left column showed the *right*
   side's casing — exactly the "text the user never wrote" problem the
   comparator approach was chosen to avoid. Caught by a test asserting the
   original casing survives; fixed by reading left-hand text back out of the
   original array by position (`ChangePart.leftValue`).
3. `diffLines("a", "a\nb")` reports a removal of `"a"` plus an addition
   of `"a\nb"` rather than a shared `"a"`, so the row model paired two
   byte-identical lines into a `modified` row — a highlighted "change" where
   nothing changed. Identical pairings are now reported as `unchanged`.

Two pre-existing e2e tests asserted the old summary wording
("+1 additions" / "-1 deletions") and were updated to the new labels; the
counts they check are unchanged.

**Verification:** a real-browser pass first (searching 2065 / Lambert / NAD83
against the full catalogue and converting with a catalogue-resolved
definition; line numbers, word-level marks, change stepping, view toggle and
ignore-case in the diff), then made permanent as 8 new e2e tests and 15 new
unit tests. `tsc --noEmit`, lint, full Vitest (718), a clean production build
and the full Playwright suite all pass.

---

## 31. Closing two PDF honesty gaps: XMP metadata, and signed documents

Two items from §9's "known limitations" list, both cases where the product
*disclosed* a shortcoming rather than fixing it. Disclosure is the right
answer for a genuine capability limit; it's the wrong answer when the fix is
reachable, and both of these turned out to be reachable.

### Remove Metadata now strips the XMP stream too

`removePdfMetadata` dropped the Info dictionary via
`trailerInfo.Info = undefined` and left the catalog's `/Metadata` XMP stream
untouched — the packet Acrobat, InDesign, Word and most scanner software
write *alongside* the Info dictionary, which commonly repeats the author and
title and adds tool, device and edit-history detail. For a tool whose one job
is stripping identifying data before a document is shared, "we also left a
second copy of your name in the file, see the FAQ" isn't good enough.

**The obvious fix is wrong, and a fixture caught it.**
`doc.catalog.delete(PDFName.of("Metadata"))` returns `true` and looks
successful — but the XMP packet still appears verbatim in the saved bytes.
Deleting the dictionary entry removes the *reference*; the stream is a
separate indirect object that `save()` goes on serializing. The object has to
be dropped from the context as well (`PDFContext.delete(ref)`). Both calls
are public pdf-lib API — `PDFDict.delete` and `PDFContext.delete` are on the
published type surface, so no private internals are touched. Page-level
`/Metadata` is removed too, since it's a legal (if uncommon) second home for
the same data.

This is exactly why the task called for asserting against output *bytes*
rather than a re-parsed document: a parser-level check would have reported
success while the packet sat in the file.

### A second bug found on the way: the Metadata Viewer was inventing data

pdf-lib calls `updateInfoDict()` **in its constructor**, not at save time,
and it unconditionally sets `Producer`/`Creator` to its own name and
`ModDate` to *now*. Two consequences, both real:

1. `removePdfMetadata` was putting metadata straight back into the file it
   had just cleaned — including a fresh timestamp revealing when the file was
   processed.
2. More seriously, **`readPdfMetadata` was reporting fabricated values**. The
   Metadata Viewer showed today's date as every document's modification date;
   confirmed against `multi-page.pdf`, whose real ModDate is days older than
   what the viewer displayed. A read-only tool was mutating what it reported.

Both fixed by threading a `preserveMetadata` option through
`loadPdfDocument()` (which maps to pdf-lib's public `updateMetadata: false`
load option) and using it on all three read-only/cleaning paths. Neither bug
was in the task brief; the first surfaced because a test asserted
`producer` was undefined after removal, the second because the fix for it
didn't work until the *reader* stopped mutating too.

### Signed PDFs: warn, never block

`hasDigitalSignature()` lives in `structural/load.ts` — the same single choke
point every structural operation already goes through — and walks the AcroForm
field tree for `/FT /Sig`. The walk is iterative with a visited set rather
than recursive: PDF field names are hierarchical, a signature is commonly a
leaf under a parent field, and a malformed or hostile file can point `/Kids`
back at an ancestor.

**Deliberately the opposite treatment from encryption.** An encrypted PDF is a
hard `ProcessingError` because pdf-lib genuinely cannot read its content. A
signed PDF processes perfectly well — pdf-lib just doesn't understand
signatures, so the output is unsigned. Blocking it would remove a capability
the user has; saying nothing would let them ship a file whose signature
silently stopped verifying. So it's a non-blocking `PdfSignatureWarning`
shown right after the file is inspected, while it can still change their
mind, plus an FAQ entry on all seven affected tools. An e2e test asserts the
encrypted path still hard-rejects, so the softer path can't be mistaken for a
loosening of the harder one.

PDF→Images and PDF→Text are deliberately **not** warned: their output isn't a
PDF, so there's no signature anyone would expect to survive. Images→PDF
builds a new document, so no source signature exists.

### Fixtures

`scripts/generate-pdf-metadata-fixtures.py` (pypdf, dev-only — same
precedent as the existing encrypted-PDF fixture script; pdf-lib can write
neither XMP nor signature fields) produces `with-xmp.pdf`, carrying an Info
dictionary *and* an XMP stream with distinct sentinel strings in each so a
test can tell which one survived, and `signed.pdf`, carrying a real
`/FT /Sig` AcroForm field. The script asserts its own output before writing,
so a broken fixture fails at generation rather than inside a test.

`signed.pdf` is a structurally valid signature *field*, not a
cryptographically valid signature — sufficient here precisely because the
engine only ever detects the field's presence and never validates anything.

**Verification:** `tsc --noEmit`, lint, full Vitest, a clean production build
and the full Playwright suite. 12 new unit tests (byte-level assertions for
XMP removal, signature detection across signed/unsigned fixtures, signed PDFs
still processing, the encrypted rejection still firing, and the
non-mutating-reader regression) and 6 new e2e tests (the warning on
merge/split/remove-metadata, its absence on an unsigned file, the encrypted
hard-rejection, and a byte-level XMP check against the actual downloaded
file).

---

## 32. Three resilience gaps closed: RPC timeouts, stale-request guards, PDF build progress

Three items that had been *documented* rather than fixed — one in
PRIVACY_ARCHITECTURE.md §6, two in §9's "known limitations" list. They share
one failure mode: **the UI showing a state that no longer matches reality** —
a spinner for work that will never finish, a page list belonging to a file the
user already replaced, a static "Processing…" for an operation with no visible
end.

### A. Every worker RPC now runs under a timeout

`engines/shared/workerClient.ts` gained `createLazyEngineWorker(spawn,
{ timeoutMs })`, which now owns what each of the four engines' `index.ts`
files used to hand-roll: the lazy `new Worker(...)`, the cached handle, and —
new — a per-call ceiling. On expiry it terminates the worker, drops the
handle, and rejects with a `ProcessingError`.

- **Why terminate-and-respawn rather than just reject.** A worker the browser
  killed for OOM never answers *any* call, so reusing the handle would turn
  one stuck operation into a permanently broken tool for the rest of the
  session. Dropping it means the next attempt gets a fresh worker. Concurrent
  calls on the same worker each carry their own timer, so none of them can
  hang instead.
- **A new `TIMEOUT` code, not a reused one.** `WORKER_CRASH` means the worker
  reported a failure; a timed-out worker said nothing at all, and a browser
  gives application code no way to tell "OOM-killed" from "wedged". Claiming
  `OUT_OF_MEMORY` would be a guess presented as a diagnosis. `ErrorPanel`
  shows the same four recovery suggestions for `TIMEOUT` as for
  `OUT_OF_MEMORY`, since the practical advice is identical.
- **The analytics union was quietly out of sync.**
  `ProcessingFailedPayload.errorCode` was typed `string`, so it accepted
  anything and no compiler check tied it to `ProcessingErrorCode`. It's now
  the code type itself — which is what makes adding a code on one side
  visible on the other.
- **`keepAlive`.** `call(fn)` hands `fn` a `keepAlive()` that restarts the
  clock. Any call that reports progress wires it up, so "slow but
  demonstrably alive" can never be mistaken for "dead" — this is what lets
  the ceiling be a safety net rather than a cap on file size.

**The value was measured, not picked.** Timed in a real Chromium against a
production build, wall-clock from drop to finished result:

| operation | time |
| --- | --- |
| 50,000-row / 6.2 MB CSV → table | 1.3 s |
| 50,000-row / 6.2 MB CSV → .xlsx | 1.9 s |
| **250,000-row / 32 MB CSV → .xlsx** | **14.4 s** |
| 60-page PDF ×2 → 120-page merge | 0.08 s |
| 3000×2000 PNG → resize | 0.22 s |
| 8000×6000 PNG → resize | 0.85 s |
| 50,000-feature / 8.6 MB GeoJSON → validate | 0.98 s |
| 200,000-feature / 36 MB GeoJSON → validate | 5.0 s |

Default: **120 s** — ~20× the worst non-Spreadsheet case on files far larger
than realistic ones, leaving room for a device several times slower than this
one. The Spreadsheet engine is the single override at **600 s**: SheetJS
scales superlinearly (5× the rows cost 7× the time), Excel's own row limit is
4× beyond the largest case measured, and no SheetJS call reports progress to
reset the clock. Stretching the shared default to cover that one outlier
would have made every other engine's ceiling meaninglessly loose. A timeout
that fires on a legitimate large file would be worse than the stuck spinner it
replaces, which is the whole reason for measuring rather than guessing.

**Verified in a real browser before the permanent test was written.** A
throwaway Playwright script swapped `window.Worker` for one running
`self.onmessage = () => {}` — a live worker that never answers, which is the
shape an OOM kill actually leaves behind (no error event, no rejection, just
silence) — then drove a real PNG→JPG conversion. The error surfaced at
**120.4 s** reading "This is taking much longer than expected (over 120
seconds), so it was stopped," confirmed by screenshot. A unit test with a
mocked clock would have proven the branch exists, not that a hung RPC actually
reaches the user as an error. The permanent unit tests
(`tests/unit/workerClient.test.ts`) use a real MessagePort-backed silent
endpoint with a small explicit `timeoutMs`, so they cover the same behaviour
without a two-minute test.

### B. Stale-request guards in the PDF page tools

`PdfPageWorkspaceTool` and `PdfSplitTool` open a file across two awaits
(`inspectPdfFile`, then `openPdfRenderSession`) and had no protection against
a second drop landing mid-flight. The bug was worse than "results could arrive
out of order": whichever run finished *last* won `setEntries`/`setFiles`, so a
page list from one file could be paired with render sessions from another, and
the loser's sessions were never closed at all.

**Which pattern.** `ParquetViewerTool`'s `cancelled` flag is effect-local;
`GeoWorkspace`'s `documentKey` remount is for a provider that owns the file.
Neither fits here — the work starts in an *event handler*, so the guard is a
`useRef` token, bumped on every drop and on Clear, captured at the start of
each run and re-checked after every await. `react-hooks/set-state-in-effect`,
the rule that shaped the other two patterns, doesn't apply to an event handler
at all — checked against the actual lint run, not assumed. Signature detection
moved from a mid-flight `setHasSignature(true)` into a local variable
committed at the end, so a superseded run can't leave its warning behind, and
a superseded run closes whatever sessions it had opened.

**Two things the test had to get right, both found the hard way.** Firing a
second file at the same `<input>` does nothing: React's input-value tracking
suppresses the second `change` when jsdom leaves `value` at `""` both times,
so the test looked like a two-drop scenario while only ever running one drop.
The second file goes in through a real `drop` event instead. And the
superseded run has to be stalled at `openPdfRenderSession`, not
`inspectPdfFile` — stalled at the first await it bails at the first checkpoint
without ever holding a session, which never exercises the cleanup path that
actually leaked.

### C. Real progress for Merge/Extract/Delete/Reorder/Rotate/Split

**Per-page granularity, not per-source-file** — the brief allowed the coarser
fallback, but `buildPdfFromSelection`'s copy loop is already per-page, so
nothing had to be restructured. Per-file would have been useless for the
common case anyway: rotate/extract/delete/reorder all pass a single source,
where it could only ever report 0% then 100%.

- `onProgress` is an optional parameter threaded engine-side; output is
  identical with and without it (asserted by a test), so it stays strictly
  observational.
- Reports are capped at ~100 per build, so a 5,000-page selection doesn't turn
  into 5,000 `postMessage`s.
- The callback crosses the worker boundary via `Comlink.proxy`, re-exported as
  `proxyCallback` from `workerClient.ts` so engines still never import Comlink
  directly. Its counterpart `releaseProxiedCallback` closes the MessagePort in
  the worker's `finally` — without it, every call with a progress callback
  leaks a port for the worker's lifetime.
- The proxied callback is passed *whether or not* the caller wants progress,
  because it also drives `keepAlive` (A) — a huge but healthy merge extends
  its own deadline.
- Split calls the same primitive once per part and folds each part's progress
  into its slice of one bar ("Part 2 of 2 — Copying page 1 of 2…"), rather
  than restarting the bar per part.

### Deviation worth naming

The brief said to add a `TIMEOUT` code "if none of the existing five fits" —
`WORKER_CRASH` was the closest candidate and was deliberately rejected above.
Everything else matches the brief; the one judgement call beyond it was
tightening the analytics `errorCode` from `string` to `ProcessingErrorCode`,
which is what the brief's "don't leave the two out of sync" actually requires
(they weren't merely missing a member — they were never type-linked at all).

**Verification:** `tsc --noEmit`, lint, full Vitest, a clean production build
with `NEXT_PUBLIC_SITE_URL` set, and the full Playwright suite (248 passed).
9 new unit tests (timeout fires / worker respawns / `keepAlive` defers /
normal calls untouched / proxy callback round-trip and release; PDF progress
monotonicity, report cap, and output-identical-without-progress) and 5 new
component tests
(stale drop discarded and its session closed, in both PDF tools; progress
rendered mid-build; split's folded per-part bar; `ErrorPanel`'s `TIMEOUT`
suggestions), plus the one-off real-browser timeout proof described above.

---

## 33. Geospatial Studio adopts the shared Studio layout; Hash Generator says what it can't do

### The layout was genuinely inconsistent, and for a structural reason

Every other Studio renders **tab bar → action picker → drop zone → the
tool's own UI**. Geospatial rendered **drop zone → tab bar → action picker →
tool**, because `GeoWorkspace` — the context provider added in §29 to stop
tab switches discarding the user's file — also rendered the drop zone, above
its own `children`. The children include the entire `AppShell`, so anything
the provider rendered was necessarily above the Studio's tabs.

Fixed by splitting the provider's two jobs: `GeoWorkspace` now provides state
only, and the drop zone / file chip / status / error block moved into a new
`GeoFilePanel` export that `GeospatialStudioApp` renders in the right place
inside its shell. `loadFile` joined the context value so the panel can reach
it. §29's reason for putting the drop zone in the provider — so a component
test drives the *real* drop zone rather than a test-only code path — still
holds: a test now renders `<GeoWorkspace><GeoFilePanel /></GeoWorkspace>`,
which is the same real component the app mounts.

Two things followed from being in the right place:

- **`actionNeedsFile()`** (`components/geo/actionFormats.ts`) hides the drop
  zone for the coordinate converter, the one action that works on pasted text
  and never reads a file. `ACTION_FORMATS` already encoded this as `null`; it
  just had no consumer. Data Studio does the same for its paste-first actions.
- **A CSV in the View tab now says why nothing is showing** ("A CSV file has
  no geometry to preview yet — convert it first"). Previously the viewer
  rendered `null` and the tab looked empty for no stated reason.

### The View picker was asking the user to restate the file

View's "GeoJSON / KML | GPX" picker was the only per-format action picker in
any Studio — Image and PDF Studio's View tabs have none — and it was
redundant three times over: the workspace *detects* the format, the drop zone
lists the accepted formats, and the page description above it lists them
again. Worse, it was a picker whose options were mostly disabled: with a
GeoJSON loaded, "GPX" was greyed out, so the only enabled option was the one
already selected.

The viewer now follows the detected format (`sourceFormat === "gpx"` → GPX
viewer, otherwise the GeoJSON/KML viewer). What's deliberately kept:

- **`lockedViewAction` still pins the viewer** on `/geo/geojson-viewer` and
  `/geo/gpx-viewer` — those URLs promise one specific tool, and a locked page
  shows its own error for the wrong format rather than silently switching to
  a different tool than the one the page is about.
- **The `ViewAction` type stays**, since the locked prop still needs it.

The format-gating machinery (`buildDisabledReasons`, `aria-disabled` + a
`title` explaining why) is untouched for Edit/Analyze/Convert, where the
options genuinely differ in what they do rather than in what file they read.

### Hash Generator: the missing thing is an explanation, not a decoder

Reported as "there is hash generator but there should be both encode and
decode". There is no decode — and no tool can have one. A hash maps input of
any length onto a fixed-length fingerprint, discarding information; the
original text isn't stored in the output to be recovered. Anything online
calling itself a "hash decoder" is looking the hash up in a precomputed table
of common inputs.

So the gap was real but it was a *documentation* gap: nothing on the page
said so, which is exactly why the question gets asked. Added an FAQ entry
("Is there a hash decoder to turn a hash back into text?") and a short
in-page note next to the existing password-storage warning, both of which
point at the Encoding sub-category — Base64, URL, HTML and Unicode, which do
ship as matched encode/decode pairs, and are what someone wanting
reversibility actually needs.

**Verification:** `tsc --noEmit`, lint, full Vitest, a clean production build
and the full Playwright suite (250 passed). Two new e2e tests assert the layout properties
directly rather than by eye — the drop zone's bounding box is below the tab
bar's, and a paste-only action renders no drop zone at all — plus the three
existing View-picker tests were rewritten around the picker's absence. Both
new-layout screenshots (empty and loaded) were checked in a real browser,
since "the layout matches the other Studios" is not something a DOM assertion
fully covers.

One process note worth keeping: a first full-suite run showed three SEO
failures (`sitemap.xml`/canonical host mismatches) that had nothing to do with
this change. Step 4 of the verification order builds with
`NEXT_PUBLIC_SITE_URL=https://example.com`; leaving *that* server running on
:3000 means Playwright's `reuseExistingServer` reuses it, and the tests
comparing against its own `baseURL` fail on the host. Rebuilding without the
variable — what the suite's own `webServer` command does — turned all 250
green. Noted in CLAUDE.md's verification section so the next confusing
three-test failure is recognized in seconds rather than debugged as a routing
regression.

---

## 34. CI automation, a performance budget, and a guard that was verified by breaking it

The verification chain in CLAUDE.md was well documented and never automated:
every run so far had been manual, on one machine — the same machine that
hard-crashed mid-e2e in entry 15. This pass automates exactly what was
already written down, and adds the one class of regression the existing
suite structurally cannot catch.

### The workflow

`.github/workflows/ci.yml` runs the documented order on push and PR:
`tsc --noEmit` → `lint` → Vitest → `rm -rf .next` + production build →
bundle budget → Playwright. Two ordering constraints are load-bearing and
commented in the file: the budget check must sit *between* the build and
Playwright, because Playwright's own `webServer` runs `npm run build` again
and would overwrite the `.next` the budget check reads; and the Playwright
step deliberately does **not** set `NEXT_PUBLIC_SITE_URL`, because three SEO
tests only pass against a build that took the localhost fallback (the same
trap recorded at the end of entry 33).

A dedicated step asserts that `postinstall` really produced `public/duckdb`,
`public/pdfjs`, `public/maplibre`, `public/fonts` and the EPSG index in CI,
and that the two committed DuckDB parquet extension binaries are present. The
second half of that check is the point: those binaries are *not* reproducible
from `node_modules` — they come from a one-time CDN fetch
(`scripts/fetch-duckdb-extensions.mjs`, deliberately not part of
`postinstall`), which is why they're committed. **CI needs no network fetch
for any engine asset**, and this step fails loudly if that ever stops being
true, rather than letting it resurface as DuckDB's opaque
`RuntimeError: function signature mismatch`.

**`playwright.config.ts`'s `workers: 1` was not touched.** It is a hardware
constraint of the development machine (entry 15), not a tuning oversight.
CI's higher count is passed as `--workers=2` on the command line, along with
`--reporter=list,html --trace=on-first-retry --retries=1`. Passing all four
as CLI flags rather than adding a `process.env.CI` branch was deliberate:
the only literal in that file stays `1`, so no future edit to a CI-only
number can change what runs locally. The config gained a comment saying so.

### The performance budget, and three broken signatures found on the way

`scripts/check-bundle-budget.mjs` fails CI on two things: the shared JS
crossing a ceiling, and an engine library escaping its dynamic-import
boundary (rule 4). It reads the **real build output** — every route is
prerendered to HTML, so each route's script tags are the truthful record of
its cold-load chunk set, and the shared set is their intersection. No source
grepping, no hardcoded chunk names (Turbopack content-hashes them).

Measured on the current build: **shared-by-all-108-routes is 181.5 KB gzip**
(8 chunks), worst canary route is the homepage at **217.1 KB**. Budgets set
at 210 KB and 250 KB — roughly 15% headroom each.

Reusing `analyze-bundle.mjs`'s heavy-library signature table turned out to be
the interesting part, because three of its eight signatures were wrong in
ways that only matter once a signature *gates* a build instead of printing a
report:
- **`/AsyncDuckDB/` matched our own wrapper.** `engines/parquet/index.ts`
  compiles to a chunk containing `new t.AsyncDuckDB(...)`, where `t` is the
  correctly-lazy dynamic import. The real library was in a different chunk
  entirely (`getJsDelivrBundles` appears in it and not in ours).
- **`/maplibre-gl-worker/` matched our own wrapper** for the same reason —
  `maplibreClient.ts` contains that literal string to pass to `setWorkerUrl()`.
- **The jszip signature matched zero chunks**, i.e. it would never have
  caught anything.

Both false positives would have failed CI on correct code, which for a gate
is worse than no check at all — the fix everyone reaches for is disabling it.
Signatures were re-derived by diffing the real library chunk against its
wrapper chunk, and a `MIN_HEAVY_CHUNK_BYTES` floor was added as defense in
depth. They now live in one place, `scripts/lib/heavy-libs.mjs`, imported by
both the reporting script and the gate so the two cannot drift.

### Verified by breaking it, twice

A guard never observed failing isn't verified (entry 22's precedent). The
first attempt added `import * as XLSX from "xlsx"` to `SiteFooter.tsx` and
the check **passed** — correctly. `SiteFooter` is a Server Component, so its
imports go into the server bundle and never reach the browser; there was
nothing for a client-bundle guard to catch. Worth recording, because it's a
real limit of this check's scope: **it guards what ships to browsers, and a
heavy import in a Server Component is invisible to it** (and, to be fair,
harmless to Core Web Vitals).

Repeating it in `UniversalFileDrop.tsx` — a `"use client"` component the
homepage renders — failed both gates as intended: the homepage jumped
217.1 → **377.3 KB** gzip, over budget, and `xlsx (SheetJS)` was named in
the offending chunk. Reverted; the homepage returned to 217.1 KB and the
check to exit 0.

### Lighthouse: what blocks, and what deliberately doesn't

`lighthouserc.json` runs three representative page types (homepage, a Studio
page, a tool page), 3 runs each, in a job parallel to `verify`. Measured
scores showed **zero run-to-run variance** on seo, accessibility and
best-practices (e.g. accessibility 0.91, 0.91, 0.91) — they're DOM-based
audits, not timing ones — so those block. `performance` measured 1.0 on
every run but only on a fast local machine; that was **not** verified on a
shared runner, so it's `warn` until someone has real runner data. A
perf assertion that fails intermittently teaches everyone to ignore the
whole job.

### Two findings reported, not fixed

Both are outside this pass's "dev dependencies only, no application changes"
scope, and neither is caused by it:
1. **Accessibility is 0.91–0.93, not 1.0**, from two real issues on every
   page: `text-gray-400` on white is 2.6:1 where 4.5:1 is required (footer
   text, `FileDropZone` hint), Studio tab buttons are 4.39:1 — just under —
   and every `<input type="file" class="sr-only">` has **no accessible
   name**, so screen-reader users meet an unlabeled control at the product's
   central interaction. The budget is pinned at 0.90 to prevent regression
   without silently demanding the fix.
2. **`js-yaml` 5.0.0–5.2.1 has a high-severity DoS advisory** and is a
   production dependency (the YAML tools). Pre-existing.

**Verification:** `tsc --noEmit` clean, lint clean, Vitest 743/743 across 97
files, clean production build, budget check green, full Playwright suite at
`workers: 1`.

---

## 35. Widening two narrow foundations: cross-browser verification, and fixtures we didn't generate ourselves

The suite was thorough but rested on two things it had honestly recorded as
limitations: every browser assertion was Chromium-only, and every fixture was
made by the same library that reads it. Both are now wider — and widening
them produced one confirmed correction, two closed gaps, and one new
suspected bug.

### Task A — a tagged cross-browser subset, at one worker

Four assertions depend on the *browser engine's* behavior rather than on our
code: EXIF auto-orientation, transparent-PNG→JPEG compositing, SVG scripts
never executing, and the WebGL polygon pixel check. They now carry a
`@cross-browser` tag, and `playwright.config.ts` gained three projects —
chromium (all 250 tests), firefox and webkit (the 4 tagged ones, selected by
`grep` from a single exported tag constant, so the subset can't drift out of
sync with a hand-maintained path list).

**`workers: 1` was not touched, and adding projects did not make it less
safe.** Playwright's `workers` is a global cap across all projects, not a
per-project one, so three projects at one worker run strictly one after
another — more runtime, never a second concurrent browser. Verified by
listing: 250 / 4 / 4.

**Firefox agrees with Chromium on all four.** The single most load-bearing
empirical finding in the codebase — that the browser's image decoder applies
EXIF orientation unconditionally, which is why `engines/image/` contains no
orientation-correction code at all — now holds in two independent engines
rather than one. The corresponding "assumed spec-consistent but not
verified" caveats in CLAUDE.md, this file, and PRIVACY_ARCHITECTURE.md have
been replaced with the verified result.

**WebKit could not be run on this machine, and that is an environment fact,
not a WebKit judgement.** `playwright install webkit` downloads, writes
`INSTALLATION_COMPLETE`, and then the executable is gone — this developer's
antivirus quarantines it. The project is therefore gated behind
`process.env.CI || process.env.PLAYWRIGHT_WEBKIT` and runs on Ubuntu CI
runners, which have no such interference. Local runs are chromium+firefox
and stay green; nothing is silently skipped in CI.

**One partial WebKit run produced a finding worth chasing.** Before the
binary vanished mid-suite, one test did execute: PNG→JPG on
`/convert/png-to-jpg`. WebKit accepted the file, took the Convert click,
rendered **no error panel** (the `alert` in the failure snapshot is Next's
empty route-announcer, not `ErrorPanel`), and never produced a Download
button within 20 s. That is the signature of the image worker never
settling — consistent with an unsupported `OffscreenCanvas`/`convertToBlob`
path in WebKit, which would mean **Safari users cannot convert images at
all**. Recorded here as *suspected, not confirmed*: one run, killed by the
antivirus before it could be repeated. The first green CI run either
confirms or clears it, and that is the specific thing to look at.

### Task B — fixtures from producers the engine doesn't share

`scripts/generate-real-world-pdf-fixtures.py` uses reportlab (BSD) and
qpdf via pikepdf (Apache-2.0 / MPL-2.0) — Python fixture-generation tooling,
not npm dependencies, matching the existing Pillow/pypdf scripts beside it.
Five new PDFs, all committed and reproducible:
`real-reportlab.pdf` (ordinary third-party text document),
`real-cjk-noembed.pdf`, `real-scanned-image-only.pdf` (a genuine
image-only page, no text operators), `real-linearized.pdf` (qpdf
"fast web view"), and `real-objstm.pdf` (PDF 1.5 object streams behind a
binary cross-reference stream — a structure pdf-lib never emits).

`scripts/generate-real-world-image-fixtures.py` adds `animated.webp` (3
real frames, red/green/blue, asserted at generation time via Pillow's
`n_frames` so a silently-single-frame fixture can't quietly invalidate the
test built on it) and `photo-large.jpg` (6 MP, ~24 MB decoded).

**Nothing failed.** The round expected some might, since §9 flagged "a real,
legitimate PDF could plausibly still trip `MALFORMED_FILE`" as unruled-out.
All seven new e2e tests passed first time, which resolves that risk for the
three structures the paragraph actually named — linearization, object/xref
streams, third-party object layout — while leaving the genuine long tail
(Acrobat, Word, phone scanners, damaged-but-readable files) untested,
because none of it can be generated reproducibly.

Two specific gaps closed outright:
- **The `cmaps`/`standard_fonts` self-hosting path had never been executed
  by any test.** `real-cjk-noembed.pdf` draws CJK in `/Type0 /HeiseiMin-W3`,
  referenced but not embedded (confirmed: no `/FontFile` in the bytes), so
  rendering it requires resolving a CMap from the self-hosted assets. The
  test asserts the actual characters come back, not merely that *something*
  did — the failure mode here is silent degradation, so a
  "did output appear" check would have passed with the assets missing.
- **The animated-WebP FAQ claim was an inference, and it turns out to be
  correct.** Converting the 3-frame fixture yields red, i.e. frame 0, so
  "only a single static frame is used" is now verified rather than
  extrapolated from general `createImageBitmap` behaviour. No copy needed
  changing.

**Verification:** `tsc --noEmit` clean, lint clean, Vitest 743/743, clean
production build, bundle budget green, full Playwright suite at
`workers: 1` across chromium + firefox.

---

## 36. The Capability layer enters the breadcrumb, and results chain into the next tool

Two internal-linking changes, both built entirely on registry data and
mechanisms that already existed. No new dependency, no new storage.

### Task A — the breadcrumb now mirrors the real URL hierarchy

The site's hierarchy has been Home → Application → Capability → Tool since
entry 21, but a tool page's visible trail skipped the middle level. Entry 28
then removed the "Browse by capability" nav from Studio pages by product
decision, which left all 14 capability index pages with **zero** inbound
internal links — reachable from `sitemap.xml` alone — and noted the fix as
"one inbound link from somewhere, not restoring the whole nav."

The breadcrumb is that somewhere, and it was independently just correct.
`ToolPageLayout` now renders the capability crumb, resolved through a new
`getCapabilityForTool()` built on the existing `getToolCapability()`
(`appEntry.mode ?? capability`). All 56 Studio-owned tool pages link up into
the 14 capability pages. **The removals from entry 28 stand** — Studio pages
still render neither the capability nav nor `RelatedApplications`, and the
tests asserting that are untouched.

The page-less case is derived, not hardcoded: `getCapabilityForTool()`
returns `undefined` when a tool's capability has no index page, reusing the
exact `indexDescription`-plus-at-least-one-tool rule that decides which
capability pages exist at all. The crumb is then omitted rather than
rendered as a link to a 404. In practice this covers all 25 Developer
Toolkit tools, which use `devCategory` and have no Studio capability.

**A latent bug surfaced while wiring this up.** The Application crumb used
`CATEGORIES.find(c => c.engine === tool.engine)`, and no `CATEGORIES` entry
has `engine: "parquet"` — Data Studio owns Parquet Viewer through
`STUDIOS[].relatedEngines`. So `/tools/parquet-viewer` had been rendering
`Home / Parquet Viewer`, silently missing its Application crumb entirely.
`registry/search.ts` already had a private copy of the correct two-step
lookup for exactly this tool; it is now one shared
`getOwningCategorySlug()` used by both, so a future Application spanning two
engines can't be right in search and wrong in breadcrumbs. That page now
reads `Home / Data Studio / Viewer / Parquet Viewer`.

`Breadcrumbs.tsx` builds the visible trail and its `BreadcrumbList` JSON-LD
from the same `items`, so the structured data followed for free — asserted
rather than assumed, with a test pinning all four names in order.

**One premise correction:** the brief referred to an existing
"Home → Application → Capability → Tool is traversable by clicking alone"
test. No such test existed — `seo-architecture.spec.ts` has
"Home → Application → **Tool** is traversable by a crawler", whose own
comment says "the capability hop no longer exists here". It still passes
unchanged; the new upward path is covered by four new tests instead.

**The substring-collision check the brief asked for was done before running
anything**, since these crumbs introduce "View"/"Convert"/"Edit"/"Pages"/
"Metadata" into every tool page's DOM. Grepping the whole suite for
`getByText`/`getByRole("link")` against all 10 capability labels found three
candidate sites, all already scoped to a container (`breadcrumb.`,
`siblings.`, `gridNav.`) or in a component test that never renders
`ToolPageLayout`. Nothing needed changing — but that was established by
looking, not by running the suite and hoping.

### Task B — "Send to another tool"

`components/tools/SendToToolLinks.tsx` offers the tools that accept the
*output's* format, via the same `getToolsAcceptingFormat()` +
`categorizeActions()` pair `UniversalFileDrop` uses, so it can never
advertise a tool that doesn't exist. It writes to the existing
`lib/fileHandoff.ts` — module-scoped, single-use, slug-scoped, 60s expiry —
so this is the homepage's mechanism driven from a result instead of an
initial selection.

Details that matter:
- **The Blob becomes a `File` with a sanitized name.** `sanitizeFilename()`
  runs before `setPendingFile`, since a name that can become a download name
  or archive entry downstream is untrusted input (rule 7).
- **The format is derived from the output's filename extension**, not by
  sniffing bytes — the name is generated by the tool that just produced the
  result (`page-1.png`, `merged.pdf`), so it's authoritative here in a way
  it isn't for a user-supplied file, and it keeps the component synchronous.
- **Download stays primary**: a filled button, first in the DOM and tab
  order; chaining is a quieter bordered panel underneath.
- **It never offers the tool that produced the result** (`excludeToolSlug`).

**Batch is deliberately out of scope, and says so.** `fileHandoff` holds one
`{ toolSlug, file }` pair, so a batch handoff would either send just the
first item — silently losing the rest — or require the handoff to become a
list, which then needs every `FileDropZone` claim site to accept multiple
files and decide what a multi-file arrival means for tools that take exactly
one. `ImageBatchList` therefore shows the panel only at `doneCount === 1`,
with a comment stating what a real batch version would cost. A batch of N
keeps its per-file downloads and its .zip.

Wired into the six result UIs whose tool slug was already available (they
each compute one for their `FileDropZone`): `PdfToImagesTool` and the five
`ImageBatchList` callers. The prop is optional on both `DownloadResult` and
`ImageBatchList`, so the other twelve `DownloadResult` callers keep exactly
their previous download-only behaviour until someone wires them.

### The budget check caught a regression this change introduced

Wiring the panel in cost `/tools/uuid-generator` **186.2 → 212.8 KB gzip**,
and `scripts/check-bundle-budget.mjs` (entry 34) is what surfaced it — the
suite was fully green, and nothing about the page looked different.

The cause is a boundary that only exists because of the Server/Client split:
`SendToToolLinks` calls `getToolsAcceptingFormat()`, which pulls all 81
`ToolDefinition`s in. `ToolPageLayout` is a Server Component, so the registry
had never shipped to the browser on a tool page. A static import from
`DownloadResult` therefore added ~26 KB to *every* page with a download
button — including the twelve that never render the panel at all, since they
pass no `sourceToolSlug`.

Fixed with `LazySendToToolLinks` (`next/dynamic`, `ssr: false`), the same
boundary shape as `LazyGeoMap`: the registry chunk is fetched only once the
panel actually renders. `/tools/uuid-generator` came back to **187.4 KB**,
within ~1 KB of where it started. Worth recording as the first time that
guard paid for itself on ordinary feature work rather than on a deliberate
test violation — and as a reminder that "it's just a registry lookup" is a
client-bundle decision whenever the caller is a Client Component.

**Verified in a real browser before writing the permanent tests**, per the
brief: a single-page PDF through PDF→Images offered 9 correct tools and not
itself, clicking "Resize Image" landed on `/tools/resize-image` with the
file already loaded (its submit button rendered, which only happens with
files present), and a hard reload correctly got `null` back — submit button
gone, normal empty drop zone. All four breadcrumb cases were checked the
same way, including the Parquet Viewer fix and a Developer Toolkit tool
getting no crumb.

**Verification:** `tsc --noEmit` clean, lint clean, Vitest 743/743, clean
production build, bundle budget green, full Playwright suite at
`workers: 1`.

---

## 37. Every Studio keeps your file, PDF Studio gets a Viewer, and three URLs finally match their names

Three related changes, from one report: dropping a PDF into PDF Studio's
Merge action and switching to Split silently lost the file, and it had to be
dropped again.

### Task A — the file lives in the Studio, not in the tool

That bug wasn't specific to Merge/Split. Every PDF and Image tool owned its
own `file` state and its own `FileDropZone`, so *any* tab or action switch
unmounted the tool and threw the loaded file away. Geospatial Studio had the
identical bug and fixed it in entry 29 with `GeoWorkspace`; Data Studio never
had it, because `SpreadsheetDataApp` is one component that owns the file
centrally.

So the fix was to copy the shape that already worked rather than invent two
more: **`components/pdf/PdfWorkspace.tsx`** and
**`components/image/ImageWorkspace.tsx`**, each a context provider plus a
drop-zone panel (`PdfFilePanel`/`ImageFilePanel`) the Studio renders inside
its own shell, below the tab bar and action picker — the same order the other
three use. All eleven PDF tools and all six image tool components became
presentational: they read the workspace and render only their own options and
results. `documentKey` is folded into each tool's React `key` exactly as in
`GeoWorkspace`, so a new file remounts the tool instead of needing a reset
effect that `react-hooks/set-state-in-effect` would reject anyway.

Three things were more than mechanical:

- **PDF's workspace owns the pdf.js render session too**, not just the
  `File`. Each tool used to open its own, and PDF→Images and PDF→Text opened
  *and closed* one per run — so the same document was parsed two or three
  times in one session. Now it's opened once per load, and a tool must never
  `close()` what it didn't open (the workspace does, on replace/clear/
  unmount). This is what made Task B nearly free.
- **The stale-request guard moved with the load.** `PdfPageWorkspaceTool` and
  `PdfSplitTool` each kept a private `requestRef` (entry 32) that only worked
  because they owned the drop handler. The workspace now exposes
  `currentLoadToken()` — a *function*, so a read after an `await` sees the
  live value rather than the one captured at render — and both tools guard
  their long builds through it. Merge is the one action that appends rather
  than replaces, and it tells the two apart by array-prefix identity, so
  adding a second PDF keeps the page order the user already arranged.
- **Image needed action gating, because `accept` stopped meaning anything.**
  Each image tool used to declare what it could read via its own drop zone's
  `accept` attribute; with one shared drop zone that's nowhere. So the
  workspace detects each file's format on load and
  `components/image/actionFormats.ts` (modelled directly on the geo one)
  disables what can't run, with a readable reason: "WebP to JPG" is
  unavailable for a PNG, no pixel-level Edit action can touch an SVG. A
  first cut also narrowed the shared drop zone's `accept` per action and
  made things *worse* — with a PNG loaded, "SVG to PNG" was disabled and the
  file picker wouldn't offer an SVG either, so Clear was the only escape.
  Narrowing now happens only on a locked tool page, where one action is the
  whole point of the URL.

**A dead handoff surfaced on the way.** Consolidating drop zones is what kills
the per-tool `toolSlug` (CLAUDE.md rule 9) — and Geospatial Studio had already
shipped with `<GeoFilePanel />` rendered with no slug at all, so the homepage's
Universal File Drop couldn't hand a file to any geo tool. All three Studios now
pass the active action's own registry slug; geo got a `TOOL_SLUG_BY_ACTION` map
for the actions that have a standalone page.

`ImageViewerTool` lost code rather than gaining it: its render-time "auto-load
the just-edited file into my own list" adjustment existed only because Edit and
View held two unrelated `File` lists, and a re-dropped file would never be
`===` the edited source. Both tabs now read the same objects, so the viewer
just opens on the edited one.

### Task B — PDF Studio's View tab

A Studio-only capability with no standalone tool behind it, exactly like Image
Studio's own View. `PdfViewerTool` renders one page at a time at ~760px through
the workspace's already-open session (`renderThumbnail` is just "render this
page at most this wide" — Pages asks it for 140px), with page navigation and
zoom, re-rendering on change. One page at a time, deliberately: a continuous
all-pages canvas would need its own virtualization to stay cheap on a 500-page
document, and the Pages tab's thumbnail grid already covers whole-document
overview. `registry/studios.ts` gained the matching `view` action with no
`indexDescription`, so no thin capability index page is generated for it.

### Task C — /pdf-tools → /pdf-studio, and two more

Three of the four Studios still had "-tools" URLs from before they were
Studios, while `/data-studio` matched its name. `CATEGORIES` slugs are now
`pdf-studio`, `image-studio` and `geospatial-studio`, with the app directories
renamed to match and permanent redirects for both the Application page and
every capability page under it (`/pdf-tools/pages` → `/pdf-studio/pages`).
Developer Toolkit keeps `/developer-tools` — it deliberately isn't a Studio.
Everything else followed from the registry being the single source of truth:
sitemap, breadcrumbs, capability pages, nav and search needed no logic
changes, only the new slugs. No individual tool URL moved; none of them ever
lived under a category slug.

CLAUDE.md rule 10's "slugs are frozen" line is now a "slugs are not free-form
labels" rule instead — move one only when the URL is genuinely wrong, and
always with redirects covering sub-paths.

### Tests

The eight PDF/image component test files kept driving the real drop → load →
tool path rather than switching to injected state: two new harnesses
(`pdfWorkspaceHarness.tsx`, `imageWorkspaceHarness.tsx`) render the provider
plus the real panel, so the only things still mocked are the engine calls.
Loading is asynchronous everywhere now (format detection for images), which is
why the image tests had to start awaiting their file selection.

New e2e coverage: a PDF dropped on Merge is still loaded on Split *and* on
Metadata (asserted by a metadata field rendering, not just the filename, so
it proves the same `File` came through), Clear being the only thing that
unloads it; the View tab rendering a real pdf.js data URL and paging to page
2; the same persistence property for Image Studio ending on the Metadata tab
reading real EXIF; a format-gated action showing `aria-disabled` plus its
reason; and the old URLs redirecting, including capability sub-paths.

The existing Image Studio hub test needed a genuine behavioural update, not a
selector fix: it used to click "SVG to PNG" while a JPEG was loaded, which is
now (correctly) disabled. It drops the SVG instead and asserts the picker
moves itself to the only conversion that file supports.

**Verification:** `tsc --noEmit` clean, lint clean, Vitest 743/743, clean
production build, bundle budget green (shared 181.5 KB of 210 KB), full
Playwright suite 273/273 at `workers: 1`.

---

## 38. The page column goes fluid, and the ad rails stop guessing where it is

**Logged retroactively.** This change was already sitting in the working tree
— uncommitted and with no log entry — when entry 37's work began, which is how
it was found: CLAUDE.md still described a fixed 864px column and rails
positioned at `calc(50% ± 28.5rem)`, neither of which had been true for a
while. Recording it now so the documentation and the code agree.

### What changed

`components/layout/PageContainer.tsx` is new and is now the only place a page
width is decided. Six call sites — the homepage, `StudioLayout`,
`ToolPageLayout`, `CapabilityPageContent`, `DevCategoryPageContent` and
`/developer-tools` — each dropped their own `mx-auto max-w-[54rem] px-4` for
`<PageContainer className="…">`.

The column is now fluid and capped at **1520px**, with the side-rail gutter
reserved as container padding (`xl:px-[12.5rem]`) instead of the rails being
positioned relative to the column. `SideRailAds` correspondingly stopped
computing `calc(50% ± 28.5rem)` and simply pins each rail `1rem` from its
viewport edge, inside the space the container already reserved.

**That inversion is the actual point of the change.** The old arrangement had
two files agreeing by hand on one measurement — the column's half-width — with
nothing enforcing it. That coupling is why the *first* attempt at a wide layout
(the since-deleted `WideBreakout.tsx` full-bleed technique in the Data Studio
app) was reverted rather than fixed: a column that changes width breaks a rail
whose position was derived from the old width. Now the container reserves the
space and the rails occupy it, so a column width change can't strand a rail.

Effective widths: 1920px viewport → 1520px column (was 864px), 1600px → 1200px,
1366px → 966px, below `xl` → full width minus normal padding, since no rails
exist there to make room for.

### What it did not fix, stated honestly

- **Between 1280px and ~1450px the two rails cost 400px**, so the gain over the
  old fixed column is smallest at exactly the laptop widths most visitors have.
  Inherent to keeping both; a full-bleed column means dropping the rails, which
  is a monetization decision (README.txt §37), not a layout one.
- **Prose is now too wide.** `ProseContainer` (54rem) was written in the same
  file for FAQ answers, how-it-works steps and `not-found.tsx` — and never
  wired up to any of them. Confirmed in a real 1920px browser while writing
  this entry: a CSV Viewer FAQ answer runs the full ~1500px on one line.
  `not-found.tsx` also still hardcodes its own `max-w-[54rem]`, the exact
  duplication `PageContainer` exists to remove.
- **Three exported constants were dead.** `CONTENT_MAX_PX`, `RAIL_GUTTER_REM`
  and `PROSE_MAX_REM` were exported as if they were the shared source of truth,
  and nothing ever imported them — Tailwind needs literal class strings, so
  they *couldn't* be. Both files' comments claimed a coupling that didn't
  exist, which is worse than an honest duplicated literal. Removed in entry
  37's documentation pass; both files now state the real invariant instead
  (gutter ≥ rail width + edge offset + a visible gap).

### Not regressed

The property the original fixed width existed to protect still holds and is
still asserted: the column is the same width before and after a file loads.
`spreadsheet-app.spec.ts` and `parquet-viewer.spec.ts` both check it (empty vs.
loaded, and against another Studio page) and both pass unchanged — the test
compares widths to each other rather than to a hardcoded number, which is why
it survived a layout change of this size.

---

## 39. Acting on an architecture review: reading width, real tab semantics, and no more permanent "coming soon"

An external review of entries 37–38 raised eight points. Six were implemented,
one was implemented differently than suggested, and one was answered rather
than built. Each is recorded with its reasoning, because "we considered it and
said no" is the part that gets lost.

### Reading width (implemented, in the shared components)

Entry 38 left `ProseContainer` written but wired to nothing, and a CSV Viewer
FAQ answer ran the full ~1500px on one line. It's now applied inside `FAQ.tsx`
and `ToolInstructions.tsx` themselves rather than at each of ~80 call sites, so
every page that renders either gets a readable measure and a new page can't
forget. Page headers wrap their description paragraph the same way, and
`not-found.tsx` — a pure reading page — now uses `ProseContainer` directly
instead of hardcoding the 54rem the container already owns.

Nothing interactive was narrowed: tables, maps, grids, drop zones and preview
panes still get the full application column. `layout.spec.ts` pins both halves
at once (column > 1200px at 1920px wide, FAQ answer ≤ 864px), so "wide app,
narrow prose" can't quietly become "narrow everything".

### The ad rails were labelled backwards

`placement="left-rail"` was rendered with `right: …` and vice versa. Invisible
while `AdSlot` only reserves space, but a placement name is what an ad network
reports and targets on, so every impression would have been mislabelled the
moment one was wired in. Fixed, and each rail now carries `data-rail` so the
new test asserts real geometry instead of trusting the name.

### `tests/e2e/layout.spec.ts` (new)

At 1280/1440/1920, across one page per layout shell: neither rail overlaps the
content column, each is on the side it claims, neither hangs off the viewport,
and below `xl` no rail renders and no gutter is reserved. Two files have to
agree on one measurement (`PageContainer`'s gutter, `SideRailAds`' offset) and
nothing in the type system connects them — this does.

Writing it surfaced a measurement bug in the test itself: deriving the column
by walking up from the `<h1>` landed on the full-width padded wrapper on the
homepage and on the real column elsewhere, so the assertion was meaningless on
one page and strict on another. `PageContainer` now marks its own column with
`data-content-column`.

### Hardcoded counts → `{toolCount}`

Three FAQ answers stated tool counts by hand and one had already drifted (11 vs.
the real 15). A Studio's copy may now write `{toolCount}`, substituted by
`getStudioConfig()` from `relatedEngines` — the same lookup that makes Parquet
Viewer count toward Data Studio. Two integrity tests keep it honest: nothing may
leak an unresolved `{token}` to the DOM or the FAQPage JSON-LD, and any stated
count must equal the registry's.

### ARIA: implemented for `Toolbar`, *rejected* for `ActionPicker`

The review asked for the complete Tabs pattern on everything using `role="tab"`.
Half of that was right.

`Toolbar` is a real tab bar and now implements the real pattern: `aria-controls`
onto `AppShell`'s `role="tabpanel"` (with matching `aria-labelledby`), roving
`tabindex`, and Arrow/Home/End navigation. Ids live in `tabIds.ts` as fixed
strings — the two components are siblings that never see each other's props,
and exactly one `AppShell` renders per page.

`ActionPicker` became a **`role="radiogroup"`** instead, because it is not a tab
set: the Studio's one shared drop zone sits *between* the picker and the tool it
selects and belongs to every action equally, so there is no discrete panel for a
`tab` to own. Making it a nested tablist would have meant inventing a panel
boundary that doesn't exist in the layout. The review explicitly allowed this
("if the controls are not actually tabs, replace them with more appropriate
semantics"), and the shared drop zone is the concrete evidence.

Cost: ~40 test queries moved from `getByRole("tab")` to `getByRole("radio")`.
Worth noting as a benefit — "View" was previously ambiguous between PDF Studio's
View *tab* and its Metadata View *action*, and now isn't.

### Placeholders: one built, two deleted

Each was resolved by asking whether it was *blocked* or merely *unbuilt*.

- **Image Watermark — unbuilt, so built.** Nothing had ever blocked it: the
  pipeline already composited and the worker could already draw text
  (`fillText`/`measureText` in a real Worker's `OffscreenCanvas`, confirmed
  empirically first, same discipline as the `filter` pass). It's one more
  additive field on `ImageProcessOptions`, drawn after colour-adjust so it isn't
  cropped/rotated/filtered with the image. Size is a fraction of the shorter
  side, not a pixel value, so one setting works across a mixed batch.
- **PDF Security — blocked, so removed.** pdf-lib can detect encryption but
  cannot write it. The tab, its `security` capability entry, and its e2e test
  are gone; the FAQ now answers the question honestly instead of promising
  later.
- **Geospatial Coordinate Editing — blocked, so removed.** Needs a map-editing
  dependency this project doesn't have.

`registryIntegrity` and `seo-architecture.spec.ts` both needed updating:
`/pdf-studio/security` must now 404 as a *removed* capability rather than as a
page-less one. `search.test.ts`'s "match an Application by a capability label"
case used "Security" precisely because it was unique; it uses "Pages" now.

### Product opportunities: one implemented, one costed

**PDF text search — implemented.** `session.extractText()` already returned
per-page strings, so search needed no new engine capability: type a query, get
"N matches on M pages", step between them. Extraction is lazy (first keystroke),
so opening the viewer to read never pays for a text pass it may not use.
Matches are located per *page* and not highlighted in place — highlighting needs
pdf.js's text layer positioned over the rendered image, a much larger feature
than the part that's actually hard by hand, and the UI says so rather than
implying otherwise.

**Compress PDF — not implemented, and here's the honest costing.** It is
*possible* with what's here: `openPdfRenderSession().renderPageImage()` can
rasterize each page at a reduced scale/quality and `buildPdfFromImageFiles()`
already builds a PDF from images, so the pipeline exists end to end. The reason
it wasn't built in this pass is that it **destroys the document**: every page
becomes a JPEG, so text stops being selectable, searchable and accessible, links
and form fields disappear, and file size can *increase* for text-heavy PDFs.
Plenty of tools ship exactly this without saying so; doing it here would
contradict "don't promise conversions that can't be reliably performed locally"
(README.txt §35). A defensible version would need to detect whether a document
is image-heavy, refuse or warn loudly for text PDFs, and be named for what it
does. That's a product decision, not a spare afternoon, so it stays in
README.txt's "Potential later tools" list where it already is.

### A dev-only bug found while looking at the result

Verifying the new Watermark action in a browser showed its result thumbnail as
a broken image — and so did Resize, so it wasn't the new code. `ImageBatchList`
revoked its preview object URLs on React unmount with an empty dep array. Under
Strict Mode dev double-invokes effects (mount → cleanup → mount) while `entries`
— and the URLs created in its `useState` initializer — survive, so the second
mount rendered URLs the first cleanup had already revoked. Every image tool's
result preview was broken in `npm run dev`.

Invisible to `npx playwright test`, which runs a production build where Strict
Mode doesn't double-invoke — the same dev-only blind spot already documented for
`GeoMap.tsx`'s `relative` class, and a reminder that "the e2e suite is green" and
"the app looks right while you develop it" are different claims. Revocation now
hangs off `pagehide`, which is the honest lifetime for these URLs and can never
revoke one the component is still rendering.

**Verification:** `tsc --noEmit` clean, lint clean, Vitest 752/752 (97 files),
clean production build, bundle budget green (shared 181.5 KB of 210 KB), full
Playwright suite 296/296 at `workers: 1`.

---

## 40. Files follow you between tool URLs, PDF Studio opens on the document, and search understands two words

Acting on the architecture review in entry 39's successor discussion, plus two
direct reports. One proposal was **rejected on evidence** before any code was
written, and one accepted proposal was **implemented differently** than I first
recommended — both recorded below, since that reasoning is the part that gets
lost.

### The proposal that was already built

The review proposed introducing per-tool route wrappers (`/csv-viewer`,
`/csv-to-json`, …) that render the shared Studio component with SEO metadata,
because "all of those live behind a single `/data-studio` page."

That premise was false, and checking it took ten minutes against a running
production build: 106 URLs in `sitemap.xml`, every tool with its own title,
canonical, `SoftwareApplication` + `FAQPage` + `BreadcrumbList` JSON-LD, and
`app/tools/csv-viewer/page.tsx` already rendering
`<SpreadsheetDataApp initialMode="view" lockedFormat="csv" />` — literally the
proposed snippet. Building it again would have been pure churn; adopting the
flat URLs in the proposal would additionally have orphaned the 14 capability
index pages and 301'd all 106 indexed URLs for nothing.

**Recorded because the failure mode is generic:** an architecture proposal
that describes a problem the codebase doesn't have is worth verifying before
it's worth designing for.

### Files now survive navigation between tool URLs

The one genuine gap the review pointed at. Measured first: switching tabs kept
the loaded file (React state on one page), while a client-side navigation to
another tool URL discarded it, because every tool page has its own route and
unmounting it dropped the workspace.

`lib/workspaceFiles.ts` is a module-scoped, per-tab, in-memory map keyed by
engine. Each Studio remembers on load, forgets on Clear, and recalls on mount.

**I recommended a route-group layout and then didn't build one.** App Router
layouts do persist across client-side navigation, but `/tools/*` and
`/convert/*` each host tools from three different engines, so a group per
Studio meant scattering those directories across four groups — and navigating
*between* groups remounts the layout anyway, so it wouldn't even have covered
the case it was chosen for. A module-scoped variable is indifferent to route
structure and is the mechanism `lib/fileHandoff.ts` already proves works.

Four details that are load-bearing:

- **Recall is deferred a microtask.** Calling the load inline in the effect
  sets state during commit, which `react-hooks/set-state-in-effect` rightly
  rejects; the rule traces through the `loadFiles` callback, so moving the call
  behind an indirection wasn't enough.
- **A `loadStartedRef` makes the Universal File Drop handoff win.**
  `FileDropZone` claims a pending file in a child effect and children mount
  first, so the provider's recall sees the ref already set and stands down. A
  file the user explicitly chose beats one carried over.
- **Detected formats travel with the files**, so a destination refuses
  synchronously. Without it, `/convert/json-to-csv` would adopt a carried-over
  CSV and greet the user with "This looks like a CSV file, not JSON" — worse
  than the empty drop zone they get instead. Verified as a negative test.
- **Recall peeks, it doesn't consume** — unlike `takePendingFile`. A one-shot
  read would mean only the first navigation kept the file.

A hard reload still starts empty, and PRIVACY_ARCHITECTURE.md §3 now states
this widened lifetime explicitly rather than leaving it implied.

**A stale dev server cost real time here.** The first end-to-end check reported
the feature not working at all; the server had been started before
`workspaceFiles.ts` existed and Fast Refresh hadn't picked up the new module.
Restarting it showed the feature working on the first try. Worth remembering
before debugging code that looks correct.

### PDF Studio opens on View

`defaultAction` was `pages`, so `/pdf-studio` landed on Merge — asking the user
to commit to a page operation before they'd seen the document. Every other
Studio opens on its viewer.

### Search understands more than one word

Reported: "view pdf" found nothing. `searchSite` tested the **whole query** as
a single substring, so any multi-word query failed unless that exact phrase
appeared verbatim — and no string contains "view pdf". Now split into terms and
matched AND-wise (`searchTerms`/`matchesAllTerms`), with an Application's
haystack being its name + capability labels + accepted formats, so terms can be
satisfied by different fields. "view pdf", "pdf viewer" and "pdf view" all reach
PDF Studio; "csv excel" narrows to Data Studio and CSV to Excel.

Descriptions are deliberately **out** of that haystack: they're prose listing
verbs ("merge, split, rotate…"), and matching them would promise capabilities
with no tool behind them.

### Cannibalization audit: measured, then guarded instead of rewritten

All 82 tools have a **unique name and description**, and none has an empty FAQ —
the signals that actually differentiate near-identical pages are healthy. 12 FAQ
*entries* are shared across tools (one across 10), and they were left alone on
purpose: "Is my text sent anywhere?" has the same true answer everywhere, and
rewriting it ten ways to look unique would make the copy worse without making
the pages more distinct.

The audit is now a standing check in `registryIntegrity.test.ts` (unique
name/description, non-empty FAQ), which is worth more than a one-time pass.

### Deferred

**Collapsing the `locked*` props into one object** (57 call sites, 9 prop
names) was proposed and is not in this entry. Two reasons: it's a pure
refactor with no user-visible effect, and it isn't actually uniform across the
four Studios — Data Studio's `lockedFormat` is a different axis from the
per-tab action locks, so it needs a designed API rather than a rename. Landing
~40 mechanical file edits alongside a behavioural change would also have made
both harder to review.

**Verification:** `tsc --noEmit` clean, lint clean, Vitest 764/764, clean
production build, bundle budget green, full Playwright suite at `workers: 1`.

---

## 41. The pages a stranger looks for before trusting a file tool

Pre-launch review of a proposed About / Contact / footer / legal set. Four
pages shipped, seven were argued against and not built, and one launch
blocker was raised that the proposal didn't mention.

### The premise, again, was partly already true

The proposal opened with "I want a global footer that appears on every page."
There has been one since the navigation pass — `SiteFooter` renders in the
root layout with the five Applications and the local-processing line. So the
work was adding a second row, not building a footer. Checking first turned a
new component into four lines of JSX.

### One config file, because the alternative is being asked to change an email

`src/config/site.ts` holds every human-specific value: operator name and
country, three contact addresses, social links, the legal "last updated"
date, and an `advertising` mode. The four new pages, the footer, the
`Organization` JSON-LD and `/.well-known/security.txt` all read from it.

Two decisions worth keeping:

- **`null` renders nothing.** A channel with no address, or a social profile
  that doesn't exist, disappears rather than shipping a dead link — and
  `sameAs` never asserts a profile that isn't real, which would be a bad
  structured-data signal.
- **Placeholders are reported, not enforced.** The shipped values are
  obviously fake (`example.com`, "Your Name") so nothing pretends to be real
  identity. `pendingSiteConfigPlaceholders()` lists what's outstanding and
  the unit test *prints* it. Failing on it would be wrong: placeholders are
  the correct state during development, and a test that always fails is a
  test people learn to ignore.

### What shipped

About, Contact, Privacy, Terms — all `ProseContainer` reading pages via a new
`ContentPageLayout`, all in the sitemap, all reachable from every page
through the footer's new second row. Plus `Organization` structured data on
the homepage (the site published plenty of markup about its *tools* and none
about its *publisher*) and `/.well-known/security.txt` as a route handler, so
its `Expires` field — required by RFC 9116 — is regenerated at build time
instead of rotting in a checked-in file.

**The Privacy page is the one that matters.** Every claim on it was checked
against the code first: no cookies anywhere, no `localStorage`/
`sessionStorage`/IndexedDB, an analytics module whose only provider writes to
`console.debug`, and no server endpoint that can receive a file. It names the
one exception (CARTO map tiles) and tells the reader how to verify the whole
thing with their own Network tab. `site-pages.spec.ts` re-checks the
load-bearing claims in a real browser — it reads the cookie jar and both web
storages and fails if anything appears — because a policy that drifts from
the code is worse than no policy, and here it is also the product's main
differentiator.

`SITE_CONFIG.advertising` drives the third-party section, so turning an ad
network on cannot silently leave the page claiming no third-party script runs.

### Argued against, and not built

Status, API, Careers, Press, Community, Roadmap, and a separate Changelog.

The proposal framed this as "a serious SaaS application," and that template is
what makes those pages look mandatory. This isn't one: no account, no backend,
no data to lose, and `src/app/api` is required to stay empty. A Status page
for a client-side app is theatre — nothing can be down except static hosting.
An API page advertises a server the architecture exists to not have. Careers
and Community pages with nothing behind them are negative trust signals, not
neutral ones. Each would have been a confident footer link to an empty
promise.

The eight-way contact taxonomy was cut to three (general, bugs, security) for
the same reason: labelled inboxes for volume nobody has measured read as
theatre and multiply what has to be monitored.

**Contact is email + GitHub issues, not a form.** A form needs somewhere to
POST — either a server endpoint this project deliberately doesn't have, or a
third-party form service, which means new off-origin JavaScript and a CSP
change on a site whose entire pitch is having neither.

### The blocker that wasn't in the proposal

Advertising. The differentiation is "files never leave your device," backed by
e2e tests asserting **zero off-origin requests**. Wiring AdSense means
third-party tracking JavaScript, a looser CSP across four directives, a
certified consent banner for EEA/UK visitors, and those privacy tests failing
— correctly, because the claim would have changed.

The recommendation on record is a contextual, non-tracking network instead:
lower revenue, no consent banner, and consistent with the only thing that
makes this project distinctive. `SITE_CONFIG.advertising` encodes the decision
so the Privacy page follows it automatically. This is a product decision, left
to the owner — but it belongs *before* launch, not after indexing.

Also verified while reviewing: the CARTO/OpenStreetMap basemap attribution is
correctly wired on the tile source. Missing map attribution is a genuine
licensing violation and a classic pre-launch blocker; this one was already
fine.

### A test-writing note

`getByText(/sets no cookies/i)` failed against a sentence that renders as
`FileBrix<!-- --> sets no cookies` — an interpolated site name makes React
emit a comment node mid-phrase, and the text engine sees two nodes rather than
one. Scoping to the section and using `toContainText` (substring over
`textContent`) is robust to that, and worth reaching for whenever an assertion
spans a JSX interpolation.

**Verification:** `tsc --noEmit` clean, lint clean, Vitest 769/769 (99 files),
clean production build, bundle budget green, full Playwright suite at
`workers: 1`.

---

## 42. Shapefile and TopoJSON, without a second projection engine

Two new input formats for the Geospatial engine, chosen from a longer list
after costing each one. Both are read-only, both normalize to GeoJSON on the
way in, and neither changed a single engine op.

### Verified before anything was built

The claim that mattered wasn't "shpjs parses a shapefile" — it was "shpjs puts
the shape in the right place on Earth". Shapefiles are usually authored in a
projected national grid, so a reader that ignores the `.prj` sidecar produces
perfectly valid-looking GeoJSON containing metres instead of degrees.

`scripts/generate-shapefile-fixtures.py` (pyshp — an independent
implementation, same reasoning as the reportlab/qpdf PDF fixtures) writes a
square around Prague in EPSG:5514 at roughly (-743000, -1044000). Run through
`shpjs` before any UI existed, it came back at **(14.4086, 50.0684)** with its
`.dbf` attributes intact. That is the whole feature working, and it was
established in about ten minutes of probing rather than after a day of wiring.

`tests/unit/geoShapefile.test.ts` pins it as a coordinate *range check*, not a
"geometry exists" assertion — the same lesson as entry 27, where a silently
unchanged file still passed a "did a download appear?" test.

### Why these two, and not the rest of the list

The prompt came from another GIS site's import dialog offering Shapefile,
GeoJSON, TopoJSON, GeoPackage, FlatGeobuf, GeoParquet, GeoTIFF, KML and CSV.
Real npm figures decided it:

| Format | Package | Unpacked | Verdict |
| --- | --- | --- | --- |
| TopoJSON | `topojson-client` | 68 KB | shipped |
| Shapefile | `shpjs` | 677 KB | shipped |
| FlatGeobuf | `flatgeobuf` | 1.3 MB | later |
| GeoTIFF | `geotiff` | 3.8 MB | **no** |
| GeoPackage | `@ngageoint/geopackage` | 13.2 MB | **no** |

**GeoTIFF was refused on architecture, not size.** This engine is entirely
vector: turf operations, feature lists, property tables, a topology validator.
A raster has no features, no properties and no geometry to operate on, so
supporting it means a second parallel pipeline plus raster overlay rendering —
and would leave most of the 17 geo tools showing "not available for this file".
That is precisely the structural change the request asked to avoid.
**GeoPackage** was refused on weight and on needing a multi-layer picker UI
that doesn't exist.

**Shapefile turned out to be the cheapest of the two to justify**, because
`shpjs` depends on **proj4 — already a dependency** for the CRS converter. So
reprojection came from a library already vetted, pinned and tested against
published landmark coordinates, rather than from a second projection engine.

### Scope decisions worth keeping

- **Zipped shapefiles only.** A `.shp` alone has no attributes and no
  projection. Accepting only `.zip` is how they're actually distributed and
  needed no change to the Studio's single-file drop zone. Loose multi-file
  selection would have changed `GeoWorkspace.loadFile`'s signature.
- **Read-only, and the FAQs say why.** Writing a shapefile means four files,
  fixed-width DBF columns and a 10-character field-name limit that would
  quietly truncate property names; writing TopoJSON means constructing a
  topology. Shipping a lossy exporter would have been worse than shipping
  neither.
- **A zip with no `.shp` never registers as a shapefile.** Detection requires a
  `.shp` member (the signature sits after xlsx/ods, which are also zips), so
  such a file gets the generic unsupported-format message. The e2e test
  asserts *that* rather than the reader's own error, which only fires for a
  zip that looks like a shapefile but is corrupt.
- **No `heavy-libs.mjs` signature for `shpjs`.** Its distinctive strings land
  in a ~12 KB chunk, under the 40 KB floor, so a signature would never fire —
  and per that file's own warning, a check that can't fire is worse than none.
  The 210 KB shared-bundle ceiling is the real guard, and shared stayed at
  181.5 KB.

### Fallout, all in tests

Two existing geo tests hardcoded the drop zone's full label, which now lists
more formats. They match its stable prefix instead, so the next format added
doesn't break them again.

**Verification:** `tsc --noEmit` clean, lint clean, Vitest 776/776 (100 files),
clean production build, bundle budget green (shared 181.5 KB of 210 KB), full
Playwright suite at `workers: 1`.

---

## 43. Six additions from a competitor review, and a written verdict on everything else

A competitor (geodataviewer.com) offers ~22 formats and a wide tool surface.
Rather than chase the list, each capability was costed against this codebase;
six were built, the rest were written down with their verdicts so the same
evaluation never has to happen twice.

### The strategic finding

They achieve breadth with **GDAL compiled to WebAssembly** — one monolithic
binary covering every format. That's the fork in the road, and the answer is
no, for a reason that isn't "too big": it inverts this project's page-weight
advantage. Converting a KML here costs ~190 KB; under GDAL the identical
conversion pulls tens of MB, because GDAL can't be tree-shaken per format.
The per-format readers are *better* for the common cases and worse only for
the long tail. Recorded in `ROADMAP.md` with the condition that would change
the answer.

### Shipped

- **KMZ import.** A KMZ is a zipped KML, and both `jszip` and the KML parser
  were already here — so this only decides *which* archive entry is the
  document. It prefers `doc.kml` and skips macOS `__MACOSX/` resource forks,
  which otherwise yield a phantom `._doc.kml` that gets picked first and
  fails to parse. The existing KML tool page accepts both rather than a
  near-duplicate page being created for the compressed variant.
- **UTM Zone Finder and Map Tile Calculator**, one `GeoCalculatorTool` with a
  `mode` prop, both paste-first like the coordinate converter. The maths
  lives in `engines/geospatial/convert/tiles.ts` because it has published
  reference answers worth testing — including the UTM grid's two real
  irregularities (zone 32 widened over southern Norway; Svalbard using only
  31/33/35/37), which a plain `floor((lon+180)/6)+1` gets wrong.
- **Bounding Box, Centroid and Convex Hull pages.** These operations were
  already built and working as Studio-only Analyze actions with **no URL of
  their own**, which made them invisible to search. Registry entries plus
  three thin pages — the highest value-per-hour item in the whole review,
  and zero engine work.
- **An attribute filter in the GeoJSON viewer.**

### The bug the filter nearly introduced

Map highlighting addresses a feature by its index in the *unfiltered* list.
Filtering the table and passing the row's new position through would have
highlighted the wrong shape — silently, and only while a filter was active.
Each row now carries its original index and the click handler translates
back. Worth recording because the failure mode is invisible in a screenshot
and passes any "does clicking do something?" test.

### A test that asserted a remembered number

The first draft of `geoTiles.test.ts` pinned Prague's zoom-12 tile to
2213/1390 "as documented". It's 2212/1387; the implementation was right and
the test was wrong. Fixed by computing it independently with the standard
slippy-map formula and recording that derivation in the test.

The project's rule for CRS work — *verify a projection against real reference
coordinates, never just "it produced output"* — clearly needs its corollary
stated too: **a reference value is only worth having if it came from
somewhere other than memory.** Now written into the test itself.

### `ROADMAP.md`

New, and the reason this entry exists. Three states — **Next**, **Deferred**
(with the condition that would promote it) and **Not building** (with the
architectural reason) — covering GDAL, GeoTIFF, GeoPackage, FlatGeobuf,
GeoParquet, GML, Shapefile export, PMTiles, and every server-dependent
feature (elevation, weather, routing, geocoding), plus the earlier verdicts
on Compress PDF, PDF password protection and coordinate editing so they live
in one place instead of scattered across log entries.

`README.txt`'s "Potential later tools" stays the product wish list;
`ROADMAP.md` is the engineering verdict on it, and CLAUDE.md now points at it
before anyone proposes a format.

### Deliberately not in this batch

**Measure distance/area on the map**, **WKT/WKB**, and **colour-by-attribute
styling** are recorded as *Next*, not built. Measure and styling are the only
items touching the map interaction layer, which has two documented dev-only
failure modes (the synchronous `style.load` trap, the `relative`-class
teardown bug), and neither earns a new indexable URL — they deserve a pass
with real browser verification rather than riding along with six
SEO-visible additions. WKT is really the front half of the GeoParquet
workstream and belongs with it.

**Verification:** `tsc --noEmit` clean, lint clean, Vitest 787/787 (101
files), clean production build, bundle budget green, full Playwright suite at
`workers: 1`.

## 44. Deployable to Cloudflare without giving up the same-origin guarantee

Getting the site onto Cloudflare Workers turned out to hinge on one number:
Cloudflare rejects any individual static asset over **25 MiB**, on the Free
and Paid plans alike. DuckDB-WASM ships two engine binaries — 39.4 MB and
34.2 MB — and they are the only files in the project anywhere near it. The
deploy would have been refused outright.

### The adapter, and why not a static export

Every route here prerenders, so `output: "export"` looks like the natural
fit and needs no adapter at all. It's the wrong call: `next.config.ts` is
where the CSP headers, the permanent `/pdf-tools` → `/pdf-studio` redirects
and the DuckDB extension rewrite live, and a static export supports **none**
of `headers()`, `redirects()` or `rewrites()`. All three would have to be
hand-ported into Cloudflare's `_headers`/`_redirects` files — three separate
chances to quietly weaken the security headers on the site whose whole
premise is those headers. `@opennextjs/cloudflare` keeps `next.config.ts`
authoritative, at the cost of a Worker invocation per request.

### The 25 MiB problem, solved without a second origin

The two obvious fixes are an R2 *public* bucket, or binding the bucket to an
`assets.filebrix.com` subdomain. Both are configuration-only, no code — and
both are **cross-origin**, which means widening `connect-src 'self'` and
weakening the e2e tests that assert this site makes zero off-origin requests.
Those tests are the privacy claim, not paperwork about it.

So instead: `public/.assetsignore` keeps the two binaries out of the upload,
and `app/duckdb/[file]/route.ts` streams them out of a private R2 bucket at
**the same `/duckdb/*.wasm` URLs they already had**. `engines/parquet/
index.ts` needed no change at all, the CSP is untouched, and the route is
GET-only behind a two-entry allow-list so a crafted `[file]` can't read any
other key in the bucket.

### The two things a real Worker caught that nothing else would

Running the actual app against `wrangler dev` — not reading docs, not trusting
a green build — found two failures, both caused by the same thing: **Cloudflare
serves static assets before the Worker runs**, so Next never sees those
requests and has no filesystem to resolve one against.

- **`rewrites()` to a `public/` file 404s.** DuckDB's parquet extension
  autoload was a rewrite from `/duckdb-ext/:version/:platform/...` to
  `/duckdb-ext-files/:platform/...`, and it simply stopped working: the wasm
  loaded from R2, then the extension 404'd and Parquet Viewer never rendered a
  row. It's a route handler now. The symptom is worth remembering — DuckDB's
  reaction to a missing extension isn't a network error but a low-level
  `RuntimeError: function signature mismatch` inside the wasm module, the same
  trap this project fell into once before with the CSP.
- **`headers()` never reaches a static asset.** Engine assets came back with
  Cloudflare's default `Cache-Control: public, max-age=0, must-revalidate` and
  no security headers, quietly throwing away the caching decision
  `ENGINE_ASSET_CACHE_HEADERS` exists to make. `public/_headers` restores it.

Neither is loud. The first shows up as "the viewer doesn't work"; the second
shows up as nothing whatsoever. A green `npm run build`, 790 unit tests and
322 Playwright tests all passed with both bugs present, because every one of
them runs against `next start`, where `public/` is served by Next itself.

**And then the fix broke the other direction**, which is the part worth
keeping. The replacement route read its binding as
`getCloudflareContext().env.ASSETS ?? fetch(...)` — except
`getCloudflareContext()` *throws* off-Worker rather than returning an empty
context, so the fallback was unreachable and the route 500'd under
`next start`. Eight Playwright tests caught it, all of them Parquet. Bindings
now go through `lib/cloudflareBindings.ts`'s `cloudflareEnv()`, which catches.

The lesson isn't about either API. It's that the local path and the deployed
path each invalidate the other's assumptions, so a change touching both has to
be run in **both** — a green Playwright suite said nothing about Workers, and
a working Worker said nothing about `next start`.

**The revised rule:** treat any `next.config.ts` behaviour that touches a
static asset as broken until it's been seen working against `wrangler dev`.
`redirects()` and `headers()` on Worker-served responses were checked the same
way and do work.

### Three more things that had to be checked rather than assumed

- **`wrangler deploy --dry-run` cannot verify `.assetsignore`.** The ignore
  function runs inside `syncAssets`, at upload time — a dry run reported
  the identical file count with the patterns present and absent, tried both
  ways. Reading wrangler's own source settled it, and showed the ignore
  check runs *before* the size check, so a matched file is never measured.
  The patterns are now verified in `tests/unit/engineAssets.test.ts` against
  the same `ignore` package wrangler uses.
- **The dev server serves the static file, not the new route.** A route at
  `/duckdb/[file]` and a real file at `public/duckdb/duckdb-eh.wasm` collide,
  and it could plausibly resolve either way. Curling a running dev server
  answered it: `206`, `Content-Range: …/34242586`, a file `Last-Modified` —
  the static file wins, and local development is unchanged.
- **A missing OAuth scope is not a refusal.** `wrangler login --scopes-list`
  offers `d1`, `pages`, `queues` and a dozen more, and nothing at all for R2,
  which reads like the CLI simply cannot manage buckets. It can:
  `wrangler r2 object put --remote` works with the ordinary OAuth session.
  What blocks it beforehand is `code: 10042 — Please enable R2 through the
  Cloudflare Dashboard`, an *account* error rather than a permissions one, so
  enabling R2 is the only step that genuinely needs the dashboard.
  The first draft of this entry recorded the wrong conclusion, and the upload
  script's error path repeated it as a guess — which cost the person running
  it a hunt for an API token they never needed. The real fault was the script
  spawning `npx.cmd`, which Node has refused to execFile without
  `shell: true` since the CVE-2024-27980 fix in 20.12. It runs
  `node .../wrangler/bin/wrangler.js` now, and its catch block prints the
  actual error instead of a theory. **An error path that speculates about a
  cause is worse than one that just reports the failure.**

### The test that connects three unrelated files

`tests/unit/engineAssets.test.ts` is the counterpart to `layout.spec.ts`:
sizes on disk, the patterns in `.assetsignore`, and the allow-list in
`lib/engineAssets.ts` all have to agree, and nothing in the type system
connects them. It asserts every oversized file is excluded, that everything
excluded is served back from R2, **and the inverse** — that nothing under the
limit is excluded, because an over-broad `duckdb/*` would silently drop the
two ~800 KB worker scripts and DuckDB would fail to start with no clue why.
Confirmed to fail, with a readable message, when the patterns are removed.

Without it, a future `@duckdb/duckdb-wasm` bump pushing a third file over the
line would pass `tsc`, lint, every other test and `npm run build`, then be
rejected by `wrangler deploy` on someone else's machine.

### Two smaller findings

- **ESLint has to ignore `.open-next/`.** It isn't covered by `.gitignore`
  (ESLint doesn't read it), and linting the bundled worker exhausts Node's
  4 GB heap: `npm run lint` died with "Ineffective mark-compacts near heap
  limit", which reads like a project-wide failure rather than one unignored
  build directory.
- **Cloudflare bindings are typed by hand** (`src/types/cloudflare-env.d.ts`).
  `wrangler types` emits either an `R2Bucket` that silently resolves to `any`
  — a probe assigning the binding to a `number` compiled cleanly — or 550 KB
  of workerd runtime types redefining `Request`/`Response` against the DOM
  lib this app is built on. One binding with one method called on it isn't
  worth either; same call as `src/types/shpjs.d.ts`.

**Verification:** `tsc --noEmit` clean, lint clean, Vitest 790/790 (102
files), clean production build, `opennextjs-cloudflare build` clean, bundle
budget green (181.5 KB shared, 28.5 KB headroom), full Playwright suite at
`workers: 1` — and, the one that actually mattered here, Parquet Viewer driven
through a real browser against a local `wrangler dev`, reading its wasm from
R2 and its extension through the new route, with zero off-origin requests and
no console errors.

## 45. The deploy that couldn't, and the architecture that was already right

Entry 44 got the site deployable in principle. It wasn't: `wrangler deploy`
uploaded all 327 assets, then refused the Worker.

```
Your Worker exceeded the size limit of 3 MiB.
Total Upload: 17731.50 KiB / gzip: 4072.34 KiB
```

Workers Free caps a script at **3 MiB gzipped**. `@opennextjs/cloudflare`
bundles the whole Next server, which came to 3.98 MiB. The largest single
removable dependency was `next/og` — measured, not guessed, at **603 KiB
gzipped** — against a ~1000 KiB gap. Shrinking couldn't reach it.

### The real finding

The interesting part isn't the limit, it's what the limit exposed: **4 MB of
Next server was being deployed to serve 119 pages that are all prerendered and
0 that aren't.** The adapter existed to run a server this app doesn't have.

So the site became a static export with a hand-written Worker for the few
paths that can't be files. That removed the 3 MiB problem and the 100k
requests/day one at the same time — static assets never invoke a Worker at
all — and the deployed script went from 3.98 MiB to a few KB.

### Reversing an earlier decision, and why

Entry 44 argued *against* static export: `next.config.ts` carried the CSP,
the permanent redirects and the DuckDB rewrite, and hand-porting them was
"three chances to silently weaken the security headers."

Two of those three had already collapsed by then. The rewrite didn't survive
deployment at all (entry 44), and `headers()` never reached a static asset, so
`public/_headers` had to be written anyway. Only `redirects()` was still doing
its job. The argument had mostly been overtaken by facts on the ground; what
remained was the fear of hand-porting, and the answer to that is a test, not
an adapter.

| was | is now |
| --- | --- |
| `headers()` | `public/_headers` |
| `redirects()` | `public/_redirects` |
| `rewrites()` | `worker/index.ts` |

### The change that should have come first

**The e2e suite now runs against `wrangler dev`, not `next start`.**

`next start` refuses to run in export mode, so this was forced — but it is the
single most valuable thing in this entry. The suite now exercises the
*deployed artifact*: `out/`, `_headers`, `_redirects`, the exported 404 page
and `worker/`. Every deployment bug in entries 44 and 45 was invisible to a
green 322-test run precisely because that run was against a different server.
`tests/e2e/deploy-headers.spec.ts` adds 16 tests over the CSP, all nine
permanent redirects, cache policy, the OG image's content type and both Worker
paths — none of which any test could see before.

### Four things that fail silently

Every one was found by running the real thing; none produced an error naming
its cause.

- **`run_worker_first` as an array means the Worker runs for those paths and
  nothing else.** Adding `/opengraph-image` to it instantly 404'd both DuckDB
  routes, which had worked a minute earlier with no `run_worker_first` at all.
  Other non-asset paths stop falling through and get `not_found_handling`.
- **`Content-Type` is disallowed in `_headers`, and including it invalidates
  the whole block** — no error, just one fewer "valid header rule" in
  wrangler's startup line. Next writes the OG image with no file extension, so
  Cloudflare sends no content type, and `nosniff` forbids guessing: every
  social link preview would have been blank. It's served by the Worker now.
- **`_headers` applies to asset responses, not Worker responses.** Moving a
  path into the Worker silently drops its cache and security headers. Hence
  `/duckdb/*.wasm` rather than `/duckdb/*` — the two ~800 KB worker scripts
  beside them are ordinary assets and must stay on the asset path.
- **`force-static` is required on `robots.ts`, `sitemap.ts` and
  `opengraph-image.tsx`.** On the OG image it's load-bearing rather than
  ceremonial: it means `next/og` runs at build time, so `resvg.wasm` — 1.3 MB
  that the adapter had been shipping in the Worker to regenerate an image that
  never changes — isn't deployed at all.

**Verification:** `tsc` clean, lint clean, Vitest 790/790, clean export build
(119 static pages, 0 dynamic), bundle budget green (181.5 KB shared), and
**338/338 Playwright** against `wrangler dev` — the first run in this
project's history that tested what actually ships.

## 47. The image tools never showed you what they did

Reported by the first person to actually use the site: applying a brightness
change produced no preview of the result. The only way to see the effect was
to download the file and open it — so nudging a value a few percent and
looking, which is the entire workflow those tools exist for, meant a download
per attempt.

`ImageBatchList` rendered `URL.createObjectURL(file)` — the *input* — and on
success replaced the status text with a Download button. The output was never
displayed anywhere, on any image tool.

Worth separating two things that looked like one problem: **re-running already
worked.** Each Apply snapshots its settings into a new `Job` and remounts the
list by key, so the image really was reprocessed every time. Only the feedback
was missing, which made a working feature look broken.

### What changed, all in the one shared component

- **The thumbnail is the result** once processing finishes, falling back to
  the source while a file is still in flight so the slot never flashes empty.
- **`before → after (±N%)` per file.** For Compress that is the entire answer
  the tool gives. It immediately made an existing oddity legible: compressing
  a gradient PNG grows it from 22.7 KB to 124.5 KB (+448%), because the tool
  converts to JPEG and PNG stores smooth gradients better. The page already
  said so in prose above the button; now the number says it too.
- **"Compare with original"** flips every preview back. Nearly free — both
  object URLs already existed, one for the source and one now for the result.
- **One image gets a 320px preview; a batch keeps 140px thumbnails.** A
  thumbnail is fine for "that's the right file" and useless for judging a 5%
  brightness change. Widening the grid instead would make a 20-file batch
  scroll for pages.

Because it lives in `ImageBatchList`, every image tool got this at once —
conversions, all seven Edit actions, and metadata removal.

### One trap worth remembering

The result object URLs are created *during* processing, not at mount, so the
existing `pagehide` revoke — which captures the preview URLs in a closure at
mount time — could never have seen them. They go into a ref the handler reads
at revoke time instead. The same effect already carried a long comment about
Strict Mode revoking URLs too early (PROJECT_LOG entry 39); this is the
mirror-image mistake, revoking too few.

**Verification:** `tsc` clean, lint clean, Vitest 791/791, Playwright 340/340,
plus the new `image-tools.spec.ts` block asserting the shown image is the
result, that the size line is rendered, and that Compare flips both ways —
and the two states inspected as real screenshots.

## 48. Structured data pointing at pages that don't exist, and the first page written for a question

Started as an SEO question — the site ranks for "xml to csv" but nothing
targets "is it safe to convert files online" — and turned up a live defect on
the way.

### The defect

`/privacy` and `/terms` were emitting `BreadcrumbList` structured data whose
final URL 404s:

```
/privacy  ->  https://filebrix.com/privacy-policy    HTTP 404
/terms    ->  https://filebrix.com/terms-of-service  HTTP 404
```

`ContentPageLayout` derived the breadcrumb href from the page **title** —
`/${title.toLowerCase().replace(/\s+/g, "-")}`. Correct for "About" and
"Contact" by coincidence, wrong for the two whose title isn't their slug.

Three things had to line up for this to ship. The *visible* trail renders the
title, so it looks right on screen while only the machine-readable half is
wrong. `tsc` and lint can't see inside a string. And the link audit run the
day before crawled `<a href>` attributes — structured data isn't a link, so it
looked at everything except the thing that was broken.

The derivation is gone rather than patched: a URL computed from a display
string couples two values that are allowed to differ.
`tests/unit/structuredDataUrls.test.ts` now walks every JSON-LD block on all
120 built pages and asserts each internal URL resolves to a page that exists.
Confirmed against the pre-fix build, where it named both offenders.

### The homepage title

"Free Online File Tools That Run in Your Browser" described the mechanism.
Nobody searches for "runs in my browser" — they search "convert files without
uploading", "no upload converter", "private file converter". Now "Free Online
File Tools That Don't Upload Your Files": same claim, the language of the
need, category term still first. The description names formats too.

Changed now because the site was submitted to Search Console days ago and
nothing is indexed yet, which makes this the cheapest it will ever be.

### One page for the category question

Every other indexed page targets a transactional query, which is what a new
domain can actually win. Nothing targeted the question people ask *before*
they trust a converter with a contract.

`/are-online-file-converters-safe` answers it, under two constraints that
mattered more than ranking: it has to be useful to someone who then doesn't
use this site (the "check it in the Network tab" section works on any
converter, including competitors), and our own limits are stated as plainly
as everyone else's — the tile exception, and the fact that any site's
JavaScript is something you're trusting. A page that only concludes "so use
ours" is marketing, and marketing doesn't earn the links a new domain needs.

Deliberately **one** page, not a set of phrase variants. That pattern is what
Google calls doorway pages, and it's the same thin-content trap
`registry/studios.ts` already avoids by giving a zero-tool capability no index
page.

### Two smaller things

The orphan audit that started all this came back clean and is worth recording
as a result: 120 pages, **zero** broken internal links, **zero** pages deeper
than three clicks from the homepage, and the only pages with no inbound link
are `/404` and `/_not-found`, which is correct. Internal linking is not this
site's bottleneck; external links are.

Entry 47's rendered-prose test immediately caught **seven** fused words in the
new page's own copy — the same `</strong>`-swallows-its-space bug, in text
written a day after the test that finds it.

**Verification:** `tsc` clean, lint clean, Vitest 792/792 (104 files), clean
export build, bundle budget green, Playwright 340/340 (the three Firefox image
tests flaked once under end-of-run load and pass in isolation — now documented
in CLAUDE.md as a known local pattern).

## 49. Controls fine enough to use, a result you can actually look at, and two green tests that were wrong

Follow-up to entry 47, from the same person using the thing: the image tools
were fine for "make it much brighter" and useless for "make it slightly
brighter".

### The controls

Brightness and contrast had `step={5}` — 41 positions across a ±100 range.
Dropping to `step={1}` looked like the whole fix and isn't: the slider carried
no width class, so it rendered at the browser default of roughly 150px, which
is **0.75px of travel per unit**. You cannot land on a value by dragging that.

`components/image/AdjustmentSlider.tsx` widens the track *and* adds a number
box, and the number box is the part that matters — the workflow is "try 12,
look, try 13", and typing is the only way to repeat a value or return to the
one that looked right two attempts ago. Quality moved from `step={0.05}` to
1% for the same reason, where the difference between 85 and 82 is measured in
hundreds of kilobytes. Shared, so the convert tools got it too.

### Looking at the result

Entry 47 made the result visible at 320px, which is enough to see *that*
something changed and not enough to judge one percent of it. Clicking the
preview now opens it full size.

Built on the native `<dialog>` and `showModal()`. That is the accessible
option rather than the lazy one: focus trapping, Escape, `aria-modal`, page
inertness and the backdrop all come from the browser, and every one of them is
something a div-based overlay has to reimplement. This codebase had no modal
at all before, and adding a half-correct one where `Toolbar` is a real tablist
and `ActionPicker` a real radiogroup would have been a step backwards.

### Both new things shipped with a passing test and a visible bug

Worth recording together, because they have the same shape.

**The dialog opened in the corner.** Tailwind's preflight resets `margin` on
every element, which kills the `margin: auto` a modal `<dialog>` centres
itself with. `dialog.open` was `true`, `:modal` matched, Escape closed it — a
test asserting "the modal works" passed while it sat in the top-left. Found by
looking at a screenshot. The test now measures the dialog's actual geometry.

**The WebGL probe asked the wrong question.** Entry 46 skipped the map test
where WebGL is unavailable, verified against Chromium with `--disable-webgl`,
and it worked — for Firefox, which returns `null` from `getContext`. The very
next CI run failed on **WebKit**, which returns a context that then paints
nothing. The probe now clears a 2×2 canvas to a known colour and reads the
pixel back, which is the only version of the question both browsers answer
honestly. It still can't be verified locally, because this machine's antivirus
removes WebKit's executable — and it is deliberately built so that a browser
which *passes* the probe still runs the assertion, so it cannot hide a real
Safari rendering bug.

The pattern in both: a green test that measured the wrong property. Existence
(`open`, `getContext`) instead of behaviour (position, pixels).

### One thing that isn't a bug

CI logs are full of `kj::…disconnected: Broken pipe` from workerd. That is the
Worker complaining that Playwright closed a connection before it finished
writing, which is what happens across hundreds of rapid requests. The run
those appeared in was `342 passed, 1 failed`, and the one failure was the
WebKit map test. Noisy, not broken.

**Verification:** `tsc` clean, lint clean, Vitest 792/792, clean export build,
bundle budget green, Playwright 342/342, plus both new behaviours driven in a
real browser and inspected as screenshots.

## 50. Five things a person using the site actually hit

Not a planned round. Five reports from real use, collected over an evening and
done in one pass. Four are the same shape: the tool worked, and you couldn't
see what it had done.

### The image tools threw your settings away

Reported as "the images are still getting reset after moving to another modify
tab", alongside wanting to rotate, then adjust contrast, then brighten,
without downloading and re-uploading between steps.

Measured first, because "reset" could mean three different things: the **file**
always survived; the **settings and the result** did not. `ImageStudioApp`
keyed the transform tool on the active Edit action, so every switch remounted
it and zeroed eight `useState`s.

Two changes, and the split between them matters:

- **Settings now persist** — the key is the document alone. Switching
  Brightness → Contrast → Brightness keeps the number you dialled in.
- **The result still clears**, deliberately. A `Job` is a snapshot of one
  operation, and rendering a brightness result under the Contrast controls
  would claim the wrong thing about what you are looking at.

Chaining is answered separately, by **"Continue editing this result"**: the
output replaces the workspace's file, so the next edit builds on it. That is
what the request actually described — "first rotate, then contrast, then
brightness" is a *sequence*, not a set of options to accumulate, and a
sequence preserves order in a way a single combined pipeline pass cannot
(rotate, crop, rotate again has no representation in one `ImageProcessOptions`).

### You couldn't see a PDF page well enough to choose it

The page grid renders each page at 140px. Enough to count pages, not enough to
tell which is which — so deciding *which* page to delete meant opening the PDF
somewhere else, which is the opposite of the point.

Clicking a page now opens it full size, **re-rendered at 1400px** rather than
upscaled; the test asserts `naturalWidth > 400` precisely so a stretched
thumbnail would fail it. `ImageLightbox` became the shared
`components/tools/Lightbox` and learned to open *before* its image is ready,
because pdf.js has to rasterise the page first and a dialog that appears after
a pause feels broken.

### Deleting pages was invisible until you'd committed

Moving and rotating already showed their effect live. Marking a page for
deletion did nothing visible, so the result was a surprise. Marked pages are
now greyed out — through the *same* predicate that decides the output, since
the checkbox means opposite things in the two modes that have one ("Delete"
drops, "Keep" retains) and reading `marked` directly is wrong half the time.

### The diff viewer couldn't merge

`mergeDiffBlock()` in `engines/developer/diff.ts` rebuilds one side with a
single block taken from the other. It's short because `rows` is already an
aligned representation of both texts — merging is choosing, per row, which
side's value to keep. No line-number arithmetic.

Two things worth keeping:

- **The `→`/`←` buttons live in the change-stepper**, not floating between the
  panes. The table is one grid with no gutter to hang them in, and pairing
  them with the step buttons makes the keyboard path (`n`/`p`, then merge) and
  the mouse path the same path.
- **There is an explicit Undo.** A programmatic write to a textarea does not
  enter the browser's undo stack, so without it one mis-aimed click silently
  destroys text someone typed by hand.

Seven unit tests, including the property that matters: merge every block in
turn and the two sides converge to identical.

### WebKit, now that it runs here at all

An antivirus exclusion finally let WebKit run on the development machine, and
it settled a question that had been open since entry 46: **the map test passes
there.** So the WebGL probe is right and the CI failure was environmental, not
a Safari bug.

It also turned up something new. Playwright's WebKit-for-Windows has **no
`OffscreenCanvas` at all** — main thread or worker — which the entire image
engine is built on, so those tools fail there with "This image couldn't be
processed". Not a Safari problem: Safari 17 supports it fully (16.2–16.6
partially, checked against caniuse rather than recalled), and the Linux WebKit
in CI has it. The image `@cross-browser` tests now probe for it and skip,
which is the same discipline as the WebGL probe — measure the capability,
don't assume the environment.

**Verification:** `tsc` clean, lint clean, Vitest 799/799 (105 files), clean
export build, bundle budget green, Playwright 349/349, plus each of the five
driven in a real browser.

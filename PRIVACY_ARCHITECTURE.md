# Privacy Architecture

This document explains, precisely and technically, how this application
honors its core promise:

> **Your files never leave your device.**

Everything below was verified directly against the current codebase — by
grepping for every network-capable API across `src/`, reading every engine
that touches a file, inspecting the installed third-party library source
for hardcoded network endpoints, and confirming behavior with real browser
tests (`tests/e2e/`) — not assumed from documentation or library reputation.
See the "Security & Privacy Audit" section of the project history for the
full methodology and findings; this document is the durable reference.

---

## 1. What network requests the application makes

The application makes exactly **three** kinds of network request, and
nothing else:

1. **The application's own static assets.** HTML, JS, CSS, fonts (`next/font`,
   self-hosted), and the site's own images — the normal cost of loading any
   website, served by our own infrastructure (`connect-src 'self'` in the
   CSP covers this).
2. **Self-hosted engine assets**, fetched same-origin: DuckDB-WASM's `.wasm`
   binaries and worker scripts (`/public/duckdb/*`), its Parquet extension
   (`/public/duckdb-ext-files/*`, rewritten from `/duckdb-ext/*` — see
   `next.config.ts`), pdf.js's worker/cmaps/standard-fonts/wasm/icc assets
   (`/public/pdfjs/*`), and the Material Icons webfont the Spreadsheet & Data
   app's Editor mode toolbar needs (`/public/fonts/*`, from the `material-icons`
   npm package, Apache-2.0 — not Google Fonts' CDN, which our CSP's
   `font-src 'self'` wouldn't allow anyway). None of these are fetched from a
   third-party CDN at runtime; they're generated into the repo (gitignored,
   regenerated on every install) by `scripts/copy-duckdb-assets.mjs`,
   `scripts/fetch-duckdb-extensions.mjs`, `scripts/copy-pdfjs-assets.mjs`,
   and `scripts/copy-material-icons-assets.mjs`, and served from our own
   origin.
3. **Basemap tile images**, for the Geospatial engine's map tools only
   (GeoJSON Viewer, GPX Viewer): raster PNG tiles from
   `*.basemaps.cartocdn.com` (free, no API key). This is the **one
   deliberate exception** to same-origin-only, and it is scoped as tightly
   as the browser's own security model allows:
   - `next.config.ts`'s CSP allows `connect-src`/`img-src` to
     `https://*.basemaps.cartocdn.com` and nothing else off-origin.
   - The requests carry only tile `{z}/{x}/{y}` coordinates in the URL
     path — verified with a live network-interception test
     (`tests/e2e/geo-tools.spec.ts` and `tests/e2e/privacy-audit.spec.ts`)
     asserting every off-origin request's query string is empty and its
     origin is exactly the tile host.
   - User geometries, coordinates, properties, GPX tracks, and KML content
     are **never** serialized into a tile request. They're handed to
     MapLibre GL JS as a local, in-memory JavaScript object
     (`map.getSource(id).setData(geojson)` — see
     `src/engines/geospatial/map/maplibreClient.ts`), which MapLibre
     renders client-side against WebGL; nothing about that call touches the
     network.

There are no other network destinations anywhere in the application. This
was confirmed by:
- Grepping the entire `src/` tree for `fetch(`, `XMLHttpRequest`,
  `FormData`, `axios`, `navigator.sendBeacon`, `WebSocket`, and
  `EventSource` — **zero matches** outside the engine modules described
  above.
- Confirming `src/app/api/` contains no route handlers at all — there is no
  server endpoint that could receive a file even if something tried to
  call it.
- Confirming there is no `middleware.ts`.
- Real-browser network-interception tests per engine (image, PDF,
  spreadsheet, geospatial, developer tools, and the homepage's Universal
  File Drop) that assert **zero off-origin requests** while processing
  real files — including malformed, malicious, and adversarial ones (see
  §6 and `tests/e2e/privacy-audit.spec.ts`).

## 2. What never leaves the browser

Everything else. Concretely, none of the following is ever transmitted,
under any code path in this application:

- File contents (spreadsheets, PDFs, images, GeoJSON/KML/GPX, Parquet, SQL,
  or any pasted text)
- Filenames
- Parsed/derived data (table cells, schema, extracted text, EXIF fields,
  GPS coordinates, geometry/coordinates, hash digests, diff results)
- Generated output (converted files, downloaded results, zips)
- Error messages or stack traces (there is no error-reporting service — see
  §5)
- Anything typed into a tool's input (JSON, SQL, coordinates, Base64, etc.)

This isn't enforced by a runtime filter — it's true because the code that
could transmit any of this **does not exist**. There is no analytics
payload field, no logging endpoint, no error-reporting SDK, and no server
route capable of receiving it (§1). The CSP's `connect-src 'self'
https://*.basemaps.cartocdn.com` is a second, independent enforcement layer
on top of that: even a future bug that tried to `fetch()` a file's bytes
somewhere unexpected would be blocked by the browser itself, unless it
specifically targeted CARTO's tile host with a GET request.

## 3. How local file processing works

Every tool follows the same shape:

```
User selects/drops a file (File object, held in memory)
        ↓
Local type detection (magic bytes → content sniffing → extension;
  src/lib/detect/detectFile.ts — never uploads the file to detect it)
        ↓
Parsing/processing, either:
  - in a Web Worker (Comlink-based; src/engines/shared/workerClient.ts),
    for engines whose libraries have no DOM dependency — Spreadsheet
    (CSV/XLSX/JSON), PDF structural edits (pdf-lib), Geospatial's
    GeoJSON-only ops (Turf.js)
  - on the main thread, for engines whose library needs the DOM or manages
    its own worker — DuckDB-WASM (Parquet), pdf.js (PDF rendering/text),
    Image engine (Canvas/OffscreenCanvas), XML parsing (DOMParser doesn't
    exist in a Worker), KML/GPX parsing (same reason), MapLibre (manages
    its own internal worker(s))
        ↓
Result (Blob/table/rendered canvas) stays in memory as a JS object
        ↓
User-initiated download via Blob + a same-page <a download> click
  (src/components/tools/DownloadResult.tsx) — the file is written directly
  from the in-memory Blob to the user's disk by the browser; it is not
  written anywhere else first
```

At no point in this pipeline does a `File`, `Blob`, `ArrayBuffer`, or any
value derived from one cross a network boundary or get written to
persistent browser storage (§6). Workers receive the `File` object directly
via `postMessage`'s structured clone (a same-process, same-device transfer
— not serialization to a wire format) and return a `Blob` the same way.

**Filenames are treated as untrusted input**, since a `File`'s `.name` is
fully attacker-controlled (scripted drag-and-drop, not just an OS save
dialog). `src/lib/security/filenames.ts`'s `sanitizeFilename()` strips path
separators and control characters before a name is used as a download
filename (`DownloadResult.tsx`, `ImageBatchList.tsx`) **or** a ZIP entry
name (`ImageBatchList.tsx`'s `uniqueZipEntryName` — see the audit findings
below for why the latter needed fixing). PDF/Excel batch zips
(`PdfSplitTool.tsx`, `PdfToImagesTool.tsx`) sidestep the question entirely
by using self-generated entry names (`page-1.png`, `split-part-1.pdf`, …)
never derived from user input at all.

## 4. Analytics boundaries

`src/lib/analytics/` defines a **closed set** of allowed events
(`page_view`, `tool_opened`, `processing_started`, `processing_completed`,
`processing_failed`, `related_tool_clicked`), each with a fixed TypeScript
payload interface — never a `data: unknown` escape hatch. The payload
fields are limited to: a route path, a tool slug, an optional duration in
milliseconds, and an optional `ProcessingErrorCode` (one of five fixed enum
values like `"MALFORMED_FILE"` — never a raw error `message`, which could
in principle echo a fragment of file-derived text). It is **structurally
impossible** to attach a file's contents, a filename, a cell value, a
coordinate, or generated output to an analytics event, because no such
field exists on any event's type.

**Current state, verified by grep:** `track()` is never called anywhere in
the application. The default provider (`consoleProvider` in
`lib/analytics/index.ts`) only does `console.debug(...)` in non-production
— it never sends anything over the network even when invoked. In its
current state, analytics is entirely inert: no events fire, and the one
provider that exists couldn't transmit anything even if they did. The
abstraction (`setAnalyticsProvider`) exists so a real, privacy-conscious
provider can be wired in later without touching call sites — but doing so
would still be bound by the same closed event-payload types.

## 5. Third-party service boundaries

| Library | Purpose | Network behavior (verified) |
|---|---|---|
| `@duckdb/duckdb-wasm` | Data Studio's Parquet support (view/edit/analyze/convert, including converting other formats *to* Parquet) | Self-hosted WASM/worker/extension assets only (§1); `registerFileHandle(..., BROWSER_FILEREADER, ...)` reads the File via the browser's own FileReader into WASM memory — never persisted to OPFS/IndexedDB, never uploaded. Writing a Parquet file (`writeTableToParquet`, `engines/parquet/index.ts`) stays equally local: it ingests JSON text via `registerFileText`/`insertJSONFromPath` into DuckDB-WASM's in-memory virtual filesystem, runs `COPY ... TO ... (FORMAT PARQUET)`, and reads the result back out via `copyFileToBuffer` — no different network surface than the read path, and no telemetry found in the installed package source. |
| `pdfjs-dist` | PDF rendering, text extraction | Self-hosted worker/cmaps/fonts/wasm/icc assets only. Only the core `getDocument()` rendering/text API is used — the interactive scripting/AcroForm-JS layer (`pdfjs-dist/web/*`) is never imported, so embedded PDF JavaScript is never executed, not merely disabled by a flag. |
| `pdf-lib` | PDF structural edits (merge/split/rotate/…) | Pure in-memory byte manipulation; no network code at all. Encrypted PDFs are uniformly rejected (`loadPdfDocument`) rather than partially processed. |
| `maplibre-gl` | Map rendering | The open-source MapLibre fork specifically has **no** telemetry endpoint (unlike Mapbox GL JS, which it forked from specifically to remove that). Confirmed by scanning the installed bundle for hardcoded URLs: the only ones present are a GitHub issue link inside an error message string and spec-documentation links in comments — no telemetry/analytics host. Tile requests are the only network activity it performs (§1). |
| `proj4` | Coordinate reference system transformation | Carries every projection definition it needs as a local string — there is no EPSG lookup service, no registry fetch, and no remote datum-grid download in this app's usage. Verified by scanning the installed package for `XMLHttpRequest`/`fetch(`/`WebSocket`/`sendBeacon`: no matches. CRS definitions ship in `src/engines/geospatial/ops/crsRegistry.ts` as plain text, and a user-supplied proj4/WKT string is parsed locally by the same library. Reprojection therefore never transmits coordinates — see §1's network-interception test, which asserts every off-origin request is a basemap tile with no query string. |
| `exifr` | EXIF/GPS reading | Parses a `File`/`ArrayBuffer` already in memory; no network code. GPS coordinates it extracts are displayed locally and never transmitted (verified with a real GPS-tagged fixture — `tests/e2e/privacy-audit.spec.ts`). |
| `dompurify` | SVG/HTML sanitization | Pure DOM sanitization; no network code. Used before any SVG is ever handed to an `<img>`/`createImageBitmap` decoder. |
| `xlsx` (SheetJS) | Spreadsheet parsing | Pure in-memory parsing; no network or telemetry code in the free/community build used here. |
| `papaparse`, `js-yaml`, `jszip`, `comlink`, `@turf/*`, `@tmcw/togeojson`, `utm`, `proj4`, `sql-formatter`, `diff` | Format-specific parsing/formatting utilities | All pure, synchronous/local libraries; none contain network code. Scanned for telemetry-adjacent keywords (`analytics`, `sentry`, `bugsnag`, `amplitude`, …) — every match found was an unrelated false positive (an npm keyword tag, an SVG attribute name, a SQL dialect's function name, a substring collision), individually verified with source context. |
| `jspreadsheet-ce` (+ its `jsuites` dependency) | Spreadsheet & Data app's Editor mode (interactive grid) | Scanned both packages' compiled `dist/` bundles directly for `fetch`, `XMLHttpRequest`, `sendBeacon`, `WebSocket`, and hardcoded URLs. `jsuites` does contain a generic `XMLHttpRequest`-based `ajax()` helper, but it's only ever invoked by three explicitly opt-in config options — a dropdown column's `url` (fetch options from a remote source), a worksheet's `csv`/`url` (load external data), and `persistence` (save to a server) — none of which `SpreadsheetGridEditor.tsx` sets; with our actual configuration this code path is unreachable. `jspreadsheet-ce` renders one dormant `<a href="https://bossanova.uk/jspreadsheet/">` attribution link in its "about" context-menu item (a plain link — only a network request if a user manually clicks it, same as any external link on any page); we set `about: false` to remove it entirely rather than rely on that distinction. Cell values are rendered as plain text, never parsed as HTML (`parseHTML: false`, matching the library's own default) — verified with a real `<img onerror=...>` payload in `tests/component/SpreadsheetGridEditor.test.tsx`, confirming no element is created and the handler never fires. Its toolbar's icon glyphs (`.material-icons`) need a webfont neither package ships (confirmed: no `@font-face` in either's CSS) — self-hosted from the `material-icons` npm package (Apache-2.0) rather than Google Fonts' CDN, which our CSP would block anyway; a pure static font file, no executable code. |

**No error-reporting or crash-analytics SDK is installed or wired up** —
no Sentry, Bugsnag, Rollbar, LogRocket, Datadog, or equivalent appears in
`package.json`, and there is no `error.tsx`/`global-error.tsx`,
`window.onerror` handler, `unhandledrejection` listener, or React error
boundary anywhere in the app. Every error is caught locally with try/catch
at the point it occurs and rendered via `ErrorPanel` — it never leaves the
component that caught it.

**No cloud SDK of any kind** (storage, auth, functions, etc.) is present in
`package.json` or imported anywhere in `src/`.

## 6. Known browser limitations

- **A dropped file's `.name` is not a trustworthy filesystem name.**
  Anything that constructs a `File`/`DataTransfer` (a scripted
  drag-and-drop from another page, the File System Access API, or a crafted
  `<input>` value) can set it to arbitrary text, including path-traversal
  sequences. Every place a filename becomes a *download name* or a *ZIP
  entry name* must sanitize it — this audit found and fixed one path
  (`ImageBatchList`'s ZIP downloads) that didn't (see Findings below).
- **Web Workers cannot be given a hard memory ceiling from application
  code.** A sufficiently pathological file (e.g., a very large or highly
  nested one) can still exhaust memory inside a worker, and a worker the
  browser kills for OOM doesn't throw anything catchable — it simply stops
  answering. The *indefinite* stuck spinner this used to cause is now
  closed: `engines/shared/workerClient.ts` puts every worker RPC under a
  timeout (120s by default; 600s for the Spreadsheet engine, whose
  measured curve is an order of magnitude slower than the rest — see the
  measurements in that file), after which it terminates the worker, raises
  a `TIMEOUT` `ProcessingError` through the normal `ErrorPanel` path, and
  spawns a fresh worker so the tool still works on the next attempt. Calls
  that report progress reset that clock on every report, so a slow-but-
  healthy operation is never cut off.
  What remains is narrower and inherent: the error says the operation
  stopped responding, not *why*. A browser gives application code no way
  to distinguish "killed for OOM" from "wedged", so the timeout can't be
  reported as a definitive `OUT_OF_MEMORY`, and a user waits out the
  ceiling before seeing anything. Either way the operation fails locally —
  no data leaves the device, and no code path falls back to uploading the
  file when local processing fails (README.txt §31's requirement).
- **DOMParser's XXE resistance is a browser guarantee, not our code.** It
  reliably refuses to resolve external entities/DTDs in every browser this
  project targets (verified with real XXE and billion-laughs payloads —
  §1), but that guarantee lives in the browser vendor's implementation,
  not in application logic we control line-by-line.
- **PDF.js's `isEvalSupported` default (`true`) is left as-is.** It governs
  a restricted internal PostScript-calculator-function interpreter used for
  some color-space transforms, not execution of attacker-supplied
  JavaScript — disabling it would degrade color rendering for some PDFs
  with no meaningful security benefit, since embedded PDF *scripting*
  (AcroForm `/JS` actions) is already never executed (we never load
  pdf.js's scripting/viewer layer at all — see §5).
- **Browser extensions and devtools are outside this application's control
  boundary.** A user's own installed extensions can, in principle, observe
  page content or network traffic regardless of what this app does. This
  is true of every website and isn't something client-side code can
  defend against.
- **This is a best-effort, code-verified guarantee, not a formal proof.**
  This audit exhaustively checked the application's own code and the
  installed third-party library *source* for network-capable calls and
  known telemetry patterns, and backed the key claims with real-browser
  network-interception tests. It did not fuzz every third-party dependency
  or perform a binary/bytecode-level audit of compiled WASM modules
  (DuckDB, pdf.js's wasm codecs) beyond confirming their own asset-loading
  behavior is self-hosted and their documented/observed network surface
  matches what's described here.

---

## Security & Privacy Audit — Findings and Fixes

Performed by inspecting every network-capable browser API, every file
handler, every worker, every third-party dependency, and every storage API
across the codebase, cross-checked against real-browser tests.

### Fixed

- **Zip Slip in batch image downloads (real vulnerability).**
  `components/image/ImageBatchList.tsx`'s "Download all as .zip" wrote
  entries using `entry.outputFilename` — derived from the dropped `File`'s
  own `.name` — directly as the JSZip entry name/path, with no
  sanitization. A file named e.g. `../../evil.jpg` would produce a zip
  entry that writes outside the intended folder when extracted with a
  naive/older unzip tool ("Zip Slip"). This affected every batch-capable
  image tool (12 tools: all format conversions, resize/compress/rotate/flip,
  remove-metadata). **Fixed** by routing every entry name through the
  existing `sanitizeFilename()` (already used for the single-file download
  path) plus a small collision-disambiguation step, since stripping paths
  makes different malicious inputs more likely to collide on the same
  basename than before. Verified with a component test that inspects the
  real generated zip's entry names (`tests/component/ImageBatchList.test.tsx`)
  and an end-to-end test that downloads a real zip in a real browser and
  reads it back (`tests/e2e/privacy-audit.spec.ts`).

### Verified clean (no changes needed)

- Zero `fetch`/`XMLHttpRequest`/`FormData`/`axios`/`sendBeacon`/`WebSocket`/
  `EventSource` calls anywhere outside the documented tile-fetch and
  self-hosted-asset paths.
- `src/app/api/` is empty; no `middleware.ts` exists.
- No `localStorage`/`sessionStorage`/`indexedDB`/cookies/OPFS usage
  anywhere in application code.
- No `console.log`/`console.error`/`console.warn` calls anywhere in the
  app (only one intentional `console.debug` in the inert analytics
  provider, dev-only, logging only event names and tool slugs).
- The only `dangerouslySetInnerHTML` in the codebase is
  `components/seo/StructuredData.tsx`, which only ever serializes JSON-LD
  we generate ourselves from registry data — confirmed via grep across the
  whole tree that no other usage exists.
- SVG handling: script-carrying and external-resource-referencing SVG
  payloads were tested against the real `svg-to-png` tool in a real
  browser — no script execution, no network request
  (`tests/e2e/image-tools.spec.ts`).
- XXE: DOMParser-based XML/KML/GPX parsing across the Spreadsheet and
  Geospatial engines does not resolve external entities or a
  billion-laughs expansion; re-verified with a fresh XXE payload against
  the XML Validator (`tests/e2e/privacy-audit.spec.ts`) in addition to the
  existing per-engine XXE test suites.
- EXIF/GPS: confirmed with a newly generated real GPS-tagged JPEG fixture
  (`tests/fixtures/image/gps-tagged.jpg`, `scripts/generate-image-fixtures.py`)
  that coordinates are correctly displayed and never transmitted.
- Malformed/adversarial input across every engine (malformed PDF, malformed
  JPEG/SVG, encrypted PDF, malformed JSON, malformed GeoJSON/KML/GPX) never
  triggers a network request, even on the failure path
  (`tests/e2e/privacy-audit.spec.ts`).
- All third-party dependencies individually checked for telemetry/analytics
  code and hardcoded network endpoints (§5) — none found.
- `relatedTools`/registry integrity (a prior audit's regression tests)
  confirms every tool page still resolves to real, working functionality —
  no placeholder tools exist that could misrepresent what actually runs.

No functionality was removed or weakened by this audit — the one code
change (filename sanitization in batch zip downloads) only removes an
unsafe path, with no user-visible behavior change for any legitimately
named file.

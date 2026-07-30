# FileBrix — Universal Local File Toolbox

Read `README.txt` first — it's the full product/architecture spec. This file
states the hard engineering rules that keep the codebase aligned with it.
Read `PRIVACY_ARCHITECTURE.md` for the verified, technical explanation of
*why* the "files never leave your device" claim holds — what network
requests exist, what third-party libraries can and can't do, and known
limitations. Update it if you add a new network-capable dependency or
change how a filename/file becomes an output.

## Non-negotiable rules

1. **Files never leave the browser.** No API route may accept file uploads
   or file bodies. `src/app/api` must stay empty of file-handling endpoints.
   All file I/O goes through `FileReader`/`Blob`/`ArrayBuffer`/`Worker` —
   never `fetch()`/XHR with file content as the payload.
2. **No AI/LLM usage.** Every tool is deterministic.
3. **Engines, not per-tool duplication.** New conversions are added via
   `src/registry/tools/*.ts` (one file per tool, a `ToolDefinition` pointing
   at a shared engine's `ToolProcessor`), not bespoke logic per tool. See
   `src/engines/*` and `src/registry/types.ts`.
4. **Heavy libraries are lazy-loaded inside engine modules only**
   (`src/engines/<engine>/index.ts` and, where the engine needs one it
   manages itself, `worker.ts`), imported via dynamic `import()` triggered on
   first file drop — never at module top level. Never import an
   engine-specific library (SheetJS, pdf-lib, duckdb-wasm, MapLibre, Turf, …)
   from shared UI or a page's top-level scope.
   - Some libraries (DuckDB-WASM, pdf.js) already manage their own Worker and
     message protocol internally. For those, `engines/<engine>/index.ts` (or,
     for pdf.js, `engines/pdf/render/pdfjsClient.ts`) talks to the library
     directly — don't also wrap it in `engines/shared/workerClient.ts`
     (that's for engines whose worker.ts we write ourselves). See
     `src/engines/parquet/index.ts`.
   - **An engine can legitimately split across both models at once** — see
     `src/engines/pdf/`. `structural/*.ts` (pdf-lib: merge/split/rotate/
     extract/delete/reorder/metadata/images→PDF) has no DOM dependency, so it
     runs in a real Comlink `worker.ts` we wrote, same as the Spreadsheet
     engine. `render/*.ts` (pdf.js: thumbnails, PDF→Images, PDF→TXT text
     extraction) needs `document`/`canvas`, so it's main-thread-only and
     talks to pdf.js's own internal worker directly, same as DuckDB. Don't
     force one execution model onto both halves just because they live in
     the same engine folder — split by what each library actually needs, the
     same principle already applied to XML staying main-thread while CSV/
     XLSX use the worker.
   - If an engine needs prebuilt binary/worker assets (e.g. DuckDB-WASM's
     `.wasm`/`.worker.js`), self-host them under `public/<engine>/` via a
     `postinstall` script (see `scripts/copy-duckdb-assets.mjs`) rather than
     fetching from a third-party CDN at runtime — keeps `connect-src 'self'`
     in `next.config.ts` intact and avoids a third-party runtime dependency.
   - Watch for an engine fetching *its own* sub-resources at query/runtime
     beyond the main bundle — DuckDB-WASM autoloads its `parquet` reader as
     a separate signed extension from `extensions.duckdb.org` the first time
     `read_parquet()` runs, invisible until you actually query. Our CSP
     correctly blocked it, but DuckDB's failure mode wasn't a clean network
     error — it was a low-level `RuntimeError: function signature mismatch`
     inside the wasm module, which cost real debugging time to trace back
     to a blocked request. Since that binary isn't reproducible from
     `node_modules` (only via `scripts/fetch-duckdb-extensions.mjs`, a
     one-time CDN fetch), it's committed under `public/duckdb-ext-files/`
     rather than gitignored, and `next.config.ts`'s `rewrites()` maps any
     version DuckDB asks for to our copy — so upgrading `@duckdb/duckdb-wasm`
     can't silently break this again. If a future engine does something
     similar, check its Network tab under our CSP before assuming a cryptic
     runtime error is an integration bug.
   - **`DOMParser`/`XMLSerializer` do not exist inside Web Workers** (no
     `window`/DOM there at all — confirmed, not assumed). Any XML-touching
     engine code is main-thread-only for that reason; don't try to route it
     through `engines/shared/workerClient.ts`. See `src/engines/spreadsheet/format/xml.ts`,
     `convert/jsonXml.ts`, `xmlTable.ts` — none of them touch the worker.
   - **`node_modules/pdfjs-dist` ships several prebuilt asset directories,
     not just the worker script** — `cmaps/`, `standard_fonts/`, `wasm/`
     (image codecs), `iccs/` (color profiles), all consumed via
     `getDocument()`'s `cMapUrl`/`standardFontDataUrl`/`wasmUrl`/`iccUrl`
     options. Missing any of these doesn't hard-fail; pdf.js silently
     degrades (wrong glyphs, undecoded images) for the PDFs that happen to
     need them, which is worse than a clean error and easy to miss without
     testing a PDF that exercises that path. `scripts/copy-pdfjs-assets.mjs`
     self-hosts all four directories under `public/pdfjs/` alongside the
     worker — checked directly in the installed package, not assumed from
     pdf.js's own docs (which default to a jsDelivr CDN path this project
     never uses).
   - **`OffscreenCanvas` + `createImageBitmap` work fully inside a real,
     self-written Worker** — confirmed empirically (created an
     `OffscreenCanvas`, drew to it, called `convertToBlob()` inside a real
     `new Worker(...)`, got a non-empty image blob back) before building
     `engines/image/` around it. This is a *different* situation from
     pdf.js/DOMParser: nothing here needs `document`, so the entire
     decode→transform→encode pipeline runs in our own Comlink worker
     (`engines/image/worker.ts`), same shape as the Spreadsheet engine —
     it is not another "split across two models" engine like PDF.
   - **`createImageBitmap()` cannot decode an SVG `Blob` directly** in this
     project's target Chromium build (`"The source image could not be
     decoded"`, confirmed empirically) — only a real `<img>` element can,
     and `Image`/`HTMLImageElement` don't exist inside a Worker. This is
     why `engines/image/render/svgToPng.ts` is main-thread-only while the
     rest of the image engine runs in its worker — the one genuine
     "split by what the API needs" case in this engine, mirroring the
     XML/pdf.js precedent above.
   - **A browser's own image decoder auto-applies EXIF orientation on
     every decode path, unconditionally** — confirmed empirically with a
     real EXIF-orientation-6 JPEG fixture: `createImageBitmap()` with
     `imageOrientation: "none"`, `"from-image"`, no option at all, and a
     plain `<img>` element all produced identically-oriented pixels, not
     four different results as the spec's per-option semantics might
     suggest. **Practical effect: never write manual "read the orientation
     tag and rotate" logic** — every `engines/image/` tool's output is
     already correctly oriented for free. Canvas re-encoding
     (`toBlob`/`convertToBlob`) also strips all EXIF data from its output,
     separately confirmed by scanning re-encoded bytes for the `Exif\0\0`
     marker — which is why "Remove EXIF Metadata" needs no special code
     path beyond the same decode→encode round-trip every other image tool
     already does. Verified against this project's Chromium; Firefox/Safari
     are assumed spec-consistent but not verified, since e2e here is
     Chromium-only.
   - **`OffscreenCanvas`'s 2D context `filter` property (CSS filter syntax —
     `brightness()`/`contrast()`/`grayscale()`) works inside a real Worker**
     in this project's target Chromium — confirmed empirically (a throwaway
     Worker script composing all three into one filter string and sampling
     the output pixel) before relying on it for Image Studio's Brightness/
     Contrast/Grayscale Edit actions (`engines/image/pipeline.ts`). This is
     what let those three ops become new fields on the existing
     `ImageProcessOptions`/`processImage()` pipeline rather than a parallel
     pixel-manipulation path — no manual per-pixel `ImageData` math needed,
     matching the "one generic pipeline, additive options" shape the other
     five ops (crop/resize/rotate/flip/backgroundColor) already used.
   - **MapLibre GL's `map.setStyle()` can fire `"style.load"`
     *synchronously*, inside the `setStyle()` call itself** — not always on
     a later tick. Confirmed by reading maplibre-gl's own source
     (`node_modules/maplibre-gl/dist/maplibre-gl-dev.mjs`): when the new
     style can be applied as a diff against the current one rather than a
     full rebuild, `Style.setState()` fires the event immediately, before
     `setStyle()` returns. A version of `engines/geospatial/map/
     maplibreClient.ts`'s basemap-switching code that called
     `map.setStyle(...)` first and registered `map.once("style.load", ...)`
     afterward could lose that synchronous fire outright — verified with a
     `setInterval` poll showing `isStyleLoaded()` flip `true` within one
     tick of `setStyle()` while a listener registered just after it never
     fired — silently leaving the user's loaded GeoJSON never restored to
     the new style (real bug: PROJECT_LOG.md entry 25). Any code that needs
     to react to a `setStyle()` call finishing must register its
     `"style.load"` listener *before* calling `setStyle()`, not after —
     `waitForLayers(trigger)` in that file takes the actual `setStyle()`
     call as a callback invoked between listener registration and a
     synchronous `isStyleLoaded()` fallback check specifically to guarantee
     this ordering regardless of which internal path (sync diff vs. async
     full reload) a given style swap takes.
5. **New dependency checklist** — before adding a package, confirm it runs
   fully client-side, it's lazy-loaded if it's engine-specific/heavy, and
   there's a documented reason it's needed. Don't add state-management
   libraries, analytics SDKs, or AI SDKs — the existing abstractions below
   already cover that need.
6. **Analytics never carries file data.** `lib/analytics/events.ts` defines
   a closed set of event payloads that structurally exclude file contents,
   filenames, cell values, coordinates, or generated output. Extend the
   union there — don't bolt a loose `data: unknown` field onto an event.
7. **Sanitize before rendering user-controlled text.** Use
   `lib/security/sanitize.ts` (`sanitizeHtml`/`sanitizeText`) for anything
   derived from a file's contents before it touches the DOM; never
   `dangerouslySetInnerHTML` with raw user-derived content. The one
   sanctioned exception is `components/seo/StructuredData.tsx`, which only
   ever serializes JSON-LD we generated ourselves — never pipe raw file
   content through it.
   - **A `File`'s `.name` is untrusted input, not just display text** —
     it's fully attacker-controlled (scripted drag-and-drop/DataTransfer,
     not necessarily something a user typed in an OS dialog) and can
     contain path-traversal sequences. Every place a filename becomes a
     *download name* or a *ZIP entry name* must go through
     `lib/security/filenames.ts`'s `sanitizeFilename()` first —
     `DownloadResult.tsx` and `ImageBatchList.tsx`'s single-file path
     already did; a 2026 privacy audit found and fixed the one path that
     didn't (`ImageBatchList`'s "download all as .zip", which passed a raw
     derived filename straight to `JSZip#file()` — a Zip Slip
     vulnerability). PDF batch zips sidestep this by never deriving entry
     names from user input at all (`page-1.png`, `split-part-1.pdf`, …) —
     prefer that when a self-generated name is just as usable.
8. **Registry is the single source of truth.** The conversion matrix
   (`registry/matrix.ts`), sitemap, category pages and related-tools links
   are all derived from `registry/index.ts#tools` — don't hand-maintain a
   parallel list anywhere.
9. **The Universal File Drop hands the dropped `File` off to whichever tool
   the user clicks — never make them re-select it.** `lib/fileHandoff.ts` is
   a plain module-scoped variable (`setPendingFile`/`takePendingFile`), not
   localStorage/sessionStorage/a server session: Next.js's `<Link>` performs
   a client-side route transition that keeps the JS module registry alive,
   so the file (a live `File` reference, never serialized) survives the
   navigation; a hard reload or a new tab gets a fresh module and `null`
   back, which every consumer already treats as "nothing to claim" — the
   safe, expected fallback, not a special case to handle. Read/write is
   single-use (`takePendingFile` clears on read) and slug-scoped (a file
   addressed to `csv-viewer` is never handed to a different tool), with a
   60s expiry as defense-in-depth against a click that never lands. Every
   `FileDropZone` and `TextTransformTool` instance takes an optional
   `toolSlug` prop that auto-claims a matching pending file on mount — this
   is why adding a new file-based tool only costs one extra prop (its own
   registry slug, or one computed from whatever prop already determines
   which tool it is, e.g. `` `${sourceFormat}-to-${targetFormat}` `` for
   `ImageConvertTool`), not a bespoke handoff implementation per tool. The
   two bespoke (non-`FileDropZone`) file-opening tools, `SqlFormatterTool`
   and the geo/CSV components with their own drop zones, follow the same
   pattern by hand. `UniversalFileDrop.tsx` (homepage) is the only writer
   (`setPendingFile` on a result link's `onClick`, right before the
   navigation `<Link>` itself proceeds) — it groups whatever
   `getToolsAcceptingFormat()` actually returns into VIEW/CONVERT/EDIT/TOOLS
   sections (`lib/detect/categorizeActions.ts`, keyed off each tool's own
   `category`), so it can never advertise a tool that doesn't really exist.
   An unrecognized file gets "We don't have a tool for this file type yet.",
   plus a small curated `GENERIC_TEXT_TOOL_SLUGS` suggestion list — but only
   when the file also decodes as plain text (`tryDecodeAsText`, exported
   from `lib/detect/detectFile.ts` for exactly this) — never for
   unidentified binary data.
10. **Product layer and implementation layer are two different vocabularies
    — never mix them in UI copy or in documentation aimed at users/
    contributors deciding what to build.**
    - **Product layer** (what a user thinks in terms of): **Applications**
      — the five user-facing products, each with its own consistent name:
      **Data Studio**, **PDF Studio**, **Image Studio**, **Geospatial
      Studio**, **Developer Toolkit** (`registry/categories.ts#CATEGORIES`
      is the single source for every one of these display names — every
      page title, nav link, breadcrumb, and piece of metadata reads
      `category.name` from there rather than hand-writing the string) —
      and **Tools**, the individual features/pages within or around them
      (e.g. "CSV to Excel," "Merge PDF," "Resize Image"). Four of the five
      Applications (everything but Developer Toolkit) are unified
      multi-tab apps (`SpreadsheetDataApp`, `PdfStudioApp`, `ImageStudioApp`,
      `GeospatialStudioApp`, each riding on the shared `components/
      app-shell/AppShell.tsx` layout primitive) that also expose every
      constituent Tool at its own stable, individually-indexed URL — the
      Application is a superset UI, not a replacement for the Tool's own
      page. Developer Toolkit is deliberately *not* a Studio: it stays a
      categorized collection of independent Tools (see its own page's
      code comment for why), which is itself product-layer information a
      user-facing label should reflect, not paper over.
    - **Implementation layer** (what a contributor thinks in terms of):
      **Engines** (`src/engines/*` — the processing/conversion logic),
      **Registry** (`src/registry/*` — the `ToolDefinition` data every
      page/nav/sitemap/matrix derives from), and **Components**
      (`src/components/*` — the shared UI building blocks, including the
      four Studio app components and `AppShell`). These names are for code,
      folder structure, and contributor-facing docs (this file,
      `PROJECT_LOG.md`, code comments) — never for a user-visible string.
    - **The word "Engine" must never appear in rendered UI text, an SEO
      title/description, FAQ copy, or any other user-facing string** — it
      names an implementation detail (which library/worker backs a Tool),
      not something a user needs to know exists. It's fine (expected) in
      import paths, type names (`Engine`, `EngineWorkerHandle`), folder
      names, and code comments — that's exactly the implementation-layer
      audience it's for.
    - A Tool's own `ToolDefinition.engine` field, and the `Engine` type
      itself, are implementation-layer plumbing (which processing engine
      backs this Tool) — never surface that value in UI; a Tool's
      user-visible category association is `CATEGORIES.find(c => c.engine
      === tool.engine).name` (an Application name), not the engine id.
    - Category **slugs** (`/data-studio`, `/pdf-tools`, `/image-tools`,
      `/geospatial-tools`, `/developer-tools`) are frozen for backward
      compatibility even where they no longer match the current display
      name (`pdf-tools` → "PDF Studio," etc.) — rename `CategoryDefinition
      .name`, never `.slug`, and add a permanent redirect in
      `next.config.ts#redirects()` if a route itself ever needs to move
      (see the `/spreadsheet-tools`→`/data-studio` and `/data-tools`→
      `/data-studio` entries there for the pattern).

## Adding a tool

1. Create `src/registry/tools/<slug>.ts` exporting a `ToolDefinition` (see
   `src/registry/types.ts`). `createProcessor` is optional — only conversion
   tools have one; viewers query their engine directly instead (see
   `parquet-viewer.ts`).
2. Import it into the `tools` array in `src/registry/index.ts`.
3. If its engine doesn't exist yet under `src/engines/`, add it (see rule 4
   above for the worker-ownership split), and install only the dependency
   that engine actually needs.
4. Add a page under the matching route group, e.g.
   `app/tools/parquet-viewer/page.tsx` — one static folder per tool (with a
   colocated client component for the interactive part), not a generic
   `[slug]` route. Wrap it in `components/tool-page/ToolPageLayout.tsx`.
5. If the tool takes a single file, pass its registry slug as `toolSlug` to
   its `FileDropZone` (or `TextTransformTool`) so the homepage's Universal
   File Drop can hand a file straight to it (rule 9) — skip this only for
   paste-first utility tools that never accept a file at all (e.g. UUID
   Generator, Coordinate Converter).
6. Give it a capability so it's reachable from an index page, not only from
   its own URL: a Studio tool needs `appEntry.mode` (if its page renders the
   Studio app) or `capability` (if it doesn't) — never both; a Developer
   Toolkit tool needs `devCategory`. `tests/unit/registryIntegrity.test.ts`
   fails if a tool is left unreachable, or if a capability that now has
   tools is still missing its `indexDescription` in `registry/studios.ts`.

Don't add a tool to the registry without a working page behind it — no
placeholder tools (README.txt §53).

**When several tools share one engine** (e.g. the 6 spreadsheet tools),
don't write 6 bespoke interactive components — build one or two shared,
parameterized ones (e.g. `components/spreadsheet/SpreadsheetViewerTool.tsx`,
`SpreadsheetConverterTool.tsx`) that each tool page renders with different
props. They import only the engine's public API, never its heavy libraries
directly, so this doesn't violate the lazy-load rule.

**`ProcessingError` across a real Comlink worker boundary needs the
serialize/reconstruct dance.** DuckDB-WASM never exercised this (it owns
its own worker protocol, errors are caught main-thread-side), but any
engine using `engines/shared/workerClient.ts` for real (worker.ts we wrote
ourselves) will have thrown `ProcessingError`s arrive as plain `Error`s on
the other side of `postMessage` — structured clone doesn't preserve custom
classes. Catch `ProcessingError` in worker.ts and re-throw `.toJSON()`;
reconstruct with `ProcessingError.fromSerialized()` in index.ts's catch
block. See `engines/spreadsheet/worker.ts` + `index.ts`.

**An engine's `index.ts` never spawns or caches its own worker — it calls
`createLazyEngineWorker(spawn, { timeoutMs })`** (`engines/shared/
workerClient.ts`), which owns the lazy `new Worker(...)`, the cached handle,
and a per-call RPC timeout. That timeout is not optional politeness: a
worker the browser kills for OOM throws nothing catchable, it just stops
answering, and a Comlink call to it never settles — which used to leave the
UI on "Processing…" forever (PROJECT_LOG.md entry 32, PRIVACY_ARCHITECTURE
.md §6). On expiry the worker is terminated and dropped so the *next* call
gets a fresh one; keeping a dead worker would turn one stuck operation into
a broken tool for the rest of the session.
- **Timeout values are measured, not guessed.** The default (120s) and the
  Spreadsheet engine's override (600s) each cite real numbers in a comment
  next to them. If a new engine's heaviest realistic operation is nowhere
  near the default, don't add an override; if it might be, measure it in a
  real browser first. A ceiling that fires on a legitimate large file is
  worse than the stuck spinner it replaces.
- **A long call that reports progress must wire up `keepAlive`.** `call`'s
  second argument to `fn` restarts the timeout clock; a call that's still
  reporting is demonstrably alive. See `engines/pdf/index.ts`'s
  `buildPdfFromSelectionFiles`, which passes a proxied callback *whether or
  not* the caller asked for progress, precisely so the deadline extends.
- **Progress callbacks cross the boundary via `proxyCallback`** (Comlink,
  re-exported from `workerClient.ts` so engines never import Comlink
  directly) and **must be released worker-side with
  `releaseProxiedCallback(cb)` in a `finally`** — Comlink opens a
  MessagePort per proxied argument, and an unreleased one leaks for the
  worker's lifetime.

**Not every tool is drop-a-file-first.** Formatters/converters that operate
on pasted text (JSON/XML/YAML) use `components/text-tools/TextTransformTool.tsx`
(textarea-first, with a compact "Open file" button as the secondary
affordance) instead of `FileDropZone`. Its `transform` prop can throw
`ProcessingError` — that's the only error path, surfaced automatically via
`ErrorPanel`. Output is always rendered as `<textarea readOnly>` text, never
`dangerouslySetInnerHTML` — that's what makes "no unsafe HTML rendering" true
by construction rather than by convention.

**XML parsing/serialization uses native `DOMParser`/`XMLSerializer`, not a
third-party library.** Browsers' DOMParser doesn't fetch external resources
or resolve external entities/DTDs — this is what makes it XXE-resistant
without any extra hardening code, and it's a smaller trust surface than
adding an XML parsing dependency. Verify this kind of security property
with a real payload in a test (see `tests/unit/textFormatXml.test.ts`'s
"XML security" block and the e2e equivalent) rather than asserting it from
memory — jsdom's DOMParser turned out to behave safely too, but that was
checked, not assumed, before relying on it for unit tests.

**jsdom has no `canvas` 2D context without the native `canvas` npm
package** (`canvas.getContext("2d")` returns `null` — confirmed with a
throwaway script, not assumed). This project deliberately doesn't add that
package (a native addon) just for tests, so any code that renders to a
canvas — `engines/pdf/render/thumbnail.ts`, `rasterize.ts` (both pdf.js) —
is e2e-only tested, in a real browser. Pure parsing work that happens to
live alongside it (`extractText.ts`, and everything in `engines/pdf/
structural/*.ts`, which is pdf-lib and has no DOM dependency at all) is
still unit-tested directly with real fixtures — don't let one DOM-dependent
function push an entire module to e2e-only if the rest of it doesn't need
a DOM at all.

**Two PDF metadata facts that are easy to get wrong, both confirmed
empirically:**
- **Deleting a dictionary entry does not remove the object it points at.**
  `doc.catalog.delete(PDFName.of("Metadata"))` returns `true` and the XMP
  stream still appears verbatim in the saved bytes, because it's a separate
  indirect object that `save()` keeps serializing. `PDFContext.delete(ref)`
  is also needed. Any future "remove X from a PDF" work should assert
  against **output bytes**, not a re-parsed document — a parser-level check
  reports success while the data is still in the file.
- **pdf-lib rewrites the Info dictionary at *load* time, not save time.**
  Its constructor calls `updateInfoDict()`, setting `Producer`/`Creator` to
  its own name and `ModDate` to *now*. This made the Metadata Viewer report
  today's date as every document's modification date until
  `loadPdfDocument()` gained a `preserveMetadata` option (pdf-lib's public
  `updateMetadata: false`). Any read-only or metadata-stripping path must
  pass it; write paths deliberately don't, since a producer stamp there is
  conventional.

**Digitally signed PDFs are warned about, never rejected** — deliberately
unlike encryption. `hasDigitalSignature()` in `structural/load.ts` (the same
choke point) walks the AcroForm field tree for `/FT /Sig`, and the flag rides
out on `PdfDocumentInfo`/`PdfMetadataInfo` so the UI can show
`PdfSignatureWarning` before the user commits. A signed PDF stays fully
processable; only the signature is lost, which is the user's call to make.
Don't convert this into a hard error, and don't let it soften the encrypted
rejection sitting next to it.

**Encrypted/password-protected PDFs are treated as uniformly unsupported**,
not partially supported per-tool. `engines/pdf/structural/load.ts`'s
`loadPdfDocument()` is the single choke point every structural operation
goes through, and it raises a clear `ProcessingError` for any encrypted
PDF before any tool-specific logic runs. This isn't a workaround-in-waiting
— pdf-lib has no real decryption path (`ignoreEncryption` loads structure
only; content stays unusable), and every one of the 11 PDF tools ultimately
needs pdf-lib to produce output, so there's no tool where partial support
would actually work. Never attempt to bypass or crack the password.

**SVG is treated as untrusted, potentially script-carrying content — never
injected into the live DOM.** `lib/security/sanitize.ts`'s `sanitizeSvg()`
runs DOMPurify with its dedicated `USE_PROFILES: { svg: true, svgFilters:
true }` mode (the default HTML profile doesn't recognize SVG-only
elements as safe, so it's the wrong config here) before the sanitized
markup is ever handed to a decoder. This is defense in depth, not the only
guard: loading SVG via a real `<img>` element (see the `createImageBitmap`
note above) inherently never executes embedded `<script>` tags regardless
of sanitization, confirmed with a real script-carrying SVG payload in both
a component test and a real-Chromium e2e test — verify this kind of claim
with an actual payload, the same discipline already applied to XXE.

**Playwright role-query text matching is substring-based, case-insensitive,
by default — a repeat gotcha across every e2e round so far.** `getByRole
("button", { name: "Convert" })` also matches an unrelated element whose
*entire* accessible name merely contains "Convert" as a substring — e.g. a
`FileDropZone`'s hint text ("...every image is **convert**ed entirely on
your device.") made a "Convert" query match the drop-zone div, not the
actual submit button; "Download" similarly matched a "Download all N as
.zip" button that also happens to contain the word "Download". Always pass
`{ exact: true }` for any button label that could be a substring of other
on-page text, rather than assuming a short/unique-sounding label is safe.

## Commit messages

Commit subjects reference the `PROJECT_LOG.md` entry they implement:
`log 34: short summary`, where the number is that entry's `## 34.` heading,
added or extended in the same commit. One entry may span several commits —
they all carry its number, so `git log --grep "log 34:"` recovers the round.
Work with no log entry (dependency bumps, typos, repo/tooling setup) uses
`chore: short summary` instead. Never reuse a number for unrelated work; the
next entry is the next unused integer.

## Commands

- `npm run dev` / `npm run build` / `npm run lint`
- `npm run test` — Vitest unit + component tests
- `npm run test:e2e` — Playwright end-to-end tests
- `node scripts/check-bundle-budget.mjs` — performance budget gate; needs a
  production build first. Fails if the JS every route loads crosses its
  ceiling, or if an engine library escapes its dynamic-import boundary
  (rule 4). Add `--report` to measure without gating — that's how you get
  the numbers to justify raising a budget.
- `npx lhci autorun` — Lighthouse against the homepage, a Studio page and a
  tool page. Needs a production build. SEO/best-practices/accessibility
  block; `performance` only warns (see `lighthouserc.json` for why).

**CI runs the whole chain above on every push and PR**
(`.github/workflows/ci.yml`) in the documented order, so a green local run
and a green CI run mean the same thing. Two CI-only deviations, both passed
as CLI flags rather than committed to config so local behavior is untouched:
Playwright runs `--workers=2` (see `playwright.config.ts`'s comment — the
local `workers: 1` is a hardware constraint and must stay 1), with
`--reporter=list,html --trace=on-first-retry --retries=1` for failure
artifacts.

**`NEXT_PUBLIC_SITE_URL` must be set before a production `npm run build`.**
It's baked in at build time into every canonical URL, OpenGraph/Twitter URL,
`sitemap.xml` entry and `robots.txt` `Sitemap:` line (`lib/seo/metadata.ts`).
Left unset, it silently falls back to `http://localhost:3000` — confirmed by
building and curling the output, not assumed — which would ship real pages
with canonical tags and a sitemap pointing at localhost. See `.env.example`.

**Always run the full verification suite after a non-trivial change, not just
a subset** — every "unify N existing tools into one Studio app" pass so far
(Data Studio, PDF Studio, Image Studio, Geospatial Studio) has caught at
least one real regression only a full run surfaced (a stale category lookup
crashing the build, an e2e test asserting the old DOM shape, a lint rule on
a moved effect — Image Studio's own instance: the Viewer's compare-toggle
state adjustment needed React's render-time "adjusting state when a prop
changes" pattern, not a `useEffect`, to satisfy the
`react-hooks/set-state-in-effect` lint rule, and a first attempt at that
pattern still missed the case where the component mounts *after* the prop
was already set — only the new e2e test caught it, not lint or types.
Geospatial Studio's own instance: `lib/detect/detectFile.ts`'s
`detectFileType()` only sniffs a file's first 512 bytes, so a GeoJSON file
longer than that silently misdetects as generic `"json"` instead of
`"geojson"` — a real, previously-latent bug that had simply never been
exercised before, since every earlier caller always called
`parseGeoJsonFile()` unconditionally rather than branching on the detected
format; only the new Analyze/View e2e tests surfaced it, not `tsc` or
lint). In order:
1. `npx tsc --noEmit`
2. `npm run lint`
3. `npm run test` (Vitest)
4. `rm -rf .next && NEXT_PUBLIC_SITE_URL=https://example.com npm run build` —
   the clean `.next` wipe matters: a stale `.next/dev/types/*` typed-route
   file can reference a page you just deleted and fail the build on a route
   that no longer exists, not on anything actually wrong.
5. `npx playwright test` — **against a build with `NEXT_PUBLIC_SITE_URL`
   *unset*, not the step-4 build.** `playwright.config.ts` has
   `reuseExistingServer`, so leaving step 4's `https://example.com` server
   running on :3000 makes Playwright reuse it, and the three tests that
   compare `sitemap.xml`/canonical URLs against its own `baseURL`
   (`seo.spec.ts`, `seo-architecture.spec.ts`) fail with a confusing
   host mismatch that looks like a routing regression. Stop that server (or
   rebuild plainly) first — the suite's own `webServer` command deliberately
   builds without the variable so the localhost fallback is what's tested.
   Run the full suite, not just the spec file you'd expect to be affected — `pdf-tools.spec.ts` staying green after the PDF Studio
   rewrite was the signal the shell-wrapping approach hadn't broken anything
   underneath it, and that's only trustworthy if the whole suite ran).
6. For any genuinely new engine-level behavior (a new DuckDB write path, a
   new conversion pipeline, ...), verify it in a real browser — a throwaway
   Playwright script in the scratchpad is fine — before considering it done.
   Passing unit tests don't prove a DB round-trip or a UI flow actually
   works end to end; this project's own history (the Parquet writer's
   missing `SET custom_extension_repository` on a second connection) is why.

## Current status

Foundation, plus five engines and 78 tools: registry, worker infra, file
detection, SEO/analytics/security/error abstractions, shared UI components,
homepage + 5 category pages (Data Studio, PDF Studio, Image Studio,
Geospatial Studio, Developer Toolkit — PDF/Image/Geospatial renamed from
"PDF/Image/Geospatial Tools" to reflect that these engines are complete,
unified multi-tab applications rather than plain tool lists, matching Data
Studio's naming (Data Studio's own name was already unchanged). Developer
Toolkit (renamed from "Developer Tools") is
deliberately *not* called "Studio": that engine stays a collection of 25
independent utilities, not one unified tabbed workspace — instead, once a
flat 20-tool list stopped scaling, it was split into sub-category pages
(`/developer-tools/{text,encoding,sql,utilities}` —
`registry/devCategories.ts`, each tool's own `devCategory` field on its
`ToolDefinition` says which one), reached from `/developer-tools`'s new
category-card landing page (`DevCategoryCard`/`DevCategoryIcon`,
`components/developer-toolkit/`) instead of one long filterable list. A 5th
sub-category, "JSON" (structured-data-format formatting, validation and
conversion — JSON/XML/YAML), lived here originally but was later retired:
those 9 tools (json-formatter, json-minifier, xml-formatter, json-validator,
xml-validator, json-to-xml, xml-to-json, json-to-yaml, yaml-to-json) moved
to Data Studio, whose `engines/spreadsheet/` implementation already powered
every one of them — see PROJECT_LOG.md "Data Studio absorbs JSON/XML/YAML
tooling." JSON Diff, the one `devCategory: "json"` tool whose logic has
nothing to do with the Spreadsheet engine, stayed in Developer Toolkit and
moved into the Text bucket instead, pairing it with Text Diff, the tool it
already shares a component with. Text grew from 1 tool (Text Diff) to 11 in
a follow-up pass adding Word/Character/Line Counter, Remove Empty/Duplicate
Lines, Sort Lines, Reverse Lines, Trim Whitespace, Normalize Line Endings,
and Case Converter — see the Developer & Text Utility engine entry below
for how they share components rather than each rolling its own UI; JSON
Diff joining it later brought Text to its current 12. Encoding grew
from 4 tools (Base64 Encode/Decode, URL Encode/Decode) to 8 in a second
follow-up pass adding HTML Encode/Decode and Unicode Escape/Unescape — two
new engine modules (`engines/developer/htmlEntities.ts`,
`engines/developer/unicodeEscape.ts`), deliberately *not* reusing
`engines/geospatial/xml/parseXml.ts`'s existing `escapeXmlText`/
`escapeXmlAttr` (which cover the same 5 predefined characters) since that
would cross an engine boundary for a different concern — mirrors the
existing precedent that each engine's XML/entity handling stays
independently duplicated rather than sharing across engines (the one
documented exception being `geoJsonToCsv` reusing the Spreadsheet engine's
tiny `serializeCsv()`). All 4 new tools reuse the pre-existing
`TextTransformTool` unchanged, same as most of the Text additions above —
no new UI component needed since none of them require an extra option
control. This whole Developer Toolkit change and the four Studio
renames are both display/navigation-only: no tool's own route moved, and
category *slugs* (`/pdf-tools`, `/image-tools`, `/geospatial-tools`,
`/developer-tools`) are unchanged — only each `CategoryDefinition.name` in
`registry/categories.ts` changed, which is the single source every page
title/heading/breadcrumb/nav/OG-tag derives from, so no redirects were
needed, unlike the Data Tools retirement below. The former separate "Data
Tools" category was retired once Data Studio covered Parquet directly;
`/data-tools` permanently
redirects to `/data-studio`, same treatment as `/spreadsheet-tools` before
it); **Parquet Viewer** (`/tools/parquet-viewer`,
DuckDB-WASM); the **Spreadsheet & Structured Data engine** (Papa Parse +
SheetJS + native DOMParser/XMLSerializer + js-yaml) powering `csv-viewer`,
`excel-viewer`, `csv-to-excel`, `excel-to-csv`, `csv-to-json`, `json-to-csv`,
`csv-to-xml`, `xml-to-csv`, `json-formatter`, `json-minifier`,
`xml-formatter`, `xml-validator`, `json-validator`, `json-to-xml`,
`xml-to-json`, `json-to-yaml`, and `yaml-to-json`; the **PDF engine** (`src/engines/pdf/`
— pdf-lib in a Comlink worker for structural edits, pdf.js main-thread for
rendering/text-extraction) powering `merge`, `split`, `rotate`,
`extract-pages`, `delete-pages`, `reorder-pages`, `metadata-viewer`,
`remove-metadata` (all under `/pdf/*`), and `images-to-pdf`, `pdf-to-images`,
`pdf-to-txt` (under `/convert/*`). Five of those eight `/pdf/*` tools share
one component, `components/pdf/PdfPageWorkspaceTool.tsx`, parameterized by a
`mode` prop — merge/extract/delete/reorder/rotate are all built on the same
underlying primitive, `buildPdfFromSelection()` (an ordered list of `{
sourceIndex, pageIndex, rotationDelta }` references copied into a new PDF);
Split calls that same primitive once per chosen page range and zips the
results with `jszip`. PDF page thumbnails lazy-render via
`components/pdf/PdfThumbnail.tsx` (`IntersectionObserver`, low-res only) to
keep large PDFs responsive; and the **Image engine** (`src/engines/image/`
— native Canvas/`OffscreenCanvas`/`createImageBitmap` in a Comlink worker
for the whole decode→transform→encode pipeline, no third-party image
library at all) powering `png-to-jpg`, `jpg-to-png`, `webp-to-jpg`,
`jpg-to-webp`, `png-to-webp`, `webp-to-png`, `svg-to-png` (under
`/convert/*`), and `resize-image`, `compress-image`, `rotate-image`,
`flip-image`, `remove-image-metadata`, `image-metadata-viewer` (under
`/tools/*`). SVG→PNG and EXIF reading (via the one new dependency,
`exifr`, zero runtime deps of its own) are the two main-thread exceptions,
for different reasons (SVG needs a real `<img>` element; EXIF is a pure
byte-parse with no benefit from a worker hop). Batch processing (drop N
images, get individual downloads plus a combined `.zip` via `jszip`) is
shared across all format-conversion and edit tools through one component,
`components/image/ImageBatchList.tsx`. All 13 of those tools are unified
into **Image Studio** (`components/image/ImageStudioApp.tsx`, live at
`/image-tools` and every individual tool's own URL) with View/Edit/Convert/
Metadata tabs, following the same shell pattern as Data/PDF Studio. The
Metadata tab hosts a View/Remove `ActionPicker` (`ImageMetadataTool`'s
`mode: "view" | "remove"` prop, same shape as `PdfMetadataTool`) — "Remove
Metadata" originally lived as one of ten options in the Edit tab's picker
instead, a 2026 Studio UX review (PROJECT_LOG.md) moved it here to match
PDF Studio's own Metadata tab, since metadata concerns don't belong mixed
in among Edit's pixel-level transforms (resize/crop/rotate/...). Unlike
those two, this unification needed genuinely new engine capability, not
just UI consolidation: Crop, Brightness, Contrast and Grayscale didn't
exist before Image Studio. Crop/Brightness/Contrast/Grayscale are additive
fields on the existing `ImageProcessOptions`/`processImage()` pipeline
(`engines/image/pipeline.ts`) — decode → crop → rotate/flip → resize →
color-adjust → encode — not a parallel pipeline; Brightness/Contrast/
Grayscale reuse `ImageTransformTool.tsx` (widened, not forked) since they're
the same "numeric input, snapshot on click, run through `ImageBatchList`"
shape as resize/compress/rotate/flip, while Crop got its own component
(`ImageCropTool.tsx`) since it's the one Edit action that needs an
interactive crop-rectangle overlay before it has anything to process. The
View tab (`ImageViewerTool.tsx`) is genuinely new UI with no prior art
anywhere in the codebase — zoom via CSS `transform: scale()` in an
`overflow-auto` container (no custom pan code needed), plus an
original-vs-edited compare pane fed by an `editedResult` state lifted into
`ImageStudioApp` from the Edit tab's `onResult` callback (single-file edits
only). Watermark is a deliberate placeholder tab, mirroring PDF Studio's
Security tab, even though (unlike PDF's password-protection block) nothing
technical prevents building it now — the user's own "watermark placeholder"
wording asked for this scope explicitly. None of the 5 new/widened pieces
(crop, brightness, contrast, grayscale, the compare feature) have their own
registry entry or standalone URL — they're Image Studio-only, reachable
through `/image-tools`; and the **Geospatial engine**
(`src/engines/geospatial/`) powering `geojson-viewer`, `geojson-validator`,
`geojson-simplifier`, `kml-to-geojson`, `geojson-to-kml`, `gpx-viewer`,
`gpx-to-geojson`, `gpx-to-kml`, `geojson-to-csv`, `csv-to-geojson`, and
`coordinate-converter` (all under `/geo/*`). Like PDF, it's split across
both execution models: `ops/*.ts` (summarize/validate/repair/simplify/CSV
import-export, all pure JSON + `@turf/*`, no DOM dependency) runs in a
Comlink worker via `worker.ts`/`index.ts`, same shape as Spreadsheet/PDF-
structural; `xml/kml.ts` and `xml/gpx.ts` are main-thread-only (DOMParser +
`@tmcw/togeojson`, which takes a `Document` — never a string — and never
fetches anything itself, so KML/GPX parsing stays XXE-resistant the same
way the Spreadsheet engine's XML handling is), mirroring the PDF
structural/render split and the Spreadsheet XML precedent. `map/style.ts`
is a plain data module (a raster `StyleSpecification` pointing at CARTO's
free, no-API-key basemap tiles) with no runtime dependency on `maplibre-gl`
itself; `map/maplibreClient.ts` lazy-loads the actual `maplibre-gl` module
(like `pdfjsClient.ts` does for pdf.js — MapLibre manages its own internal
worker(s), so this talks to it directly rather than through
`workerClient.ts`). That internal worker's own script must be self-hosted
under `public/maplibre/` (`scripts/copy-maplibre-assets.mjs`, same
postinstall-copy pattern as DuckDB/pdf.js) and pointed at explicitly via
maplibre-gl's own `setWorkerUrl()` — **not** optional, confirmed by a real
bug: maplibre-gl computes its worker URL as `new URL("./maplibre-gl-
worker.mjs", import.meta.url)`, which assumes its own module is served
from the same directory as that worker script — true for the raw npm
package, false once Next.js/Turbopack bundles it into a hashed chunk URL
with no such sibling file. The failure is silent and easy to miss: no
thrown error, no failed network request (maplibre-gl's own `getWorkerUrl()`
short-circuits to `""` before ever attempting a fetch, since the bundled
chunk's `import.meta.url` doesn't match its own `/^https?:/` sanity check),
so a GeoJSON source's `_workerID` simply never gets set and it never
finishes loading — while the raster basemap (which doesn't need this
worker) renders completely normally, making the map look like it "works"
while a dropped file's actual features silently never appear. The self-
hosted worker script itself has its own further `import ... from
"./maplibre-gl-shared.mjs"` — resolved as a literal relative URL at
runtime, since the worker is loaded directly by the browser rather than
processed by Turbopack — so both files must be copied together or the
worker fails with the same kind of silently-aborted request one level
down. Regression-guarded in `tests/e2e/geo-tools.spec.ts` by actually
sampling the composited pixel color at a dropped polygon's fitted center
(a live WebGL canvas can't be read with plain `drawImage` — its drawing
buffer clears after compositing — so the test screenshots the canvas and
decodes that PNG instead, the same technique already used for the image
engine's own pixel-level e2e tests) — a bare ".maplibregl-canvas is
visible" assertion, used elsewhere in that file, passes regardless of
whether this worker ever loads, which is exactly why this went unnoticed
until real use surfaced it. `GeoMap.tsx`'s container div also carries an
explicit `relative` class of its own, defensively — MapLibre's own CSS
already sets `.maplibregl-map { position: relative }` on whatever container
element you pass it (needed so its `position: absolute` canvas positions
against that container instead of the viewport), but `Map.remove()`
unconditionally strips that exact class on teardown; in dev, React Strict
Mode's double-effect-invocation can run a stale, cancelled map instance's
teardown *after* the real surviving instance has already attached to the
same container, stripping the class the live map still depends on (its
canvas then renders at the page's top-left instead of inside its box, seen
directly in a real screenshot before this was understood). This never
happens in a production build, where Strict Mode doesn't double-invoke —
so `GeoMap.tsx`'s own `relative` class is what makes local `npm run dev`
correct, not something `npx playwright test` (which runs against a
production build) can regression-test.

The literal `{r}` retina-suffix segment noted above as a low-priority,
not-currently-broken oddity was removed once a later change needed to add
two more basemap variants to `map/style.ts` anyway — no reason to
triple-copy a token that was never doing anything.

**Map capabilities** (`map/style.ts` + `map/maplibreClient.ts` +
`components/geo/GeoMap.tsx`), added together in one pass: a basemap-style
picker (Light/Dark/Voyager — `BASEMAP_STYLES`, all three CARTO raster
variants under the one already-CSP-allowed tile host, so switching needs
no CSP change), MapLibre's own `FullscreenControl`, and click-to-highlight
between the feature list and the map.
- `GeoMapHandle.setBasemap(id)` calls `map.setStyle(...)`, which wipes
  every source/layer maplibre-gl doesn't own itself — `maplibreClient.ts`
  tracks the last `setUserData`/`setSelectedFeature` call in closure and
  replays both once the new style's `"load"` event fires, so switching
  basemaps doesn't drop the user's data or their current selection.
- Selection highlighting uses the GeoJSON source's `generateId: true`
  (sequential ids in feature-array order, assigned without mutating the
  GeoJSON we were handed) plus `map.setFeatureState`/a `["case", ["boolean",
  ["feature-state", "selected"], false], ...]` expression on every layer's
  paint — the idiomatic MapLibre way to highlight one feature, rather than
  re-filtering or re-adding layers per selection change. `GeoJsonViewerTool`
  drives it by index; `VirtualizedTable` gained matching `onRowClick`/
  `selectedRowIndex` props (both optional/additive — every other caller,
  including Data Studio's View mode, is unaffected) so clicking a row in
  the feature list highlights that feature on the map, and selecting it on
  the map-adjacent detail panel's "Clear selection" clears both directions
  at once, without a second, parallel virtualized-list implementation.
- The property table itself no longer caps at 5 features
  (`summary.propertyPreview`'s worker-computed preview, still used
  as-is for the Analyze-style stats block) — `GeoJsonViewerTool` now
  derives the *full* feature list directly from the already-in-memory
  parsed GeoJSON via `extractFeatureList`/`asRecord`
  (`engines/geospatial/ops/shape.ts`), imported directly rather than
  routed through the worker, since both are pure/DOM-free/no-heavy-
  dependency functions with nothing to offload. Large files stay
  responsive because `VirtualizedTable` (already used by Data Studio,
  proven against a 10,000-row case) was reused rather than a second,
  unvirtualized table being hand-rolled for this one tool. The table's
  leading column is always a geometry-type label (Point/Polygon/...),
  computed straight from each feature's own `geometry.type` rather than
  any property the file's author chose — a "name" field is free-text and
  can't be trusted to say what a feature actually *is* (a follow-up ask
  after a first look at the feature: rows named things like "asdf123" gave
  no way to tell a Point from a Polygon at a glance).
- The camera pans to a newly-selected feature (`map.easeTo({ center })`,
  zoom untouched) so a selection is actually visible when the dataset spans
  a wide area — deliberately not `fitBounds`/`flyTo`, which would also
  rezoom and could make browsing feel jumpy.
- `GeoMap.tsx`'s basemap `<select>` renders as a *sibling* of the div
  MapLibre mounts into, inside a shared `relative` wrapper — not as a
  React child of that div itself. MapLibre appends its own children
  (canvas, controls) into its container imperatively, outside React's
  tracking; giving that same node real React children too would mean two
  systems mutating one element's child list, a known source of React/
  imperative-library conflicts. The container's role changed from `"img"`
  to `"region"` accordingly — `role="img"` would hide the real interactive
  controls it now hosts (MapLibre's own zoom/compass/fullscreen buttons,
  plus the basemap picker) from assistive tech by presenting the whole
  subtree as one static image, which was accurate when the map was purely
  a rendered preview but stopped being true once it gained controls.

`components/geo/GeoMap.tsx` (which statically imports
`maplibre-gl/dist/maplibre-gl.css` — safe because the file itself is only
ever reached through the dynamic-import boundary below) is never imported
directly by a tool component; every one of them renders
`components/geo/LazyGeoMap.tsx` (`next/dynamic(..., { ssr: false })`)
instead, which is the single point where MapLibre (JS + CSS, together a
multi-hundred-KB dependency) enters a bundle — never for the KML/GPX
converters, validator, simplifier, or coordinate converter, which don't
render a map at all. README.txt §17's exception to "files never leave the
browser" is real here: `next.config.ts`'s CSP allows `connect-src`/`img-src`
to `*.basemaps.cartocdn.com` for tile images specifically (verified with a
network-interception e2e test that every off-origin request has no query
string, i.e. carries only tile z/x/y — never a user's geometry,
coordinates, or properties, which are only ever handed to MapLibre as a
local JS object via `setData()`). The coordinate converter's UTM math
(`convert/coordinates.ts`, using the tiny zero-dependency `utm` package)
is the one engine module not routed through a worker — it's cheap, pure
number crunching with no benefit from the hop — but the whole module is
still dynamically imported by `CoordinateConverterTool.tsx` on first use to
keep it out of the main bundle, consistent with every other engine-specific
dependency on the site regardless of its size. `geoJsonToCsv`/`csvExport.ts`
reuses the Spreadsheet engine's `serializeCsv()` directly (a small, pure,
non-heavy utility) rather than re-implementing CSV escaping a second time —
the one deliberate exception to each engine's XML parsing otherwise staying
independently duplicated (`xml/parseXml.ts` has its own DOMParser wrapper
rather than importing the Spreadsheet engine's, keeping the two engines'
XML handling — including their security properties — independently
testable and decoupled). All 11 of those tools are unified into
**Geospatial Studio** (`components/geo/GeospatialStudioApp.tsx`, live at
`/geospatial-tools` and every individual tool's own URL) with
View/Edit/Analyze/Convert tabs, following the same shell pattern as
Data/PDF/Image Studio. Unlike Image Studio, this unification needed zero
new engine code — every capability the spec asked for already existed as
an exported function (`summarizeGeoJson`, `validateGeoJson`,
`repairGeoJson`, `simplifyGeoJson`, `kmlTextToGeoJson`, `gpxTextToGeoJson`)
— so the work was purely new/widened UI. `GeoJsonViewerTool.tsx` was
widened (not forked) with an optional `acceptKml` prop so View's "GeoJSON /
KML" action can render KML files through the exact same stats/map/
property-table UI (KML routed through the existing `kmlTextToGeoJson()`
first); the locked `/geo/geojson-viewer` page passes `acceptKml={false}` so
its own behavior is unchanged, matching Image Studio's precedent of
enhancing capability only where there's no legacy URL promise to preserve.
GPX stays on the separate, already-richer `GpxViewerTool` (stats +
elevation profile + map) rather than being folded into the GeoJSON viewer,
since forcing GPX through a property-table layout it doesn't have would be
rewriting, not reuse. The Analyze tab (`GeoAnalyzeTool.tsx`) is genuinely
new UI with no prior art — it composes `summarizeGeoJson()` and
`validateGeoJson()` (each already used individually elsewhere) into one
read-only view; CRS is shown as a labeled constant ("WGS84 (EPSG:4326)"),
not a per-file detected value, since grepping the whole engine for "crs"
turns up nothing — GeoJSON (RFC 7946) and everything normalized through
this app's KML/GPX converters is always WGS84. Coordinate Editing is a
deliberate placeholder tab, mirroring PDF Studio's Security tab and Image
Studio's Watermark tab — confirmed nothing to reuse (`package.json` has no
map-drawing library, and no component exposes any selection/edit
affordance on the map). A new shared helper,
`components/geo/parseAnyGeoFile.ts`, detects a dropped file's format and
routes it through the right existing parser for both View and Analyze —
building it surfaced a real, previously-latent bug in
`lib/detect/detectFile.ts`'s `detectFileType()`: it only sniffs the first
512 bytes, so a GeoJSON file longer than that truncates mid-structure,
fails its own `JSON.parse` check, and falls back to reporting the generic
`"json"` format instead of `"geojson"` — every earlier caller only ever
called `parseGeoJsonFile()` unconditionally and never branched on the
detected format, so this never mattered until `parseAnyGeoFile` became the
first caller that does. Fixed by treating `"json"` as a GeoJSON candidate
too (`parseGeoJsonFile()` re-parses the *whole* file and already throws its
own clear error if it isn't actually GeoJSON) rather than trying to make
`detectFileType()` itself more thorough — caught by the new Analyze/View
e2e tests, not by `tsc` or lint, another concrete instance of why real
end-to-end verification (not just types) matters for this kind of change.
Convert's 7 actions include `coordinate-converter` alongside the 6
file-format converters — it converts coordinate *text* between formats,
still "a converter," matching how Image Studio's Convert tab hosts
`SvgToPngTool` (structurally different from the 6 raster conversions)
alongside them; and the **Developer & Text Utility engine**
(`src/engines/developer/`) powering `base64-encode`, `base64-decode`,
`url-encode`, `url-decode`, `html-encode`, `html-decode`, `unicode-escape`,
`unicode-unescape`, `uuid-generator`, `hash-generator`,
`unix-timestamp-converter`, `text-diff`, `json-diff`, `sql-formatter` (all
under `/tools/*`), and `csv-to-sql-insert` (under `/convert/*`).
`json-formatter` was renamed from "JSON Formatter & Validator" to plain
"JSON Formatter" once a dedicated `json-validator` existed, mirroring the
XML pair's naming rather than leaving two tools claiming the same job —
both tools, along with `json-minifier`, `xml-formatter`, `xml-validator`
and the 4 JSON⇄XML/YAML converters, were Developer Toolkit tools at the
time; all 9 later moved to Data Studio (PROJECT_LOG.md "Data Studio absorbs
JSON/XML/YAML tooling"), and this engine (`src/engines/developer/`) never
actually implemented any of them — their real implementation was always
`engines/spreadsheet/`, unchanged by the move. Their *pages* later became
Data Studio deep-link entry points too (PROJECT_LOG.md entry 26): the nine
colocated `TextTransformTool` wrappers collapsed into one parameterized
`components/spreadsheet/StructuredTextTool.tsx`, which Data Studio mounts
from its Edit/Analyze/Convert action pickers — so these tools now have a
single implementation reachable both in-app and at their own URLs, same as
every other Studio tool. None of this engine's
modules run in a Comlink worker — every operation here is cheap enough
(hashing, encoding, string diffing, small-CSV-to-SQL) that a worker hop
would add latency without a responsiveness benefit, unlike Spreadsheet/PDF-
structural/Geospatial's genuinely heavy parsing work. Text Diff and JSON
Diff share one component, `components/dev-tools/DiffTool.tsx`
(parameterized by a `mode` prop, same shape as `GeoConverterTool`'s `kind`),
and both share one underlying module, `engines/developer/diff.ts` — built
on the `diff` package's `diffLines` *and* `diffJson` (the latter
canonicalizes/sorts keys and pretty-prints before line-diffing, so JSON
Diff is a thin reuse of the same library rather than a hand-rolled
recursive structural differ). `sql-formatter` (SQL Formatter) and
`csv-to-insert.ts` (CSV to SQL INSERT) never execute or connect to a
database — they only ever transform text; `csv-to-insert.ts`'s SQL
injection defense is structural, not best-effort: every identifier and
string value is escaped by doubling its delimiter before being spliced into
the output, verified with a test asserting a crafted table name containing
`"; DROP TABLE ...` can't break out of its quotes. `hash-generator` uses
only the native Web Crypto API (`crypto.subtle.digest`, SHA-1/256/384/512)
— MD5 is deliberately not offered since `crypto.subtle` doesn't implement
it and hand-rolling a hash function isn't worth the risk in a security-
adjacent tool — and its UI carries a permanent, non-dismissable warning
that these are general-purpose hashes, never a password storage mechanism.
`uuid-generator` (`crypto.randomUUID()`) and `unix-timestamp-converter`
(`Date.now()`/`new Date()`) both generate their first client-only value
inside a `useEffect` rather than during the initial render or a `useState`
initializer — reading either API during render would bake a server-
rendered value into the markup that immediately mismatches on client
hydration. The Text category's 10 newer tools (`word-counter`,
`character-counter`, `line-counter`, `remove-empty-lines`,
`remove-duplicate-lines`, `sort-lines`, `reverse-lines`, `trim-whitespace`,
`normalize-line-endings`, `case-converter`) are each independent
(`ToolDefinition`s, own `/tools/*` routes) but share components rather than
duplicating textarea-in/textarea-out UI ten times over. Seven of them
(everything except the three counters) reuse the pre-existing
`components/text-tools/TextTransformTool.tsx` unchanged, each just passing
a different pure function from two new engine modules —
`engines/developer/textLines.ts` (remove-empty/remove-duplicate/sort/
reverse/trim/normalize-line-endings) and `engines/developer/caseConvert.ts`
(case-converter) — all total functions that never throw, unlike
base64/URL decode's genuinely-fallible inputs. The three needing an extra
option (Sort Lines' direction, Normalize Line Endings' target, Case
Converter's mode) pass a small new shared `components/text-tools/
RadioOptionGroup.tsx` as `TextTransformTool`'s `extraControls` slot, rather
than three near-identical bespoke pickers. Word/Character/Line Counter
don't fit `TextTransformTool`'s click-to-run shape (a giant read-only
output textarea for "Words: 12" reads as odd UX for what's conventionally a
live-updating stat) — they share a new `components/text-tools/
TextStatsTool.tsx` instead, computing `engines/developer/textStats.ts`'s
`computeTextStats()` via `useMemo` on every keystroke (cheap enough to run
uncached) and rendering all 6 stats (words/characters/charactersNoSpaces/
lines/sentences/paragraphs) with a `highlight` prop determining which one
is emphasized — the three tools differ only in that prop and their own
page copy/SEO, not in component code. The Encoding category's 4 newer
tools (`html-encode`, `html-decode`, `unicode-escape`, `unicode-unescape`)
follow the simpler shape the pre-existing Base64/URL tools already used:
each is a thin `TextTransformTool` wrapper around one pure function from a
new engine module, no `extraControls` needed since none of them take an
option. `engines/developer/htmlEntities.ts` encodes/decodes only the 5
predefined XML/HTML entities (`&amp;` `&lt;` `&gt;` `&quot;` `&#39;`) plus,
for decoding, numeric character references (`&#233;`, `&#xE9;`) — not the
full ~2000-entry named-entity table (`&copy;`, `&nbsp;`, ...), which would
need a large lookup table this tool doesn't otherwise need; unrecognized
named entities pass through unchanged rather than being guessed at.
`engines/developer/unicodeEscape.ts` escapes by raw UTF-16 code unit, not
Unicode code point — an astral character (e.g. an emoji) is naturally
escaped as two `\uXXXX` sequences (a surrogate pair), the same
representation JavaScript string literals themselves use, without any
special-casing needed for code points above the Basic Multilingual Plane.

The Spreadsheet & Data app's Editor mode (`/spreadsheet-tools`, Editor tab)
got a real interactive grid — `jspreadsheet-ce` (+ its `jsuites` dependency)
inside `components/spreadsheet/SpreadsheetGridEditor.tsx`, lazy-loaded via
`LazySpreadsheetGridEditor.tsx` (`next/dynamic`, `ssr: false`), the same
boundary shape as `LazyGeoMap.tsx`. Two edit histories are kept
deliberately separate rather than merged: direct cell edits (typing,
paste, row/column insert-delete) use the grid's own native undo/redo and
report their live contents up via an `onLiveChange` callback into
`liveTable` state; the pre-existing bulk-operation `recipe.ts`/
`recipeReducer` engine (find & replace, sort, dedupe, ...) stays a
separate "Bulk edits" history in the side panel. `SpreadsheetDataApp.tsx`'s
`table` is `liveTable ?? currentTable(recipeState)`, so once the grid has
reported anything it's authoritative for every mode (View/Convert/
Analyze/export) — a manual cell edit is never silently dropped, and
applying a new bulk op rebases the recipe onto the current live table
first. The grid's toolbar icons (`.material-icons`) need a webfont
neither `jspreadsheet-ce` nor `jsuites` ship (confirmed: no `@font-face`
in either's CSS) — self-hosted from the `material-icons` npm package via
`scripts/copy-material-icons-assets.mjs`, the same self-hosting pattern as
the DuckDB/pdf.js assets above, rather than Google Fonts' CDN (which the
CSP blocks anyway). See `PRIVACY_ARCHITECTURE.md`'s dependency table for
the network-inertness verification of both packages.

All four Studio pages (`/data-studio`, `/pdf-tools`, `/image-tools`,
`/geospatial-tools`) render through one generic page-level shell,
`components/studio/StudioLayout.tsx` — the Application-level counterpart to
`ToolPageLayout` (which plays the same role one level down, for individual
tool pages). It owns breadcrumbs, the header (title, on-page description,
`LocalProcessingBadge`), the ad slot, FAQ and related-actions sections, and
the consistent `max-w-[54rem]` spacing described below — and has zero
per-Studio knowledge itself. It deliberately renders **no** "Browse by
capability" nav and **no** `RelatedApplications` block: both existed and
were removed as unwanted page furniture on the Application pages
specifically (see the capability-layer note below for the crawl
consequence). `tests/e2e/seo-architecture.spec.ts` asserts their absence so
neither creeps back in. Each Studio's own interactive application
(`SpreadsheetDataApp`, `PdfStudioApp`, `ImageStudioApp`,
`GeospatialStudioApp`) is passed in as `children` and keeps owning its drop
zone and action-navigation tab bar, since both stay wired to per-engine
file-parsing and mode state that doesn't flatten into a shared layout
without rewriting that logic — "the layout stays generic" is satisfied by
composition (a `children` slot), not by `StudioLayout` knowing what a PDF
tab bar or a GeoJSON drop zone looks like. Every other piece of
configuration a Studio page needs — title, description, supported actions,
default action, engine, accepted file types, related-engine lookups, FAQ —
is a plain data object, `StudioDefinition`, in `registry/studios.ts`;
`getStudioConfig(slug)` merges it with the matching `CategoryDefinition`
(title/engine, rule 8's single source of truth) into the `StudioConfig` a
page passes to `StudioLayout`. Adding a fifth Studio in the future means
adding one `StudioDefinition` entry and one thin page file wiring its own
app component into `<StudioLayout studio={...}>` — never a hand-rolled
header/FAQ/related-actions block.

**The Geospatial engine's CRS support is two layers: a curated registry in
the bundle, and the full EPSG catalogue lazy-loaded behind it.** `proj4` can
transform between any two systems but only once handed a definition *string*
— it ships exactly two built in.
- **Layer 1 (instant):** `engines/geospatial/ops/crsRegistry.ts` carries ~24
  curated global/national definitions in the main bundle. It powers the
  quick-select buttons and answers `findCrs`/`searchCrs` synchronously with
  nothing downloaded.
- **Layer 2 (on demand):** `scripts/generate-epsg-index.mjs` trims the
  `epsg-index` **dev** dependency (~16 MB, never shipped) into
  `epsgIndex.generated.json` — 8,000+ systems, ~1.2 MB raw / ~140 KB gzipped
  — which `searchAllCrs`/`findCrsAnywhere` dynamic-import on the first real
  search. Generated at postinstall and gitignored, since it's reproducible
  from node_modules (the DuckDB *extensions* are committed precisely because
  they aren't).
- **The worker never loads the catalogue.** `CrsConverterTool` resolves a code
  to `{ code, proj4 }` on the main thread and sends that; `resolveCrs` accepts
  either a bare string or that pair (`CrsRef`). This is what keeps an
  8,000-entry index out of the worker bundle entirely.
- Curated entries are merged **first** in `searchAllCrs`, so a common CRS
  keeps its friendlier aliases and hand-verified definition rather than being
  shadowed by the bulk import.

Two rules follow:
- **Verify a projection against real reference coordinates, never just
  "it produced output."** A first draft of the EPSG:5514 (Krovak) definition
  used `+lon_0=42.5` instead of `24.8333…` and placed Prague ~1,200 km away;
  `tsc`, lint, and a round-trip test would all still have passed (a wrong
  projection round-trips perfectly). `tests/unit/geoCrs.test.ts` pins four
  landmarks to published values for exactly this reason — add a reference
  assertion whenever a CRS is added.
- **Reprojection walks the GeoJSON document directly rather than going
  through turf**, because turf's helpers normalize away precisely what has to
  survive: `properties`, feature `id`, foreign members, and the exact
  geometry type (turf refuses `GeometryCollection` outright). `ops/crs.ts`
  clones the input and mutates only `coordinates` arrays, so preservation is
  structural rather than a field-by-field copy that can drift.
- **CRS is detected, never assumed.** A legacy 2008-style `crs` member is
  adopted automatically; a file without one reports "not detected" and waits
  for the user. Defaulting to WGS 84 would silently corrupt the projected
  files the tool exists to handle.

**`components/geo/parseAnyGeoFile.ts` returns `{ geojson, sourceFormat }`,
not the document itself** — destructure it. Handing the wrapper to an engine
op fails *silently* for reprojection (no branch matches, so the file comes
back unchanged and a "did a download appear?" check still passes) while
failing loudly for others. That asymmetry is why geospatial e2e tests assert
real output *values* — parsing the downloaded file and range-checking its
coordinates — rather than the presence of a download button (PROJECT_LOG
entry 27).

**Don't report problems nobody can act on.** The geometry validator
(`ops/topology.ts`) deliberately does *not* check RFC 7946 ring winding
order, even though it's in the spec and the check was built and working: this
repo's own `sample.geojson`, valid by every practical measure, winds
clockwise, as does much real data, and nothing in the pipeline cares
(MapLibre and turf both ignore winding). A warning with no action and no
consequence devalues the self-intersection and degenerate-ring findings
beside it. Keeping "a clean file reports no problems" true is worth more than
spec completeness — the same judgment applies to any future validator rule.

**Geospatial Studio's file lives in one shared `GeoWorkspace`, not in each
tool.** `components/geo/GeoWorkspace.tsx` is a context provider that owns the
loaded file, its detected format, the parsed GeoJSON (or CSV table) and the
bbox. Every geo tool is presentational: it reads `useGeoWorkspace()` and
renders only its own options and results.
- **Why:** each tool used to own its own `file` state *and* its own
  `FileDropZone`, so switching tabs unmounted the tool and silently discarded
  the user's file — they had to re-drop it for every operation. Data Studio
  never had this problem because `SpreadsheetDataApp` owns the file centrally;
  this gives the Geospatial engine the same property without collapsing its
  ten genuinely-different tool UIs into one component.
- **The drop zone is `GeoFilePanel`, a separate export the Studio renders
  inside its own shell** — under the tab bar and action picker, matching the
  order Data/PDF/Image Studio use (tabs → action picker → drop zone → the
  tool's own UI). The provider deliberately renders no UI at all: an earlier
  version put the drop zone above `children`, i.e. above the Studio's own
  tabs, which made Geospatial the one Studio with a different layout. A
  component test can still drive the real drop zone by rendering
  `<GeoWorkspace><GeoFilePanel /></GeoWorkspace>`; for tests that only care
  about the tool, `GeoWorkspaceContext` is exported so
  `tests/component/geoWorkspaceHarness.tsx` can inject an already-loaded
  document directly.
- **`actionNeedsFile()` decides whether the drop zone renders at all.** The
  coordinate converter works on pasted text, so a drop zone above it would
  imply a file it never reads — the same rule Data Studio applies to its
  paste-first actions.
- **The View tab has no action picker, on purpose.** The workspace already
  detected the format, so the viewer follows it (GPX → `GpxViewerTool`,
  otherwise `GeoJsonViewerTool`); asking the user to choose "GeoJSON / KML"
  vs "GPX" only asked them to restate what the file already says, and the
  drop zone and page description both list the accepted formats anyway.
  Image and PDF Studio's View tabs never had a picker either. `lockedViewAction`
  still pins the viewer on `/geo/geojson-viewer` and `/geo/gpx-viewer`, whose
  SEO promise is one specific tool. A CSV renders a short "convert it first"
  notice instead of a viewer, since it has no geometry yet.
- **`documentKey` is why no tool resets state in its load effect.** It's
  bumped on every load/clear and folded into each tool's React `key`, so a new
  file remounts the tool with fresh state. This exists because
  `react-hooks/set-state-in-effect` forbids the `setX(null)` prologue that
  would otherwise be needed — and remounting is the better answer anyway.
  For the same reason, per-tool loading flags are **derived**
  (`!result && !error`) rather than stored, so a spinner can never get stuck
  out of sync with the data.
- **Actions are gated on the detected format** (`components/geo/actionFormats.ts`).
  An action the loaded file can't support is rendered `aria-disabled` with a
  `title` explaining why ("Not available for a GeoJSON file — this action
  needs GPX"), and the picker falls back to the first supported action rather
  than mounting a tool that can't read the file. `aria-disabled` rather than
  `disabled` is deliberate: a truly disabled button is skipped by keyboard
  focus and fires no mouse events in several browsers, so its tooltip — the
  entire explanation — would never appear. Most Edit/Analyze actions accept
  all three geometry formats because `parseAnyGeoFile` normalizes KML and GPX
  to GeoJSON first; the real restrictions are the format converters and the
  two viewers.

**The diff viewer's row model lives in the engine, not the component.**
`engines/developer/diff.ts` returns both a flat `lines` list (the stable shape
`renderDiffText` exports) *and* aligned `rows` carrying per-side line numbers,
a `modified` type pairing a deletion with the addition that replaced it,
word-level `segments` inside those pairs, and a `blockIndex` grouping
contiguous changes so the UI can step through "change 3 of 12" rather than
through individual lines. Three behaviours are load-bearing and easy to
regress:
- **`diffLines` has neither `ignoreCase` nor a `comparator`** (only
  `diffArrays` does), so case-insensitive comparison routes through
  `diffArrays` over pre-split lines. The default path stays on `diffLines` so
  the common case remains byte-for-byte what it always produced.
- **The `diff` library returns the *new* string's value for loosely-matched
  tokens** (its own documented behaviour under a comparator). Left-hand text
  therefore has to be read back out of the original array by position —
  otherwise the left column displays the right side's casing, i.e. text the
  user never typed. That's what `ChangePart.leftValue` exists for.
- **A pairing whose two sides are byte-identical is reported as `unchanged`,
  not `modified`.** `diffLines("a", "a\nb")` reports a removal of `"a"` plus
  an addition of `"a\nb"` rather than a shared `"a"`, and marking that as a
  change would highlight an edit where nothing changed.

**A Studio tool's page is a deep-link entry point into the shared Studio
app, never a second implementation of it.** Each Studio has exactly one
UI implementation (`SpreadsheetDataApp`, `PdfStudioApp`, `ImageStudioApp`,
`GeospatialStudioApp`); a tool page is a thin wrapper that renders that
same component pre-initialized — `<SpreadsheetDataApp initialMode="edit"
lockedEditAction="json-formatter" />`, `<PdfStudioApp initialTab="pages"
lockedPagesAction="merge" />`, and so on.
- **The URL must not change.** This is a render-time configuration, never
  an HTTP redirect or a client-side navigation to the Studio hub. The tool
  keeps its own route, canonical URL, title/description, FAQ, How-it-works,
  breadcrumbs, related tools, structured data and sitemap entry — the page
  is still its own SEO landing page, and `tests/e2e/structured-data-tools
  .spec.ts`'s "Data Studio deep-link entry points" block asserts exactly
  that (200 at the same path, right tab preselected, canonical still the
  tool's own, JSON-LD still emitted).
- **`initial*` vs `locked*` are different promises.** `initialMode`/
  `initialTab` only *preselects* — the user can still switch tabs, which is
  what makes the tool page a superset entry point rather than a dead end.
  `locked*Action` additionally hides that capability's second-level
  `ActionPicker`, so a page whose SEO promise is one specific tool
  ("JSON Formatter") doesn't present its siblings as equal choices.
- **`components/app-shell/ActionPicker.tsx` is shared by all four Studios.**
  Each Studio previously carried its own byte-identical private copy; they
  were consolidated once a fourth would have been added. A Studio still owns
  its own action *ids and labels* (genuinely per-Studio data) — only the
  rendering is shared.
- **Developer Toolkit is deliberately excluded**, because it deliberately
  isn't a Studio (rule 10) — there's no unified app to deep-link into. Its
  25 tools are already single-implementation via shared, parameterized
  components (`TextTransformTool`, `TextStatsTool`, `DiffTool`), which is
  the same "don't duplicate UI" outcome reached without a Studio shell.

**The site's URL hierarchy is four levels: Home → Application → Capability
→ Tool**, and every level is a real, crawlable, individually-indexed page.
The Capability level (`/{categorySlug}/{capability}` — `/pdf-tools/pages`,
`/data-studio/convert`, …) was added by a 2026 SEO review; before it, a
Studio's capabilities were client-side tabs with no URL at all, so the only
crawlable path from an Application to a tool was the Application page's one
flat "related actions" list.

**Capability index pages currently have no inbound internal links** — the
"Browse by capability" nav on `StudioLayout` was their only one, and it was
removed by product decision. They remain real, indexable, canonical pages
listed in `sitemap.xml`, and they still link *down* to their tools and
*sideways* to siblings, but a crawler now reaches them via the sitemap
rather than by walking the site. The Application → Tool hop still works
through each Studio page's "Related tools" list. If the capability layer is
ever meant to carry organic traffic again, it needs an inbound link from
somewhere — that is the specific thing to restore, not the whole nav. `registry/capabilities.ts` is the single
source for which capability pages exist, and `components/studio/
CapabilityPageContent.tsx` renders all of them (one thin static page folder
each, matching the Developer Toolkit sub-category precedent rather than a
`[slug]` route).
- **A capability page is a *list*, never a second copy of the Studio app** —
  that's what keeps it from being duplicate content against the Application
  page directly above it. It enumerates only that capability's tools (each
  with its own registry description), then links up to the Application,
  sideways to sibling capabilities, and out to the other Applications.
- **Capability membership is `appEntry.mode ?? capability`** (see
  `getToolCapability`). `appEntry` is the *rendering* answer ("this page
  mounts the shared Studio app in this mode"); `ToolDefinition.capability`
  is the *navigational* one, for a tool that belongs to a Studio but
  doesn't render its app. **Every Studio-owned tool now takes the
  `appEntry` branch** — the 9 JSON/XML/YAML tools were the last holdouts
  (they rendered a colocated `TextTransformTool` wrapper) until they became
  Studio entry points too; `capability` stays as the supported escape hatch
  for a future tool with genuinely bespoke UI, and its fallback branch is
  unit-tested directly so it can't rot unnoticed. A tool must never set
  both; a registry integrity test enforces that, plus "every Studio-owned
  tool appears on exactly one capability index page."
- **A capability with no standalone tools deliberately gets no page** (PDF
  Studio's Security, Image Studio's View, Geospatial Studio's Analyze —
  all real in-app capabilities, none with a standalone tool behind them).
  An index page listing zero tools is thin content that would hurt
  crawlability rather than help it. This is encoded as "no
  `indexDescription` on the `StudioAction`," and the integrity test asserts
  the converse — anything *with* tools must have one — so the two can't
  drift apart.

**Structured data is consistent by page type**, and each type emits the
same set everywhere it appears: a **tool page** and an **Application page**
both emit `SoftwareApplication` + `FAQPage` + `BreadcrumbList` (via
`buildApplicationJsonLd`, shared by both so the two levels can't drift into
near-duplicate shapes); every **index page** — a Studio capability page or
a Developer Toolkit sub-category page, the same kind of page one level
apart — emits `CollectionPage` wrapping an `ItemList` + `BreadcrumbList`;
the **homepage** emits `WebSite`. `Breadcrumbs.tsx` emits its own
`BreadcrumbList` from the same `items` it renders visibly, so the visible
trail and the markup can never disagree. `tests/e2e/seo-architecture.spec.ts`
asserts this per page type, including that every emitted block parses as
JSON and carries a `schema.org` `@context`.

`components/seo/RelatedApplications.tsx` cross-links the other Applications
from every capability and Developer-Toolkit index page (`excludeSlug` drops
the page's own). It is deliberately **not** rendered on the four Studio
(Application) pages themselves — removed there by product decision, so
Application-to-Application linking now happens through the header, footer
and homepage grid only. It reads `getAppNavItems()` — the
same source the header/footer/homepage grid use — so a new Application
appears in every one of those places at once. Before it, the only path
between two Applications was the header nav or the homepage; the internal
link graph was five disconnected per-Application trees.

The top-level, sitewide navigation (`SiteHeader`, `SiteFooter`, the
homepage's own Applications grid, and `not-found.tsx`'s recovery links) is
organized around the 5 Applications, never a flat list of tools or a
"Categories" label — all four consume one shared source,
`registry/navigation.ts#getAppNavItems()`, rather than each hand-rolling
its own version of the same 5-item list. Each Application entry carries a
small, bounded preview of that Application's own capabilities: for the
four Studios, `STUDIOS[].actions` (the *exact* same list that drives each
Studio's own in-app tab bar — not a second, driftable copy); for Developer
Toolkit, `DEV_CATEGORIES` (its real, separately-addressable sub-category
pages). This is what keeps the nav's size bounded by 5 Applications × a
handful of capabilities each — independent of how many tools exist
underneath any of them, the property that lets it scale past 150 tools
without becoming an unusable flat list. `SiteHeader` renders each
Application as a plain link, styled with a visible border/pill shape (not
bare underlined text) specifically so it reads as clickable at a glance —
an earlier version used a native `<details>`/`<summary>` disclosure per
Application to preview its capabilities before clicking through, reverted
after real usage showed the problem native `<details>` doesn't solve for
free: nothing closes one disclosure when another opens, so multiple
panels can be open and visually overlapping at once (confirmed from an
actual screenshot, not a hypothetical). Capability previews live on the
homepage's own Applications grid instead (below), which doesn't have this
failure mode since it's static content, never a popover. `SiteFooter` and
`not-found.tsx` stay flat link lists too (a secondary/recovery nav doesn't
need button styling the way primary navigation does).

The homepage's search box (`components/tools/SiteSearch.tsx`, backed by
`registry/search.ts#searchSite()`) is a global site search, not a tools-only
one — it was widened from an earlier tools-only `ToolSearch` once a UX
review found it couldn't answer "PDF" with "PDF Studio" or "Resize" with
"Image Studio," only individual tool matches. `searchSite()` matches, and
ranks ahead of every tool result, an Application through three signals: its
own name, one of its capability labels (`getAppNavItems()` — the same data
driving the header nav, so a query like "Security" or "Encoding" reaches
PDF Studio or Developer Toolkit the same way the nav dropdown would), or
one of its accepted file formats (`STUDIOS[].acceptedFileTypes`, matched
against both the raw format code and `lib/detect/formatLabels.ts`'s
existing display label, so "csv" and "excel" both reach Data Studio). A
query that only matches a tool (e.g. "Resize" only matches Resize Image —
"Resize" isn't a top-level Image Studio tab, only a sub-action inside its
Edit tab's own picker, one level deeper than `registry/studios.ts` tracks)
still surfaces that tool's owning Application, resolved via
`STUDIOS[].relatedEngines` first and `CATEGORIES` engine-matching as a
fallback — the same two-step lookup already needed for Parquet Viewer
(`engine: "parquet"`) to resolve to Data Studio, since no `CATEGORIES`
entry has `engine: "parquet"` directly. Runs entirely client-side (filters
registry data already in the bundle) — no network request, no server-side
index.

Every page's content column — homepage, every category page (`CategoryPage.tsx`),
every individual tool page (`ToolPageLayout.tsx`), the Spreadsheet & Data
app hub (`app/spreadsheet-tools/page.tsx`), even `not-found.tsx` — is a
fixed `mx-auto max-w-[54rem]` (864px), deliberately the *same* width
whether or not a file/table is loaded. An earlier version widened the
Spreadsheet & Data app once a table loaded (via a since-deleted
`WideBreakout.tsx` full-bleed technique); that was reverted because an
unpredictable page width conflicts with reserving stable side margins for
ads (below) — 864px, not Tailwind's default 768px (`max-w-3xl`), was
chosen by measuring real side-margin space at common viewport widths in an
actual browser: it's the widest column that still leaves both side-rail
ads a full 160px + 24px gap at 1280px (the narrowest width they show at),
without the margin getting uncomfortably tight at 1366×768 — the single
most common laptop resolution, and the reason the rails' visibility
threshold wasn't just raised instead of capping the column width.

`components/layout/SideRailAds.tsx`, rendered once in the root layout
(`app/layout.tsx`) so every page gets it automatically, adds two reserved
`AdSlot` placements — `"left-rail"`/`"right-rail"`, 160×600 each
(`components/tools/AdSlot.tsx`'s `DIMENSIONS` map) — matching every other
`AdSlot` in being `aria-hidden`, non-interactive, and a placeholder only
(README.txt §37: no real ad network wired in yet). Each rail is
`position: fixed`, vertically centered, and `hidden xl:block` (≥1280px,
the narrowest width with room for a 160px unit without crowding the
content column); its horizontal offset is computed from viewport center
via `calc(50% ± 28.5rem)` (half the 864px column plus a 24px gap) rather
than measured from the DOM, so it stays exactly aligned with the content
column on every page without a layout-measurement pass.

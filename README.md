# FileBrix

**Free file tools that never upload your files.** → [filebrix.com](https://filebrix.com)

Convert, view and edit PDFs, images, spreadsheets, Parquet, GeoJSON and other
data files directly in your browser. 110 tools, no account, no upload: every
file is processed on your own device, by JavaScript and WebAssembly running in
the page.

| Application | What it does |
| --- | --- |
| [Data Studio](https://filebrix.com/data-studio) | CSV, Excel, JSON, XML, YAML and Parquet: view, edit, validate and convert between them |
| [PDF Studio](https://filebrix.com/pdf-studio) | Merge, split, rotate, reorder, watermark, number pages, PDF ⇄ images, PDF to text, metadata |
| [Image Studio](https://filebrix.com/image-studio) | Convert PNG/JPG/WebP/SVG, resize, compress, crop, adjust, watermark, view and strip EXIF |
| [Geospatial Studio](https://filebrix.com/geospatial-studio) | GeoJSON, KML/KMZ, GPX, Shapefile and TopoJSON: view on a map, validate, simplify, buffer, reproject (8,000+ EPSG systems) |
| [Developer Toolkit](https://filebrix.com/developer-tools) | Text diff, regex tester, JWT decoder, hashes, Base64/URL/HTML encoding, SQL formatting and more |

## Why this repository is public

The site's one promise is that **your files never leave your device**. You
shouldn't have to take that on trust, so the code is here to check:

- **There is no server that could receive a file.** The site is a static
  export served from Cloudflare's edge. There are no API routes and no
  backend.
- **The browser itself enforces it.** The Content-Security-Policy in
  [`public/_headers`](public/_headers) sets `connect-src 'self'`, so even a bug
  that tried to send a file somewhere would be blocked by the browser.
- **Tests assert it.** The end-to-end suites in [`tests/e2e/`](tests/e2e/) run
  the tools in a real browser and record every request that leaves the site.
  A tool run that produces one fails the test.
  [`privacy-audit.spec.ts`](tests/e2e/privacy-audit.spec.ts) also checks that
  GPS coordinates read from a photo are shown on screen and never
  transmitted.
- **The one exception is documented.** Map views load basemap tile images
  from CARTO. Those requests contain only tile coordinates (zoom/x/y), never
  your geometry. [`PRIVACY_ARCHITECTURE.md`](PRIVACY_ARCHITECTURE.md) lists
  every network request the site can make and every third-party library it
  uses.

**Check it yourself on the live site:** open your browser's developer tools,
switch to the Network tab, and use any tool. You'll see the page's own assets
load, and no request carrying your file.

## How it works

Everything runs client-side, mostly in Web Workers so large files don't
freeze the page:

- **PDF:** [pdf-lib](https://pdf-lib.js.org/) for page operations,
  [pdf.js](https://mozilla.github.io/pdf.js/) for rendering and text
  extraction.
- **Images:** the browser's own Canvas / `OffscreenCanvas` pipeline, with no
  image library at all.
- **Spreadsheets and data:** Papa Parse, SheetJS and js-yaml, plus the
  browser's native XML parser.
- **Parquet:** [DuckDB-WASM](https://duckdb.org/docs/api/wasm/overview),
  a full SQL database running in the tab.
- **Maps and GIS:** MapLibre GL, Turf and proj4.
- **Framework:** Next.js, statically exported. Each heavy library is
  downloaded only when you first use a tool that needs it.

## Running it locally

Requires Node.js 20+.

```bash
npm install
npm run dev          # http://localhost:3000
npm run test         # unit and component tests (Vitest)
npm run test:e2e     # end-to-end tests (Playwright)
```

Contributor documentation: [`README.txt`](README.txt) is the product spec,
[`CLAUDE.md`](CLAUDE.md) the engineering rules, and
[`PROJECT_LOG.md`](PROJECT_LOG.md) the history of every design decision.

## License

Copyright © 2026 the FileBrix authors.

Licensed under the **GNU Affero General Public License v3.0**; see
[`LICENSE`](LICENSE). You may use, modify and redistribute this code, but if
you run a modified version as a service people use over a network, you must
publish your complete source under the same license.

The FileBrix name and the filebrix.com domain are not covered by the license.

Bug reports are welcome at info@filebrix.com, and security reports at
security@filebrix.com.

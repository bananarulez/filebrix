# Roadmap — evaluated, decided, recorded

Features that have been **assessed against this codebase** and given a
decision, so the same evaluation isn't repeated. Each entry says what it
would cost, where it would go, and — where the answer is no — why, in terms
of this project's architecture rather than general preference.

Three states only:

- **Next** — decided yes, not built yet.
- **Deferred** — worth doing, but the cost/benefit isn't there *yet*, with
  the condition that would change it.
- **Not building** — assessed and rejected. Reopening one of these needs a
  new argument, not a re-reading of the same facts.

`README.txt`'s "Potential later tools" list is the product-level wish list.
This file is the engineering verdict on it.

---

## Next

### Measure distance and area on the map
`@turf/distance`, `@turf/length` and `@turf/area` are already dependencies
and MapLibre is already wired, so this needs no new package — it's click
handling plus a measurement layer.

**Where:** a click handler in `components/geo/GeoMap.tsx`, a method on
`GeoMapHandle` in `engines/geospatial/map/maplibreClient.ts`, and a control
in the View tab.

**Why it wasn't in the batch that added the calculators:** it's the only item
that touches the map interaction layer, which has documented dev-only failure
modes (the `style.load` ordering trap, the `relative`-class teardown bug), and
it earns no new indexable URL. It deserves its own pass with browser
verification rather than riding along with six SEO-visible additions.

### WKT / WKB reader
Small hand-rollable parsers, no dependency. WKT is the user-facing half
("WKT to GeoJSON" is a real query); WKB is the machine half and is the
prerequisite for GeoParquet below.

**Where:** `engines/geospatial/import/wkt.ts`, a paste-first Convert action
next to the UTM/tile calculators, plus its own registry tool and page.

### Colour features by attribute in the viewer
The single biggest visual gap against comparable sites. MapLibre paint
expressions plus the `setFeatureState` machinery already built for
click-to-highlight; no new dependency.

**Where:** `GeoMapHandle` gains a style method; the control belongs beside
the new attribute filter in `GeoJsonViewerTool`.

---

## Deferred

### Restoring `<Link>` prefetch under static export

**Status: broken, deliberately not fixed.** Next 16's client router prefetches
route segments from URLs like
`/developer-tools/__next.developer-tools.__PAGE__.txt`, using `.` as the
segment separator — but `output: "export"` writes those payloads as nested
*directories*: `/developer-tools/__next.developer-tools/__PAGE__.txt`. Both
paths were checked directly (404 and 200 respectively), against a local
`wrangler dev` and the deployed site, so this is a Next export bug rather than
anything about Cloudflare.

**What it costs:** link prefetching does nothing, and each prefetch logs a 404.
**What it doesn't cost:** correctness. Navigation is still client-side —
`tests/e2e/workspace-persistence.spec.ts` passes, and it asserts that a loaded
file survives clicking an in-app link, which is only true if the JS module
registry survives the navigation (`lib/workspaceFiles.ts`). A hard navigation
would fail that test loudly.

**Why not fixed:** the only available fix is a hand-rolled path rewrite in
`worker/index.ts` — strip `__next.`, split the remainder on `.`, rejoin with
`/` — plus a broad `run_worker_first` glob to route prefetches through the
Worker at all. That is a new correctness surface (any route slug containing a
dot would mis-map, and a wrong mapping serves the *wrong page's* payload)
bought for a performance nicety, on pages that are static, tiny and
CDN-cached.

**What would change the answer:** a Next release that fixes the mismatch — try
removing this entry after an upgrade and re-running the 404 sweep. Failing
that, real evidence that navigation feels slow, which would make the trade
worth re-examining.


### GeoParquet
Highest-synergy format left: DuckDB-WASM and the Parquet reader already ship,
so this is mostly the WKB decoder from above plus GeoParquet's metadata
conventions — not a new dependency.

**Condition to promote:** do WKB first. Then this is a small step, and it
also opens the door to Parquet-backed geospatial querying that no competitor
in this space offers client-side.

### FlatGeobuf
`flatgeobuf`, 1.3 MB unpacked, clean spec, straightforward reader that slots
into `engines/geospatial/import/` exactly like Shapefile did.

**Condition:** demand. It's a well-designed format with a small user base
compared to Shapefile and GeoJSON. No architectural obstacle at all.

### Shapefile *export*
The most-requested missing direction. Blocked on honesty rather than
difficulty: writing a shapefile means emitting four files plus a zip, with
DBF's fixed-width columns and 10-character field-name limit silently
truncating longer property names.

**Condition to promote:** a UI that surfaces those constraints before the
download — showing which field names will be truncated and letting the user
rename them. Without that it's a lossy export pretending to be lossless,
which the Terms and the tool FAQs explicitly promise not to ship.

### GML
XML-based, and this project already has solid DOMParser/XXE discipline. The
obstacle is that GML is a sprawling family of profiles rather than one format,
so partial support risks reading a file "successfully" while dropping
geometry.

**Condition:** a narrow, named subset (e.g. "GML 3.2 simple features") with
the limitation stated on the page — not "GML support".

### GDAL via WebAssembly
The strategic fork. `gdal3.js` would unlock GML, DXF, GeoPackage, FlatGeobuf,
MapInfo, FileGDB and SpatiaLite in one move, and would fit the existing
self-hosted-WASM pattern (DuckDB, pdf.js, MapLibre).

**Why not now:** it inverts this project's page-weight advantage. Converting a
KML currently costs ~190 KB; under GDAL the same conversion pulls tens of MB,
because GDAL is monolithic and can't be tree-shaken per format. The
per-format readers are *better* for the common cases and worse only for the
long tail.

**Condition to promote:** wanting the exotic formats (DWG, FileGDB, MapInfo)
badly enough to pay that cost — and probably only on their own dedicated
pages, so the common conversions never load it.

---

## Not building

### Anything requiring a server call with the user's data
**Elevation lookup, weather, reverse geocoding, "how far can I drive"
(isochrones), routing.** Every one sends the user's coordinates to a third
party. That contradicts the claim the whole product rests on, and would fail
the existing e2e privacy tests that assert zero off-origin requests.

Competitors offer these. Not offering them is the differentiator, and the
Privacy page can say so. This is a permanent no while the product's promise
stays what it is.

### GeoTIFF / COG, and 3D point clouds
Refused on architecture, not size. The geospatial engine is entirely vector:
turf operations, feature lists, property tables, a topology validator. A
raster has no features, no properties and no geometry to operate on, so
supporting it means a second parallel pipeline plus raster overlay rendering
— and would leave most of the 19 geo tools showing "not available for this
file" whenever one was loaded.

### GeoPackage
`@ngageoint/geopackage` is 13.2 MB unpacked and bundles its own SQLite WASM
build, lodash and a reprojection stack. Files also routinely contain several
layers, which needs a layer-picker UI that doesn't exist. If GeoPackage ever
becomes important, it arrives via GDAL, not via this package.

### DWG, FileGDB, MapInfo, SpatiaLite, OSM PBF
The formats that only exist to justify GDAL. Skip with GDAL — see above.

### PMTiles / MBTiles export
Tile-pyramid generation is a different class of work from format conversion:
it means rendering, slicing and packaging at every zoom level. Out of scope
for a converter.

### Building shadows
Sun position is cheap arithmetic, but the feature needs building heights,
which means OpenStreetMap data over the network — see the first entry.

### PDF password protection
pdf-lib can detect encryption but cannot write it. The placeholder tab that
promised this was removed rather than left showing "coming soon" (PROJECT_LOG
entry 39). Reopening needs a different PDF library, which is a dependency
decision, not a feature decision.

### Coordinate editing on the map
Drawing and editing geometry needs a map-editing dependency this project
doesn't have. The placeholder was removed for the same reason as above.

### Compress PDF
Possible with what's here — `renderPageImage()` can rasterize at reduced
scale and `buildPdfFromImageFiles()` can rebuild — but it **destroys the
document**: every page becomes a JPEG, so text stops being selectable,
searchable and accessible, links and form fields disappear, and size can
*increase* for text-heavy PDFs. Shipping that silently would contradict
README.txt §35.

**Condition to promote:** detect whether a document is image-heavy, refuse or
warn loudly for text PDFs, and name the tool for what it actually does. That's
a product decision, not a spare afternoon.

---

## Recently shipped from this list

Kept briefly so a reader can see the list is live, not aspirational.

- **Zipped Shapefile import** — reuses the proj4 already present for the CRS
  converter, so `.prj` reprojection came free (PROJECT_LOG entry 42).
- **TopoJSON import** — 68 KB, no runtime dependencies.
- **KMZ import** — zipped KML; `jszip` and the KML parser were both already
  there.
- **UTM Zone Finder, Map Tile Calculator** — pure arithmetic, no dependency.
- **Bounding Box / Centroid / Convex Hull pages** — the operations already
  existed as Studio-only actions with no URL, which made them invisible to
  search.
- **Attribute filter in the GeoJSON viewer.**

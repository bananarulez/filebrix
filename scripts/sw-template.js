// FileBrix service worker — SOURCE TEMPLATE.
//
// `scripts/generate-sw-precache.mjs` copies this file to `public/sw.js`,
// substituting the two placeholder tokens below (the build id and the
// precache list) with values derived from the real build output. Edit THIS
// file, never public/sw.js (generated, gitignored, overwritten every build).
// Note for future edits: do not write either placeholder token anywhere else
// in this file, including in comments — the generator substitutes every
// occurrence.
//
// ---------------------------------------------------------------------------
// PRIVACY CONTRACT — read before changing anything here.
//
// This worker caches APPLICATION ASSETS ONLY: HTML documents, JS chunks, CSS,
// fonts, and the self-hosted engine binaries (DuckDB WASM, pdf.js workers and
// data files, MapLibre's worker). It never caches, reads, or inspects a user's
// file. There is deliberately NO code path here that touches a File, a Blob
// the app produced, a FormData, or a request body of any kind:
//
//   * Only GET requests are handled at all — every other method falls straight
//     through to the network untouched (`event.respondWith` is never called),
//     so an upload, if one ever existed, could not be intercepted or stored.
//   * Only same-origin requests are cached. Cross-origin is never written to
//     any cache under any circumstances (see BASEMAP note below).
//   * Nothing derived from a user's file ever reaches this worker: results are
//     in-memory Blobs handed to an <a download> click in the page, which is
//     not a network request and never enters `fetch`.
//
// See PRIVACY_ARCHITECTURE.md §1, §3 and §6.
// ---------------------------------------------------------------------------

const BUILD_ID = "__BUILD_ID__";
const PRECACHE = "filebrix-precache-" + BUILD_ID;
const RUNTIME = "filebrix-runtime-" + BUILD_ID;
const PRECACHE_URLS = __PRECACHE_URLS__;

// Multi-megabyte, self-hosted engine binaries. Deliberately NOT precached:
// public/duckdb alone is 72 MB (a 39 MB mvp build and a 34 MB eh build, and
// which one is used is decided at runtime by duckdb-wasm's own selectBundle,
// so an installer cannot know which to fetch). They are cached on first real
// use instead, which is why a tool needing one works offline only after it has
// been used online once — stated plainly in PROJECT_LOG.md's limitations.
const RUNTIME_CACHE_PREFIXES = ["/duckdb/", "/duckdb-ext/", "/duckdb-ext-files/", "/pdfjs/"];

// The one deliberate off-origin destination in the whole product
// (PRIVACY_ARCHITECTURE.md §1). It must never be cached: doing so would put
// third-party responses into storage the privacy documentation describes as
// same-origin only. Offline map tools degrade to "basemap unavailable", which
// is the correct behaviour, not a bug to paper over.
const BASEMAP_HOST_SUFFIX = ".basemaps.cartocdn.com";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PRECACHE);
      // addAll() is atomic-ish: one failure rejects the whole install, which
      // is what we want — a half-populated precache is worse than none, since
      // it would serve a shell whose chunks 404 offline.
      await cache.addAll(PRECACHE_URLS);
      // Take over immediately rather than waiting for every tab to close. A
      // stale shell serving an old build is a worse failure than a swap
      // mid-session, and the page reloads itself once on controllerchange
      // (see ServiceWorkerRegistrar.tsx) so it never runs old HTML against
      // new chunks.
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Every cache name carries the build id, so anything not matching this
      // build is from a previous deploy and is deleted wholesale. This is what
      // stops the caches growing without bound across deploys, and what
      // guarantees no asset from an older build can be served.
      const names = await caches.keys();
      await Promise.all(
        names.filter((name) => name !== PRECACHE && name !== RUNTIME).map((name) => caches.delete(name))
      );
      await self.clients.claim();
    })()
  );
});

function isRuntimeCacheable(pathname) {
  return RUNTIME_CACHE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/**
 * Cache-first: for content-hashed or version-pinned assets that never change
 * in place.
 *
 * `ignoreSearch` is load-bearing for `/_next/static/*`, not a micro-
 * optimization. Turbopack starts a Web Worker as
 * `…/turbopack-worker-<hash>.js?params=<json>` and the worker's own bootstrap
 * reads that query string back out of `location.href` — without it the worker
 * throws "Missing worker bootstrap config" before running a line of our code.
 * `caches.match()` is query-sensitive by default, so the precached bare URL
 * never matched and every engine that uses our own Comlink worker (Spreadsheet,
 * PDF structural, Image, Geospatial ops) failed offline, while pdf.js
 * (main-thread) and DuckDB (its own query-less worker URL) worked — which is
 * what made the failure look engine-specific rather than systemic.
 * Safe here because the filename itself is content-hashed: two URLs differing
 * only by query string are always the same bytes.
 */
async function cacheFirst(request, cacheName, ignoreSearch) {
  const cached = await caches.match(request, ignoreSearch ? { ignoreSearch: true } : undefined);
  if (cached) {
    // A cached Response carries the URL it was stored under. A Worker's
    // `location` comes from its *response* URL, so handing back the bare
    // cached entry for a `?params=…` request silently strips the query and
    // the Turbopack bootstrap reports "Missing worker bootstrap config" —
    // the script loads, then fails before running anything. Re-wrapping the
    // body produces a Response with no URL of its own, so the worker's
    // location falls back to the request URL and the query survives.
    if (ignoreSearch && cached.url && cached.url !== request.url) {
      return new Response(cached.body, {
        status: cached.status,
        statusText: cached.statusText,
        headers: cached.headers,
      });
    }
    return cached;
  }
  const response = await fetch(request);
  if (response && response.ok && response.type === "basic") {
    const cache = await caches.open(cacheName);
    await cache.put(request, response.clone());
  }
  return response;
}

/**
 * Network-first with a cache fallback: for HTML documents. A new deploy must
 * win whenever the network is available — serving a cached document that
 * references chunks a later build deleted is exactly the stale-shell failure
 * this design is meant to avoid.
 */
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response && response.ok && response.type === "basic") {
      const cache = await caches.open(cacheName);
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Unvisited route while offline: fall back to the precached homepage so
    // the user gets the app rather than the browser's dinosaur.
    const home = await caches.match("/");
    if (home) return home;
    throw error;
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Anything that isn't a plain GET is left entirely alone — see the privacy
  // contract at the top. Not "passed through with a wrapper": respondWith is
  // never called, so the request is not observable here at all.
  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  // Basemap tiles: never intercepted, never cached. Left to the network so
  // MapLibre's own error handling fires normally when offline, which is what
  // drives the "basemap unavailable offline" state in GeoMap.tsx.
  if (url.hostname.endsWith(BASEMAP_HOST_SUFFIX)) return;

  // Any other cross-origin request is likewise not our business.
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, RUNTIME));
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    // Content-hashed by Turbopack: the URL changes whenever the bytes do, so
    // a cache hit is always correct — including across query strings, which
    // is what makes worker bootstrapping work offline (see cacheFirst).
    event.respondWith(cacheFirst(request, PRECACHE, true));
    return;
  }

  if (isRuntimeCacheable(url.pathname)) {
    event.respondWith(cacheFirst(request, RUNTIME));
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).catch(() => Response.error()))
  );
});

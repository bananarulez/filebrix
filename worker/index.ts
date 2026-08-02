import { R2_BACKED_ENGINE_ASSETS } from "../src/lib/engineAssets";

/**
 * The entire server side of FileBrix.
 *
 * The site is a static export — ~119 prerendered pages, nothing
 * server-rendered — so Cloudflare serves almost every request straight from
 * static assets and never runs this code at all. Only two paths reach it, both
 * because of the same limit: Cloudflare rejects any individual static asset
 * over 25 MiB (`CLOUDFLARE_MAX_ASSET_BYTES` in `src/lib/engineAssets.ts`), and
 * DuckDB-WASM's two engine binaries are ~39 MB and ~34 MB.
 *
 * The alternative was `@opennextjs/cloudflare`, which bundles the whole Next
 * server into the Worker. That worked, but the bundle came to 3.98 MiB gzipped
 * against a 3 MiB limit on the Workers Free plan — 4 MB of Next server to
 * deliver files that were already static. This file is a few kilobytes and
 * removes that limit along with the 100k-requests/day one, since asset
 * requests never invoke a Worker.
 *
 * **Everything here stays same-origin, deliberately.** An R2 public bucket or
 * an `assets.filebrix.com` subdomain would each be less code — and each is a
 * different origin, which would mean widening `connect-src 'self'` in
 * `public/_headers` and weakening the tests asserting this site makes zero
 * off-origin requests. That assertion is the product's main claim, not a
 * formality.
 */

/**
 * The two bindings, typed by hand.
 *
 * `wrangler types` would generate these, and deliberately isn't used: it emits
 * either types that resolve to `any` (because `@cloudflare/workers-types`
 * isn't installed — confirmed with a probe that assigned a binding to a
 * `number` and compiled cleanly) or 550 KB of workerd runtime types that
 * redefine `Request`/`Response`/`Headers` and collide with the DOM lib the
 * rest of this repo is built against. Two bindings with three methods between
 * them aren't worth either. Same call as `src/types/shpjs.d.ts`.
 */
export interface Env {
  /** Cloudflare's static-asset handling — everything in `out/`. */
  ASSETS: { fetch(input: Request | URL | string): Promise<Response> };
  /**
   * Holds only DuckDB's two oversized binaries, under `duckdb/`. Never
   * receives user data; there is no code path that writes to it at runtime.
   */
  ENGINE_ASSETS: {
    get(key: string): Promise<{ body: ReadableStream; size: number; httpEtag: string } | null>;
  };
}

/**
 * `application/wasm` is required rather than cosmetic: DuckDB instantiates
 * through `WebAssembly.instantiateStreaming()`, which rejects any other
 * content type with an "Incorrect response MIME type" error instead of
 * falling back to a slower path.
 */
const WASM_CONTENT_TYPE = "application/wasm";

/**
 * Matches the engine-asset policy in `public/_headers`. These filenames are
 * not content-hashed, so a year + `immutable` would risk pinning a stale
 * binary after a `@duckdb/duckdb-wasm` bump; a day of hard caching plus a week
 * of stale-while-revalidate is fast on repeat visits and self-healing.
 */
const CACHE_CONTROL = "public, max-age=86400, stale-while-revalidate=604800";

/**
 * Allow-lists, not sanitizers. Every segment below is user-controlled and ends
 * up in an R2 key or an asset path, so it's matched against a known shape —
 * `..` and separators simply don't match anything.
 */
const R2_BACKED = new Set<string>(R2_BACKED_ENGINE_ASSETS);
const EXTENSION_PLATFORMS = new Set(["wasm_eh", "wasm_mvp"]);
const EXTENSION_FILE = /^[a-z0-9_]+\.duckdb_extension\.wasm$/;

/** `/duckdb/duckdb-eh.wasm` → the R2 object of the same name. */
async function serveEngineBinary(file: string, env: Env): Promise<Response> {
  if (!R2_BACKED.has(file)) return new Response("Not found", { status: 404 });

  const object = await env.ENGINE_ASSETS.get(`duckdb/${file}`);
  if (!object) {
    // Reached only if the bucket was never populated. Say so plainly: DuckDB's
    // own reaction to a missing binary is a low-level "function signature
    // mismatch" from inside the wasm module, which this project has already
    // lost real debugging time to once.
    return new Response(`${file} is missing from the ENGINE_ASSETS bucket.`, { status: 404 });
  }

  return new Response(object.body, {
    headers: {
      "Content-Type": WASM_CONTENT_TYPE,
      "Content-Length": String(object.size),
      "Cache-Control": CACHE_CONTROL,
      ETag: object.httpEtag,
    },
  });
}

/**
 * DuckDB autoloads an extension the first time a query needs one, building
 * `{custom_extension_repository}/{version}/{platform}/{name}.duckdb_extension.wasm`
 * — see `engines/parquet/index.ts`. We self-host one copy per platform and
 * ignore the version segment entirely, so upgrading `@duckdb/duckdb-wasm`
 * can't silently break this by asking for a version we never published.
 */
async function serveEngineExtension(
  segments: string[],
  request: Request,
  env: Env
): Promise<Response> {
  // [version, platform, file] — the version is read and deliberately discarded.
  const [, platform, file] = segments;
  if (!platform || !file || !EXTENSION_PLATFORMS.has(platform) || !EXTENSION_FILE.test(file)) {
    return new Response("Not found", { status: 404 });
  }

  const target = new URL(`/duckdb-ext-files/${platform}/${file}`, request.url);
  const response = await env.ASSETS.fetch(target);
  if (!response.ok) {
    return new Response(`${platform}/${file} is not a self-hosted extension.`, { status: 404 });
  }

  return new Response(response.body, {
    headers: { "Content-Type": WASM_CONTENT_TYPE, "Cache-Control": CACHE_CONTROL },
  });
}

const handler = {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== "GET" && request.method !== "HEAD") {
      // Nothing here accepts a body. This is also the structural reason no
      // endpoint on this site can receive a file: there is no handler that
      // reads one, on any method.
      return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
    }

    const { pathname } = new URL(request.url);

    // Routed here by `run_worker_first` in wrangler.jsonc — see the long note
    // there. The asset has no file extension, so Cloudflare serves it with no
    // Content-Type, and `nosniff` forbids the browser from guessing; social
    // platforms then skip it and the link preview goes blank.
    if (pathname === "/opengraph-image") {
      const image = await env.ASSETS.fetch(request);
      if (!image.ok) return image;
      return new Response(image.body, {
        headers: { "Content-Type": "image/png", "Cache-Control": CACHE_CONTROL },
      });
    }

    const segments = pathname.split("/").filter(Boolean);

    if (segments[0] === "duckdb" && segments.length === 2) {
      return serveEngineBinary(segments[1]!, env);
    }

    if (segments[0] === "duckdb-ext" && segments.length === 4) {
      return serveEngineExtension(segments.slice(1), request, env);
    }

    // Everything else. In practice this is only reached for paths that matched
    // no asset — Cloudflare answers real assets before invoking this Worker —
    // so it returns the exported 404 page via `not_found_handling`.
    return env.ASSETS.fetch(request);
  },
};

export default handler;

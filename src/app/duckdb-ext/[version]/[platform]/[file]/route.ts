import { cloudflareEnv } from "@/lib/cloudflareBindings";

/**
 * Serves DuckDB-WASM's self-hosted engine extensions, ignoring the version
 * segment DuckDB puts in the URL.
 *
 * DuckDB autoloads an extension (currently only `parquet`) the first time a
 * query needs it, by building
 * `{custom_extension_repository}/{version}/{platform}/{name}.duckdb_extension.wasm`
 * — see `engines/parquet/index.ts`. We host one copy per platform under
 * `public/duckdb-ext-files/` and deliberately don't pin the version, so
 * upgrading `@duckdb/duckdb-wasm` can't silently break this.
 *
 * This used to be a `rewrites()` entry in `next.config.ts`, which **does not
 * work on Cloudflare Workers**: static assets are served by Cloudflare before
 * the Worker ever runs, so when Next (inside the Worker) rewrites the path to
 * `/duckdb-ext-files/…`, it has no filesystem to serve that from and returns
 * 404. Confirmed against a local `wrangler dev` — DuckDB fetched the wasm
 * fine, then got a 404 for its parquet extension and the viewer never
 * rendered a row count. A route handler works in both environments because it
 * asks for the asset explicitly rather than relying on Next's own `public/`
 * handling.
 *
 * That failure mode is worth remembering: DuckDB's reaction to a blocked or
 * missing extension request is not a clean network error but a low-level
 * `RuntimeError: function signature mismatch` inside the wasm module, which
 * has already cost this project real debugging time once (see CLAUDE.md).
 */

export const dynamic = "force-dynamic";

/** The two builds `selectBundle()` can choose between; nothing else exists. */
const PLATFORMS = new Set(["wasm_eh", "wasm_mvp"]);

/**
 * Both segments are user-controlled and are spliced into an asset path, so
 * they're matched against a shape rather than sanitized — `..` and separators
 * simply don't match.
 */
const EXTENSION_FILE = /^[a-z0-9_]+\.duckdb_extension\.wasm$/;

const CACHE_CONTROL = "public, max-age=86400, stale-while-revalidate=604800";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ version: string; platform: string; file: string }> }
): Promise<Response> {
  // `version` is deliberately unused: serving our own copy whatever DuckDB
  // asks for is the entire point of this route.
  const { platform, file } = await params;

  if (!PLATFORMS.has(platform) || !EXTENSION_FILE.test(file)) {
    return new Response("Not found", { status: 404 });
  }

  const target = new URL(`/duckdb-ext-files/${platform}/${file}`, request.url);

  // On Workers the file lives in the assets binding, which the Worker can only
  // reach through `env.ASSETS`. Under `next dev`/`next start` there is no
  // binding and an ordinary same-origin fetch resolves it from `public/` —
  // that can't loop, because the target path is a real file, not a route.
  // `cloudflareEnv()` rather than `getCloudflareContext()` because the latter
  // throws off-Worker, so this fallback would never be reached.
  const assets = cloudflareEnv()?.ASSETS;
  const response = assets ? await assets.fetch(target) : await fetch(target);

  if (!response.ok) {
    return new Response(`${platform}/${file} is not a self-hosted extension.`, { status: 404 });
  }

  return new Response(response.body, {
    headers: {
      // DuckDB instantiates these through WebAssembly.instantiateStreaming(),
      // which rejects any other content type outright.
      "Content-Type": "application/wasm",
      "Cache-Control": CACHE_CONTROL,
    },
  });
}

import { cloudflareEnv } from "@/lib/cloudflareBindings";
import { R2_BACKED_ENGINE_ASSETS } from "@/lib/engineAssets";

/**
 * Serves DuckDB-WASM's two engine binaries from R2, on this site's own origin.
 *
 * Every other self-hosted engine asset (pdf.js's worker/cmaps, MapLibre's
 * worker, the DuckDB extensions, the Material Icons font) ships as an ordinary
 * static file under `public/`. These two cannot: Cloudflare caps an individual
 * static asset at 25 MiB on both the Free and Paid plans, and they are 39.4 MB
 * (`duckdb-mvp.wasm`) and 34.2 MB (`duckdb-eh.wasm`). `public/.assetsignore`
 * keeps them out of the uploaded asset manifest; this route puts them back at
 * the exact same URLs, so nothing in `engines/parquet/index.ts` had to change.
 *
 * Same-origin is the whole point. Serving them from an R2 public bucket or an
 * `assets.filebrix.com` subdomain would have been less code and is what the
 * obvious tutorial does — but both are cross-origin, which would mean widening
 * `connect-src 'self'` in `next.config.ts` and weakening the e2e test that
 * asserts this site makes zero off-origin requests. That test is a load-bearing
 * privacy guarantee, not a formality.
 *
 * In local development this route is never reached: `public/duckdb/` still
 * exists on disk (the postinstall copy script writes it) and Next's static file
 * handling answers first. Only the deployed Worker, where those files were
 * deliberately not uploaded, falls through to here.
 */

/** R2 is read per request, so this route can never be prerendered. */
export const dynamic = "force-dynamic";

/**
 * An allow-list, not a sanitizer. `[file]` is user-controlled, and handing it
 * to `bucket.get()` unchecked would turn this route into a reader for every
 * key in the bucket. Only these two objects are ever fetchable.
 */
const R2_BACKED_FILES: ReadonlySet<string> = new Set(R2_BACKED_ENGINE_ASSETS);

/**
 * `application/wasm` is required, not cosmetic: DuckDB instantiates through
 * `WebAssembly.instantiateStreaming()`, which rejects any other content type
 * with a "Incorrect response MIME type" error rather than falling back.
 */
const WASM_CONTENT_TYPE = "application/wasm";

/**
 * Matches the `Cache-Control` `next.config.ts` already applies to
 * `/duckdb/:path*` for the statically-served files in that directory — a day
 * of hard caching plus a week of stale-while-revalidate. These filenames
 * aren't content-hashed, so a year + `immutable` would risk pinning a stale
 * binary after a `@duckdb/duckdb-wasm` version bump.
 *
 * It also keeps R2 reads near zero: Cloudflare's cache answers the repeat
 * requests, so the free tier's operation allowance is never the constraint.
 */
const CACHE_CONTROL = "public, max-age=86400, stale-while-revalidate=604800";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string }> }
): Promise<Response> {
  const { file } = await params;

  if (!R2_BACKED_FILES.has(file)) {
    return new Response("Not found", { status: 404 });
  }

  // `cloudflareEnv()` rather than `getCloudflareContext()`, which throws
  // off-Worker instead of returning an empty context — this route is normally
  // unreachable outside one, but a 500 stack trace would be a poor way to
  // find that out.
  const bucket = cloudflareEnv()?.ENGINE_ASSETS;
  if (!bucket) {
    // The binding is declared in wrangler.jsonc, so on a real deployment this
    // means a bucket that was never created. Say so plainly — the alternative
    // is a "function signature mismatch" from deep inside the wasm module,
    // which this project has already lost real debugging time to once.
    return new Response("The ENGINE_ASSETS R2 bucket is not bound to this deployment.", {
      status: 503,
    });
  }

  const object = await bucket.get(`duckdb/${file}`);
  if (!object) {
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

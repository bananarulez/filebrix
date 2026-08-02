/**
 * The Cloudflare bindings this app uses, declared by hand.
 *
 * `@opennextjs/cloudflare` types `getCloudflareContext().env` as the global
 * `CloudflareEnv` interface and merges whatever is declared here into it.
 *
 * `npx wrangler types` can generate this, and deliberately isn't used: it emits
 * either an interface whose `R2Bucket` resolves to `any` (because
 * `@cloudflare/workers-types` isn't installed — confirmed, a probe assigning
 * the binding to a `number` compiled cleanly), or 550 KB of workerd runtime
 * types that redefine `Request`/`Response`/`Headers` and would collide with the
 * DOM lib this app is built against. One binding with one method called on it
 * isn't worth either. Same reasoning as `src/types/shpjs.d.ts`.
 *
 * Regenerate nothing — if a binding is added to `wrangler.jsonc`, add it here.
 */
interface CloudflareEnv {
  /**
   * Holds DuckDB-WASM's two engine binaries, the only files in this project
   * over Cloudflare's 25 MiB static-asset limit. Optional because a deployment
   * whose bucket was never created still type-checks, and `app/duckdb/[file]/
   * route.ts` turns that case into a readable 503 rather than a crash.
   *
   * Never holds user data. See wrangler.jsonc for why it exists at all.
   */
  ENGINE_ASSETS?: {
    get(key: string): Promise<R2ObjectBody | null>;
  };

  /**
   * Cloudflare's static-asset handling. It answers most requests *before* the
   * Worker runs, so the Worker itself can only reach an asset through this
   * binding — which is why `app/duckdb-ext/[version]/[platform]/[file]/route.ts`
   * exists at all (a Next `rewrites()` entry to a `public/` file 404s here).
   *
   * Optional for the same reason as above: under `next dev`/`next start` there
   * is no binding, and that route falls back to an ordinary same-origin fetch.
   */
  ASSETS?: {
    fetch(input: Request | URL | string): Promise<Response>;
  };
}

/** Only the members `app/duckdb/[file]/route.ts` actually reads. */
interface R2ObjectBody {
  body: ReadableStream;
  size: number;
  httpEtag: string;
}

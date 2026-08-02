/**
 * The engine assets that cannot ship as Cloudflare static assets.
 *
 * Cloudflare rejects any individual static asset over 25 MiB, on the Free and
 * Paid plans alike (`MAX_ASSET_SIZE = 25 * 1024 * 1024` in wrangler's own
 * source, not just its docs). DuckDB-WASM's two engine binaries are the only
 * files this project ships that exceed it, so they're uploaded to R2 and served
 * back on the same origin by `app/duckdb/[file]/route.ts`.
 *
 * Three separate things have to agree about exactly this list — the sizes on
 * disk, the patterns in `public/.assetsignore`, and the route's allow-list —
 * and nothing in the type system connects them. `tests/unit/engineAssets.test.ts`
 * is what connects them: it fails if a dependency bump pushes a third file over
 * the limit, or if this list and the ignore file drift apart. Without it the
 * first sign of trouble is a rejected deploy.
 */
export const CLOUDFLARE_MAX_ASSET_BYTES = 25 * 1024 * 1024;

/** Filenames under `public/duckdb/`, served from R2 rather than as assets. */
export const R2_BACKED_ENGINE_ASSETS = ["duckdb-mvp.wasm", "duckdb-eh.wasm"] as const;

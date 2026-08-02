import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * The Cloudflare bindings, or `undefined` when there aren't any.
 *
 * `getCloudflareContext()` **throws** outside a Worker rather than returning
 * an empty context: `next start` (and `next dev`) get
 * "`getCloudflareContext` has been called without having called
 * `initOpenNextCloudflareForDev`". A route that reads a binding and falls back
 * when it's absent therefore has to catch, not null-check — the naive version
 * never reaches its own fallback and 500s instead, which is exactly how the
 * DuckDB extension route failed its first full Playwright run.
 *
 * The adapter's own answer is to call `initOpenNextCloudflareForDev()` from
 * `next.config.ts`, which starts a local Miniflare so bindings exist in
 * development too. That's deliberately not done here: the only two bindings
 * this app has are a bucket of prebuilt binaries and Cloudflare's asset
 * handler, both of which have a perfectly good local equivalent (`public/`),
 * and paying Miniflare's startup cost on every `npm run dev` to simulate them
 * would be worse than the four lines below.
 */
export function cloudflareEnv(): CloudflareEnv | undefined {
  try {
    return getCloudflareContext().env;
  } catch {
    return undefined;
  }
}

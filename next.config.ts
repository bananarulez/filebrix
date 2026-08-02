import type { NextConfig } from "next";

/**
 * This app is a **static export**. Every one of its ~119 routes is prerendered
 * and nothing is server-rendered, so there is no runtime server at all: the
 * build emits `out/`, which is uploaded to Cloudflare as static assets and
 * served without invoking a Worker.
 *
 * That is why this file is almost empty, and the emptiness is deliberate:
 *
 * - **`headers()` is not supported in export mode.** The Content-Security-
 *   Policy — the site's main technical guarantee, `connect-src 'self'` being
 *   what makes "files never leave your device" true by construction — and the
 *   cache policy for self-hosted engine assets both live in `public/_headers`.
 * - **`redirects()` is not supported either.** The permanent
 *   `/pdf-tools` → `/pdf-studio` moves and their siblings live in
 *   `public/_redirects`.
 * - **`rewrites()` is not supported, and wouldn't have survived deployment
 *   anyway** — a rewrite to a `public/` file 404s on Cloudflare, since assets
 *   are served before any code runs. DuckDB's extension autoload is handled by
 *   `worker/index.ts` instead.
 *
 * Do not add `headers`, `redirects` or `rewrites` here expecting them to work.
 * `next build` does not warn about them in export mode — it silently drops
 * them, which is how a weakened CSP would ship unnoticed. Everything that used
 * to be here is in those two files, and `tests/e2e/deploy-headers.spec.ts`
 * checks the result against a real Worker.
 */
const nextConfig: NextConfig = {
  output: "export",
};

export default nextConfig;

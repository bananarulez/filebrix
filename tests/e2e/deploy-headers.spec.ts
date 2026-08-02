import { expect, test } from "@playwright/test";

/**
 * The deployment layer: headers, redirects and the two Worker-served paths.
 *
 * None of this was testable before. Under `@opennextjs/cloudflare` the suite
 * ran against `next start`, where `public/` is served by Next itself — so
 * `next.config.ts`'s `headers()` and `redirects()` appeared to work locally
 * while two of them were broken in production (PROJECT_LOG.md entry 44). The
 * suite now runs against `wrangler dev`, which serves the actual deployed
 * artifact: `out/`, `public/_headers`, `public/_redirects` and `worker/`.
 *
 * Everything here would pass trivially against a Next dev server and means
 * something only because of that. Keep it that way.
 */

test.describe("Security headers", () => {
  test("every page carries the CSP that makes the privacy claim true", async ({ request }) => {
    const response = await request.get("/pdf-studio");
    expect(response.status()).toBe(200);

    const csp = response.headers()["content-security-policy"];
    expect(csp, "no CSP at all — public/_headers is not being applied").toBeTruthy();

    // connect-src 'self' is the load-bearing directive: it's what stops a bug
    // from being able to send a file's contents anywhere. The tile host is the
    // one documented exception (README.txt §17, PRIVACY_ARCHITECTURE.md §1).
    expect(csp).toContain("connect-src 'self' https://*.basemaps.cartocdn.com");
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");

    // Engines call WebAssembly.instantiate(), which needs this and only this —
    // it must never be widened to full 'unsafe-eval'.
    expect(csp).toContain("'wasm-unsafe-eval'");
    expect(csp).not.toContain("'unsafe-eval';");
    expect(csp.includes(" 'unsafe-eval'")).toBe(false);

    expect(response.headers()["x-content-type-options"]).toBe("nosniff");
    expect(response.headers()["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  });

  test("content-hashed chunks are cached for a year, unhashed engine assets are not", async ({
    page,
    request,
  }) => {
    await page.goto("/");
    const chunk = await page
      .locator('script[src*="/_next/static/chunks/"]')
      .first()
      .getAttribute("src");
    expect(chunk).toBeTruthy();

    // Safe only because the filename changes with the bytes.
    expect((await request.get(chunk!)).headers()["cache-control"]).toContain("immutable");

    // Engine asset filenames are stable across versions, so `immutable` here
    // would pin a stale worker after a dependency bump.
    const engineAsset = await request.get("/duckdb/duckdb-browser-eh.worker.js");
    expect(engineAsset.status()).toBe(200);
    const engineCache = engineAsset.headers()["cache-control"];
    expect(engineCache).toContain("stale-while-revalidate");
    expect(engineCache).not.toContain("immutable");
  });

  test("the OpenGraph image is served as an image", async ({ request }) => {
    // It has no file extension, so Cloudflare sends no Content-Type and
    // `nosniff` forbids guessing — the preview breaks silently. `_headers`
    // cannot fix it (Content-Type is disallowed there and invalidates the
    // whole block), so worker/index.ts handles it via `run_worker_first`.
    const response = await request.get("/opengraph-image");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toBe("image/png");

    // Really the PNG, not an HTML error page relabelled.
    expect((await response.body()).subarray(1, 4).toString()).toBe("PNG");
  });
});

test.describe("Permanent redirects", () => {
  // Each of these is an indexed URL that moved. A redirect that stops working
  // doesn't 404 loudly — it quietly stops transferring the ranking it exists
  // to transfer.
  const moved: [string, string][] = [
    ["/pdf-tools", "/pdf-studio"],
    ["/pdf-tools/pages", "/pdf-studio/pages"],
    ["/image-tools", "/image-studio"],
    ["/image-tools/convert", "/image-studio/convert"],
    ["/geospatial-tools", "/geospatial-studio"],
    ["/geospatial-tools/convert", "/geospatial-studio/convert"],
    ["/spreadsheet-tools", "/data-studio"],
    ["/data-tools", "/data-studio"],
    ["/developer-tools/json", "/data-studio"],
  ];

  for (const [from, to] of moved) {
    test(`${from} permanently redirects to ${to}`, async ({ request }) => {
      const response = await request.get(from, { maxRedirects: 0 });
      expect(response.status(), `${from} did not redirect`).toBe(301);
      expect(new URL(response.headers()["location"], "http://localhost").pathname).toBe(to);
    });
  }

  test("a tool URL is not caught by the Studio redirects", async ({ request }) => {
    // Individual tool URLs never lived under those prefixes. A too-greedy
    // splat would silently redirect all of them.
    const response = await request.get("/pdf/merge", { maxRedirects: 0 });
    expect(response.status()).toBe(200);
  });
});

test.describe("Worker-served engine assets", () => {
  test("DuckDB's oversized binary comes back from R2 as real wasm", async ({ request }) => {
    // Over Cloudflare's 25 MiB asset limit, so it is not in `out/` at all —
    // a 200 here proves the Worker's R2 path, not a static file.
    const response = await request.get("/duckdb/duckdb-eh.wasm", {
      headers: { Range: "bytes=0-7" },
    });
    expect(response.status()).toBeLessThan(400);
    expect(response.headers()["content-type"]).toBe("application/wasm");

    // \0asm — the WebAssembly magic number. instantiateStreaming() rejects
    // anything whose Content-Type isn't application/wasm, so both halves of
    // this assertion matter.
    const magic = (await response.body()).subarray(0, 4);
    expect([...magic]).toEqual([0x00, 0x61, 0x73, 0x6d]);
  });

  test("DuckDB's extension autoload resolves whatever version it asks for", async ({ request }) => {
    // The version segment is deliberately ignored, so upgrading
    // @duckdb/duckdb-wasm can't break this by requesting a version we never
    // published. This used to be a next.config.ts rewrite, which 404s on
    // Workers and broke Parquet Viewer outright.
    for (const version of ["v1.4.3", "v99.0.0"]) {
      const response = await request.get(
        `/duckdb-ext/${version}/wasm_eh/parquet.duckdb_extension.wasm`
      );
      expect(response.status(), `version ${version} was not served`).toBe(200);
      expect(response.headers()["content-type"]).toBe("application/wasm");
    }
  });

  test("the Worker's allow-lists reject anything else", async ({ request }) => {
    // Both routes splice a user-controlled segment into an R2 key or an asset
    // path, so they match against a known shape rather than sanitizing.
    for (const path of [
      "/duckdb/anything-else.wasm",
      "/duckdb-ext/v1/wasm_eh/evil.wasm",
      "/duckdb-ext/v1/not-a-platform/parquet.duckdb_extension.wasm",
    ]) {
      expect((await request.get(path)).status(), `${path} was served`).toBe(404);
    }
  });
});

import { expect, test } from "@playwright/test";

// Regression test for the 2026-07-25 performance audit's one concrete fix:
// self-hosted engine assets (pdf.js worker/cmaps, DuckDB-WASM binaries, its
// parquet extension) were being served with Next's default `max-age=0` for
// arbitrary public files, forcing a full revalidation on every visit despite
// being large, version-pinned binaries that only change on a dependency
// bump. next.config.ts now sets an explicit day-long cache with a week of
// stale-while-revalidate for these three asset paths.
test.describe("Performance audit regressions", () => {
  test("self-hosted engine assets are served with a real Cache-Control, not max-age=0", async ({ request }) => {
    const assets = [
      "/pdfjs/pdf.worker.min.mjs",
      "/duckdb/duckdb-mvp.wasm",
      "/duckdb-ext-files/wasm_eh/parquet.duckdb_extension.wasm",
    ];
    for (const url of assets) {
      const response = await request.get(url);
      expect(response.status(), url).toBe(200);
      const cacheControl = response.headers()["cache-control"];
      expect(cacheControl, url).toBe("public, max-age=86400, stale-while-revalidate=604800");
    }
  });

  test("the CSP header is still applied on a route that gets a special Cache-Control header", async ({ request }) => {
    const response = await request.get("/pdfjs/pdf.worker.min.mjs");
    expect(response.headers()["content-security-policy"]).toContain("default-src 'self'");
  });
});

import type { NextConfig } from "next";

// Defense in depth for the "files never leave the browser" guarantee:
// connect-src 'self' means even a bug that tried to fetch() a file's
// contents somewhere would be blocked by the browser itself.
// 'unsafe-eval' is only added in dev — React's dev-mode debugging uses
// eval() for stack reconstruction; production React never needs it.
// 'wasm-unsafe-eval' is needed in both — engines like DuckDB-WASM call
// WebAssembly.instantiate(); it does not grant JS eval(), and connect-src
// stays 'self'-only (self-hosted engine assets — see scripts/copy-duckdb-assets.mjs).
//
// The Geospatial engine is the one deliberate exception to connect-src
// 'self': README.txt §17 explicitly allows fetching basemap *tile images*
// from a third-party host, as long as no user geometry/coordinates/
// properties are ever sent there (see engines/geospatial/map/style.ts —
// MapLibre only ever requests tile z/x/y; all user data is added as a
// local GeoJSON source rendered client-side, never serialized into a
// request). img-src also needs it for the tile images themselves.
const BASEMAP_TILE_ORIGIN = "https://*.basemaps.cartocdn.com";
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${BASEMAP_TILE_ORIGIN}`,
  "font-src 'self' data:",
  `connect-src 'self' ${BASEMAP_TILE_ORIGIN}`,
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
].join("; ");

// Self-hosted engine assets (DuckDB-WASM's .wasm/worker/extensions, pdf.js's
// worker/cmaps/standard-fonts/wasm/icc) live under /public and are served
// with Next's default `max-age=0` for arbitrary public files — confirmed by
// curling a running server, not assumed — meaning the browser revalidates
// every one of these on every single visit, even though they're multi-KB-
// to-multi-MB binaries that only change when a dependency version bump
// re-runs their copy script (scripts/copy-*-assets.mjs). Unlike Next's own
// `/_next/static/*` chunks, these filenames aren't content-hashed, so a
// full year + `immutable` would risk serving a stale worker/wasm after a
// version bump until that cache expired. A day of hard caching plus a week
// of stale-while-revalidate is the safer middle ground: fast on every
// repeat visit within a session, self-healing within days if the assets
// ever change, never stuck stale for a year.
const ENGINE_ASSET_CACHE_HEADERS = [
  { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      { source: "/pdfjs/:path*", headers: ENGINE_ASSET_CACHE_HEADERS },
      { source: "/duckdb/:path*", headers: ENGINE_ASSET_CACHE_HEADERS },
      { source: "/duckdb-ext-files/:path*", headers: ENGINE_ASSET_CACHE_HEADERS },
    ];
  },
  async rewrites() {
    return [
      {
        // DuckDB-WASM autoloads engine extensions (e.g. parquet) by
        // constructing /:version/:platform/:name.duckdb_extension.wasm
        // against whatever `custom_extension_repository` is configured to
        // (see engines/parquet/index.ts). We self-host these (see
        // scripts/fetch-duckdb-extensions.mjs) and ignore the version
        // segment entirely, so upgrading @duckdb/duckdb-wasm never breaks
        // this rewrite — it always serves our own copy.
        source: "/duckdb-ext/:version/:platform/:name.duckdb_extension.wasm",
        destination: "/duckdb-ext-files/:platform/:name.duckdb_extension.wasm",
      },
    ];
  },
  async redirects() {
    return [
      {
        // /spreadsheet-tools was the Spreadsheet & Data app's URL before
        // Parquet was unified into it as Data Studio (see app/data-studio/
        // page.tsx). Permanent so search engines transfer ranking to the
        // new URL rather than indexing both.
        source: "/spreadsheet-tools",
        destination: "/data-studio",
        permanent: true,
      },
      {
        // /data-tools was a plain link-list category page whose only tool was
        // Parquet Viewer — now that Data Studio (app/data-studio/page.tsx)
        // handles Parquet directly, there's no separate "analytical data"
        // category left to justify its own page. Parquet Viewer itself keeps
        // its own URL (/tools/parquet-viewer) unaffected.
        source: "/data-tools",
        destination: "/data-studio",
        permanent: true,
      },
      {
        // /developer-tools/json was Developer Toolkit's JSON/XML/YAML
        // formatting/validation/conversion sub-category page — those 9
        // tools moved to Data Studio (their implementation was always
        // powered by engines/spreadsheet/, never engines/developer/), so
        // the sub-category itself was retired. Same reasoning and
        // destination as /spreadsheet-tools and /data-tools above.
        source: "/developer-tools/json",
        destination: "/data-studio",
        permanent: true,
      },
      /*
       * The three "-tools" Application slugs were renamed to "-studio" so
       * every Studio's URL matches its display name, the way /data-studio
       * always did. Each pair below covers the Application page itself and
       * every capability index page under it (`/pdf-tools/pages` ->
       * `/pdf-studio/pages`); `:path*` is written as a second rule rather
       * than relied on to also match the bare path, so the Application page
       * can't silently stop redirecting if that matcher's zero-segment
       * behaviour ever changes. Individual tool URLs (/pdf/merge,
       * /convert/png-to-jpg, /geo/geojson-viewer, ...) never lived under
       * these prefixes and are unaffected.
       */
      { source: "/pdf-tools", destination: "/pdf-studio", permanent: true },
      { source: "/pdf-tools/:path*", destination: "/pdf-studio/:path*", permanent: true },
      { source: "/image-tools", destination: "/image-studio", permanent: true },
      { source: "/image-tools/:path*", destination: "/image-studio/:path*", permanent: true },
      { source: "/geospatial-tools", destination: "/geospatial-studio", permanent: true },
      {
        source: "/geospatial-tools/:path*",
        destination: "/geospatial-studio/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;

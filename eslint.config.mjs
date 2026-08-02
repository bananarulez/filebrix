import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Cloudflare Workers build output (@opennextjs/cloudflare) — a bundled
    // copy of the Next server plus every static asset. Not ignoring it doesn't
    // just add noise: linting the bundled worker exhausts Node's 4 GB heap and
    // `npm run lint` dies with "Ineffective mark-compacts near heap limit".
    ".open-next/**",
    ".wrangler/**",
    // Self-hosted, prebuilt DuckDB-WASM engine assets — not our code.
    "public/duckdb/**",
    // Self-hosted, prebuilt pdf.js worker/cmaps/fonts/wasm — not our code.
    "public/pdfjs/**",
    // Self-hosted, prebuilt maplibre-gl worker script — not our code.
    "public/maplibre/**",
  ]),
]);

export default eslintConfig;

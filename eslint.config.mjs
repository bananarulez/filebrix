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
    // Self-hosted, prebuilt DuckDB-WASM engine assets — not our code.
    "public/duckdb/**",
    // Self-hosted, prebuilt pdf.js worker/cmaps/fonts/wasm — not our code.
    "public/pdfjs/**",
    // Self-hosted, prebuilt maplibre-gl worker script — not our code.
    "public/maplibre/**",
    // Generated from scripts/sw-template.js on every build — lint the
    // template (which is linted, being under scripts/), not its output.
    "public/sw.js",
  ]),
]);

export default eslintConfig;

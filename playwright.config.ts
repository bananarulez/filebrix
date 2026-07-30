import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  // Each worker launches its own browser instance, and several of them
  // compiling/instantiating the ~35MB DuckDB-WASM module at once can starve
  // each other badly enough to blow past any reasonable per-test timeout.
  // A small fixed worker count is far more stable than the CPU-count-based
  // default here. Pinned to 1: this machine has hard-crashed (ungraceful
  // power-cycle, no BSOD dump — consistent with a thermal/power cutoff, not
  // a software issue) during full e2e runs, and running only one Chromium
  // instance at a time alongside the `next build` in webServer meaningfully
  // lowers peak sustained CPU/GPU load.
  //
  // DO NOT RAISE THIS. It is a hardware constraint on the development
  // machine, not a performance oversight — a higher value here doesn't make
  // the suite faster, it power-cycles the machine mid-run (PROJECT_LOG.md
  // entry 15). CI runners don't share that constraint, so the higher worker
  // count lives in .github/workflows/ci.yml, which passes `--workers` on the
  // command line (a CLI flag overrides this value). That's deliberately not a
  // `process.env.CI` branch here: keeping the only literal in this file at 1
  // means no future edit to a CI-only number can ever change what runs
  // locally.
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
  },
  webServer: {
    // Built + started, not `next dev`: the dev server compiles each route on
    // first request, and several Playwright workers hitting the same
    // uncompiled route concurrently can stall past any reasonable timeout.
    // A production build serves pre-compiled routes, which is also what e2e
    // tests should be exercising anyway.
    command: "npm run build && npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});

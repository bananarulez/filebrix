import { defineConfig, devices } from "@playwright/test";

/**
 * Tag marking the small set of assertions whose correctness depends on the
 * *browser engine's own* behavior rather than on our code: EXIF
 * auto-orientation, transparent-PNG compositing, SVG script execution, and
 * WebGL map rendering. Declared once here and grep'd by the firefox/webkit
 * projects below, so the subset can't drift out of sync with a hand-kept
 * list of file paths.
 *
 * Deliberately tiny. Everything else in the suite exercises our own logic,
 * which a second browser re-verifies at real cost (see `workers` below) and
 * near-zero information gain.
 */
const CROSS_BROWSER_TAG = "@cross-browser";

/**
 * WebKit runs in CI, not on the development machine — its Playwright build
 * ships a `Playwright.exe` that this developer's antivirus quarantines on
 * sight, so `playwright install webkit` reports success and then the binary
 * is gone by the time a test launches it (confirmed: the download completed,
 * `INSTALLATION_COMPLETE` was written, and the executable was missing). That
 * is a local endpoint-security policy, not a statement about WebKit, so the
 * project is simply skipped where it can't run rather than dropped.
 *
 * Ubuntu CI runners have no such interference, so `CI` opts back in. Set
 * PLAYWRIGHT_WEBKIT=1 to force it locally (e.g. after adding an AV exclusion
 * for %LOCALAPPDATA%\ms-playwright).
 */
const RUN_WEBKIT = Boolean(process.env.CI || process.env.PLAYWRIGHT_WEBKIT);

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
  // Three projects, ONE worker. Playwright's `workers` is a global cap
  // across all projects, not a per-project one, so these run strictly one
  // after another — adding Firefox and WebKit adds runtime, never a second
  // concurrent browser instance. That distinction is the whole reason this
  // is safe on the machine described above; do not "parallelize across
  // browsers" by raising `workers`. If the total runtime ever becomes
  // uncomfortable, shrink the tagged subset instead.
  projects: [
    // The full suite, as before this file gained projects at all.
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    // Only the engine-behavior subset. `grep` takes the tag from the single
    // constant above rather than a duplicated regex literal per project.
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
      grep: new RegExp(CROSS_BROWSER_TAG),
    },
    ...(RUN_WEBKIT
      ? [
          {
            name: "webkit",
            use: { ...devices["Desktop Safari"] },
            grep: new RegExp(CROSS_BROWSER_TAG),
          },
        ]
      : []),
  ],
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

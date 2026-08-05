/**
 * Refuses a production deploy that would bake the wrong site URL into every
 * page.
 *
 * `lib/seo/metadata.ts` reads `NEXT_PUBLIC_SITE_URL` at *build* time and falls
 * back to `http://localhost:3000` when it's missing. Nothing warns: the build
 * succeeds, the deploy succeeds, and the live site serves canonical tags,
 * OpenGraph URLs, a sitemap and a robots.txt `Sitemap:` line all pointing at
 * localhost. That shipped once (PROJECT_LOG entry 52) despite the warning
 * being written in both CLAUDE.md and .env.example — a warning in prose loses
 * to a habit, so this is the same warning as an exit code.
 *
 * Deliberately gates `cf:deploy` only, not `build`. The verification suite
 * builds with a deliberately fake origin, and `cf:preview` runs locally where
 * the localhost fallback is exactly right.
 *
 * A separate script rather than a shell test in the npm script, because npm
 * runs scripts through cmd.exe on Windows, where `[ -z "$VAR" ]` is not a
 * test but a syntax error that still exits 0.
 */

const RAW = process.env.NEXT_PUBLIC_SITE_URL;

function fail(problem, detail) {
  console.error(`\n  Refusing to deploy: ${problem}\n`);
  console.error(`  ${detail}\n`);
  console.error("  Deploy with it set, for example:\n");
  console.error("      NEXT_PUBLIC_SITE_URL=https://filebrix.com npm run cf:deploy\n");
  console.error("  It is read at build time, so setting it afterwards changes nothing.\n");
  process.exit(1);
}

if (!RAW || RAW.trim() === "") {
  fail(
    "NEXT_PUBLIC_SITE_URL is not set.",
    "Every canonical URL, OpenGraph URL, sitemap entry and the robots.txt\n  Sitemap: line would silently be built against http://localhost:3000."
  );
}

let parsed;
try {
  parsed = new URL(RAW);
} catch {
  fail(`NEXT_PUBLIC_SITE_URL is not a valid absolute URL: ${RAW}`, "It needs a scheme and a host, e.g. https://filebrix.com.");
}

if (parsed.protocol !== "https:") {
  fail(
    `NEXT_PUBLIC_SITE_URL is not https: ${RAW}`,
    "The deployed site is served over HTTPS, and these URLs are what search\n  engines index — an http:// canonical points somewhere that redirects."
  );
}

// The two values that are *syntactically* fine and always wrong in a deploy:
// the build-time fallback, and the placeholder the docs and test suite use.
const PLACEHOLDER_HOSTS = ["localhost", "127.0.0.1", "example.com", "www.example.com"];
if (PLACEHOLDER_HOSTS.includes(parsed.hostname)) {
  fail(
    `NEXT_PUBLIC_SITE_URL points at a placeholder host: ${RAW}`,
    "That's the value the docs and the verification build use on purpose.\n  A deploy needs the real origin."
  );
}

if (RAW.endsWith("/")) {
  fail(
    `NEXT_PUBLIC_SITE_URL has a trailing slash: ${RAW}`,
    "Paths are appended directly to it, so every URL would contain a double\n  slash (https://filebrix.com//about)."
  );
}

console.log(`  Site URL for this build: ${RAW}`);

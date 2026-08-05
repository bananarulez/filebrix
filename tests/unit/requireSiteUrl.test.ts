import { execFileSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";
import packageJson from "../../package.json";

/**
 * The deploy guard (`scripts/require-site-url.mjs`).
 *
 * `lib/seo/metadata.ts` reads `NEXT_PUBLIC_SITE_URL` at build time and falls
 * back to `http://localhost:3000`, silently — which once put localhost
 * canonical tags and a localhost sitemap on the live site (PROJECT_LOG entry
 * 52). The guard turns that warning into an exit code.
 *
 * Run as a real subprocess rather than by importing it: the script's whole
 * contract is its exit status, and `process.exit` inside a Vitest worker
 * would take the worker with it.
 */
const SCRIPT = path.join(__dirname, "..", "..", "scripts", "require-site-url.mjs");

function run(siteUrl: string | undefined): { code: number; output: string } {
  // Inherited env minus the variable, so a shell that happens to export it
  // can't make a "missing" case pass.
  const env = { ...process.env };
  delete env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl !== undefined) env.NEXT_PUBLIC_SITE_URL = siteUrl;

  try {
    const stdout = execFileSync(process.execPath, [SCRIPT], { env, encoding: "utf8" });
    return { code: 0, output: stdout };
  } catch (error) {
    const failure = error as { status?: number; stderr?: string; stdout?: string };
    return { code: failure.status ?? 1, output: `${failure.stdout ?? ""}${failure.stderr ?? ""}` };
  }
}

describe("deploy site-URL guard", () => {
  it("accepts a real https origin", () => {
    const { code, output } = run("https://filebrix.com");
    expect(code).toBe(0);
    expect(output).toContain("https://filebrix.com");
  });

  it.each([
    ["unset", undefined, /is not set/],
    ["empty", "", /is not set/],
    // The exact value the missing-variable fallback produces — the one that
    // actually shipped.
    ["the localhost fallback", "http://localhost:3000", /not https/],
    ["any plain http origin", "http://filebrix.com", /not https/],
    ["the docs' placeholder", "https://example.com", /placeholder host/],
    ["a bare hostname", "filebrix.com", /not a valid absolute URL/],
    // Paths are concatenated straight onto it, so this yields
    // https://filebrix.com//about on every page.
    ["a trailing slash", "https://filebrix.com/", /trailing slash/],
  ])("refuses %s", (_label, value, expectedMessage) => {
    const { code, output } = run(value);
    expect(code).toBe(1);
    expect(output).toMatch(expectedMessage);
  });

  it("is wired into cf:deploy, ahead of the build", () => {
    // A guard nothing calls is decoration. It must also come *first*: after
    // `next build` it would still be ahead of `wrangler deploy`, but only
    // after paying for a build that can't be shipped.
    const deploy = packageJson.scripts["cf:deploy"];
    expect(deploy).toContain("scripts/require-site-url.mjs");
    expect(deploy.indexOf("require-site-url")).toBeLessThan(deploy.indexOf("next build"));
  });

  it("does not gate the plain build, which the verification suite runs with a fake origin", () => {
    // `npm run build` is step 4 of the documented verification suite and uses
    // https://example.com on purpose; gating it would break that.
    expect(packageJson.scripts.build).not.toContain("require-site-url");
    expect(packageJson.scripts["cf:preview"]).not.toContain("require-site-url");
  });
});

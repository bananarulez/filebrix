import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const OUT = path.resolve(__dirname, "..", "..", "out");

/**
 * Every internal URL inside a page's JSON-LD must resolve to a real page.
 *
 * This exists because two of them didn't, and shipped. `ContentPageLayout`
 * derived its breadcrumb href from the page *title* — fine for "About", wrong
 * for "Privacy Policy" (`/privacy-policy`) and "Terms of Service"
 * (`/terms-of-service`), neither of which exists. Both pages handed Google a
 * `BreadcrumbList` whose final URL 404s, confirmed against the live site.
 *
 * Nothing caught it. The visible trail renders the *title*, so it looked
 * correct; `tsc` and lint can't see a string; and a crawl of `<a href>`
 * attributes — which is what the audit that eventually found this was
 * originally doing — never inspects structured data at all. Only comparing
 * the machine-readable URLs against the set of pages that exist finds it.
 *
 * `out/` is a build artifact, so this skips when it hasn't been generated.
 */

/** Every built page, as the URL path a browser would request. */
function builtPages(dir = OUT, pages = new Set<string>()): Set<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      builtPages(full, pages);
    } else if (entry.name.endsWith(".html")) {
      const rel = path.relative(OUT, full).split(path.sep).join("/");
      pages.add(rel === "index.html" ? "/" : "/" + rel.replace(/\.html$/, ""));
    }
  }
  return pages;
}

/** Every string in a JSON-LD block that looks like one of our own URLs. */
function internalUrls(html: string, origin: string): string[] {
  const found: string[] = [];
  const walk = (node: unknown) => {
    if (typeof node === "string") {
      if (node.startsWith(origin)) found.push(node.slice(origin.length) || "/");
    } else if (Array.isArray(node)) {
      node.forEach(walk);
    } else if (node && typeof node === "object") {
      Object.values(node).forEach(walk);
    }
  };

  for (const match of html.matchAll(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g
  )) {
    walk(JSON.parse(match[1]!));
  }
  return found;
}

describe("structured data", () => {
  const built = existsSync(OUT);

  it.skipIf(!built)("never points at a URL that doesn't exist", () => {
    const pages = builtPages();
    // The exported build uses the localhost fallback for NEXT_PUBLIC_SITE_URL
    // unless one was set, so read the origin off a page rather than assuming.
    const home = readFileSync(path.join(OUT, "index.html"), "utf8");
    const origin = home.match(/<link rel="canonical" href="(https?:\/\/[^/"]+)/)?.[1];
    expect(origin, "no canonical on the homepage to read the origin from").toBeTruthy();

    const broken: string[] = [];
    const check = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          check(full);
        } else if (entry.name.endsWith(".html")) {
          const relative = path.relative(OUT, full).split(path.sep).join("/");
          for (const url of internalUrls(readFileSync(full, "utf8"), origin!)) {
            // Trailing-slash forms and the bare origin both resolve.
            const normalized = url.length > 1 && url.endsWith("/") ? url.slice(0, -1) : url;
            if (!pages.has(normalized)) broken.push(`${relative}: ${normalized}`);
          }
        }
      }
    };
    check(OUT);

    expect(broken, `JSON-LD referencing pages that don't exist:\n${broken.join("\n")}`).toEqual([]);
  });
});

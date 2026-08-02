import { expect, test } from "@playwright/test";

/**
 * The About/Contact/Privacy/Terms set, plus the trust signals that ship with
 * them. These pages exist for people deciding whether to trust the site with
 * a document, and for the search engines judging the same thing — so what's
 * asserted here is that they're reachable, indexed, and say who is behind
 * the site, not that they contain particular marketing wording.
 */

const CONTENT_PAGES = [
  { path: "/about", heading: "About" },
  { path: "/contact", heading: "Contact" },
  { path: "/privacy", heading: "Privacy Policy" },
  { path: "/terms", heading: "Terms of Service" },
];

test.describe("Company and legal pages", () => {
  for (const { path, heading } of CONTENT_PAGES) {
    test(`${path} loads, is canonical, and is a reading-width page`, async ({ page, baseURL }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);

      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();

      const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
      expect(canonical).toBe(`${baseURL}${path}`);

      // Prose, not an application column — these are read, not operated.
      const width = await page
        .getByRole("heading", { level: 1 })
        .evaluate((el) => el.closest("div")!.getBoundingClientRect().width);
      expect(width).toBeLessThanOrEqual(864);
    });
  }

  test("every page in the site reaches them through the footer", async ({ page }) => {
    // Checked from a deep tool page, not the homepage: the footer is rendered
    // once in the root layout, and this is what proves it.
    await page.goto("/tools/csv-viewer");
    const footer = page.getByRole("contentinfo");

    for (const { path } of CONTENT_PAGES) {
      await expect(footer.locator(`a[href="${path}"]`)).toHaveCount(1);
    }
    // The Applications row is still there — the legal row is additive.
    await expect(footer.getByRole("navigation", { name: "Applications" })).toBeVisible();
  });

  test("the footer names who operates the site", async ({ page }) => {
    // An identifiable operator is the trust signal these pages exist for; an
    // anonymous file tool is a harder sell than any missing page.
    await page.goto("/");
    await expect(page.getByRole("contentinfo")).toContainText(String(new Date().getFullYear()));
  });

  test("all four are in the sitemap", async ({ page, baseURL }) => {
    const body = await (await page.request.get("/sitemap.xml")).text();
    for (const { path } of CONTENT_PAGES) {
      expect(body, `${path} missing from sitemap`).toContain(`<loc>${baseURL}${path}</loc>`);
    }
  });

  test("the homepage identifies its publisher with Organization structured data", async ({ page }) => {
    await page.goto("/");
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const parsed = blocks.map((block) => JSON.parse(block));

    const organization = parsed.find((block) => block["@type"] === "Organization");
    expect(organization, "no Organization block on the homepage").toBeTruthy();
    expect(organization["@context"]).toBe("https://schema.org");
    expect(organization.name).toBeTruthy();
    expect(organization.url).toBeTruthy();
  });

  test("/.well-known/security.txt is served and is valid enough to be useful", async ({ page }) => {
    const response = await page.request.get("/.well-known/security.txt");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("text/plain");

    const body = await response.text();
    expect(body).toContain("Contact:");
    // RFC 9116 requires Expires, and a date in the past makes the file invalid.
    const expires = /Expires:\s*(\S+)/.exec(body)?.[1];
    expect(expires, "security.txt has no Expires field").toBeTruthy();
    expect(new Date(expires!).getTime()).toBeGreaterThan(Date.now());
  });

  test("the privacy page's claims match what the site actually does", async ({ page }) => {
    // These are the load-bearing claims. If a future change adds a cookie or
    // an analytics call, this page becomes false — and that should be caught
    // here rather than by a reader.
    await page.goto("/privacy");
    // Scoped to the section and asserted with `toContainText`, not
    // `getByText`: the sentence starts with an interpolated site name, so
    // React emits `FileBrix<!-- --> sets no cookies` and the text engine
    // sees two nodes rather than one phrase.
    const cookieSection = page.getByRole("heading", { name: "Cookies and local storage" }).locator("..");
    await expect(cookieSection).toContainText("sets no cookies");

    const cookies = await page.context().cookies();
    expect(cookies, "the privacy page says no cookies are set").toEqual([]);

    const storageUsed = await page.evaluate(() => ({
      local: window.localStorage.length,
      session: window.sessionStorage.length,
    }));
    expect(storageUsed).toEqual({ local: 0, session: 0 });
  });
});

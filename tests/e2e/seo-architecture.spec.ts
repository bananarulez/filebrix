import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

test.describe.configure({ timeout: 60_000 });

/** Every JSON-LD block on the page, parsed. */
async function jsonLd(page: Page): Promise<Record<string, unknown>[]> {
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  return blocks.map((block) => JSON.parse(block) as Record<string, unknown>);
}

function typesOf(blocks: Record<string, unknown>[]): string[] {
  return blocks.map((block) => block["@type"] as string);
}

const CAPABILITY_PATHS = [
  "/data-studio/view",
  "/data-studio/edit",
  "/data-studio/convert",
  "/data-studio/analyze",
  "/pdf-studio/pages",
  "/pdf-studio/convert",
  "/pdf-studio/metadata",
  "/image-studio/edit",
  "/image-studio/convert",
  "/image-studio/metadata",
  "/geospatial-studio/view",
  "/geospatial-studio/edit",
  "/geospatial-studio/convert",
];

test.describe("Capability index pages", () => {
  test("every capability index page returns 200 with a self-referencing canonical", async ({ page, baseURL }) => {
    for (const path of CAPABILITY_PATHS) {
      const response = await page.goto(path);
      expect(response?.status(), `${path} should return 200`).toBe(200);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `${baseURL}${path}`);
    }
  });

  test("a capability page lists its own tools and links each to its real page", async ({ page }) => {
    await page.goto("/pdf-studio/pages");
    await expect(page.getByRole("heading", { level: 1, name: /Pages — PDF Studio/ })).toBeVisible();

    for (const name of ["Merge PDF", "Split PDF", "Rotate PDF"]) {
      await expect(page.getByRole("link", { name: new RegExp(`^${name}`) })).toBeVisible();
    }
    // Tools from a different capability of the same Studio must not appear.
    await expect(page.getByRole("link", { name: /^PDF to Images/ })).toHaveCount(0);

    await page.getByRole("link", { name: /^Merge PDF/ }).click();
    await expect(page).toHaveURL(/\/pdf\/merge$/);
  });

  test("a capability page emits CollectionPage + ItemList and BreadcrumbList structured data", async ({ page }) => {
    await page.goto("/image-studio/convert");
    const blocks = await jsonLd(page);
    expect(typesOf(blocks)).toEqual(expect.arrayContaining(["CollectionPage", "BreadcrumbList"]));

    const collection = blocks.find((block) => block["@type"] === "CollectionPage")!;
    const itemList = collection.mainEntity as { "@type": string; numberOfItems: number; itemListElement: unknown[] };
    expect(itemList["@type"]).toBe("ItemList");
    expect(itemList.numberOfItems).toBeGreaterThan(0);
    expect(itemList.itemListElement).toHaveLength(itemList.numberOfItems);
  });

  test("a capability page's breadcrumb is Home → Application → Capability and navigates", async ({ page }) => {
    await page.goto("/geospatial-studio/convert");
    const breadcrumb = page.getByRole("navigation", { name: "Breadcrumb" });
    await expect(breadcrumb.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    await expect(breadcrumb.getByRole("link", { name: "Geospatial Studio" })).toHaveAttribute(
      "href",
      "/geospatial-studio"
    );
    await expect(breadcrumb.getByText("Convert")).toBeVisible();

    await breadcrumb.getByRole("link", { name: "Geospatial Studio" }).click();
    await expect(page).toHaveURL(/\/geospatial-studio$/);
  });

  test("a tool page's breadcrumb passes through its Capability, and that crumb navigates", async ({ page }) => {
    // The URL hierarchy is Home -> Application -> Capability -> Tool (entry
    // 21), so the visible trail must include the Capability level. This is
    // also the ONLY inbound internal link capability index pages have: entry
    // 28 removed the "Browse by capability" nav from Studio pages by product
    // decision, which left them reachable from sitemap.xml alone.
    await page.goto("/convert/png-to-jpg");
    const breadcrumb = page.getByRole("navigation", { name: "Breadcrumb" });
    await expect(breadcrumb.getByRole("link", { name: "Image Studio", exact: true })).toHaveAttribute(
      "href",
      "/image-studio"
    );
    const capabilityCrumb = breadcrumb.getByRole("link", { name: "Convert", exact: true });
    await expect(capabilityCrumb).toHaveAttribute("href", "/image-studio/convert");

    await capabilityCrumb.click();
    await expect(page).toHaveURL(/\/image-studio\/convert$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("the tool-page BreadcrumbList JSON-LD carries all four levels", async ({ page }) => {
    // Breadcrumbs.tsx builds the visible trail and this markup from the same
    // `items`, so they can't disagree — asserted rather than assumed.
    await page.goto("/convert/png-to-jpg");
    const blocks = await jsonLd(page);
    const trail = blocks.find((block) => block["@type"] === "BreadcrumbList")!;
    const names = (trail.itemListElement as { name: string }[]).map((item) => item.name);
    expect(names).toEqual(["Home", "Image Studio", "Convert", "PNG to JPG Converter"]);
  });

  test("a tool whose capability has no index page gets no capability crumb", async ({ page }) => {
    // Developer Toolkit tools use `devCategory`, not a Studio capability, so
    // there is no capability page to link to. The crumb must be omitted
    // rather than rendered as a link to a 404.
    await page.goto("/tools/uuid-generator");
    const breadcrumb = page.getByRole("navigation", { name: "Breadcrumb" });
    await expect(breadcrumb.getByRole("link", { name: "Developer Toolkit", exact: true })).toBeVisible();
    await expect(breadcrumb.getByRole("listitem")).toHaveCount(3); // Home, Developer Toolkit, tool
  });

  test("Parquet Viewer resolves its Application through relatedEngines, not a CATEGORIES engine match", async ({
    page,
  }) => {
    // `engine: "parquet"` has no CATEGORIES entry at all; Data Studio owns it
    // via STUDIOS[].relatedEngines. A one-step lookup silently dropped the
    // Application crumb entirely here.
    await page.goto("/tools/parquet-viewer");
    const breadcrumb = page.getByRole("navigation", { name: "Breadcrumb" });
    await expect(breadcrumb.getByRole("link", { name: "Data Studio", exact: true })).toHaveAttribute(
      "href",
      "/data-studio"
    );
    await expect(breadcrumb.getByRole("link", { name: "Viewer", exact: true })).toHaveAttribute(
      "href",
      "/data-studio/view"
    );
  });

  test("a capability page cross-links its sibling capabilities and the other Applications", async ({ page }) => {
    await page.goto("/data-studio/convert");

    const siblings = page.getByRole("navigation", { name: "More in Data Studio" });
    await expect(siblings.getByRole("link", { name: "Viewer" })).toHaveAttribute("href", "/data-studio/view");
    // Never links to itself.
    await expect(siblings.getByRole("link", { name: "Converter" })).toHaveCount(0);

    const relatedApps = page.getByRole("navigation", { name: "Related applications" });
    await expect(relatedApps.getByRole("link", { name: "PDF Studio" })).toHaveAttribute("href", "/pdf-studio");
    await expect(relatedApps.getByRole("link", { name: "Data Studio" })).toHaveCount(0);
  });

  test("capabilities with no standalone tools have no index page (404, not a thin page)", async ({ page }) => {
    // PDF Studio's and Image Studio's View tabs are real in-app capabilities
    // with no standalone tool behind them, so indexing them would publish a
    // page listing zero tools. /pdf-studio/security is in this list too: the
    // capability itself was removed, so the URL must still not resolve.
    for (const path of ["/pdf-studio/view", "/image-studio/view", "/pdf-studio/security"]) {
      const response = await page.goto(path);
      expect(response?.status(), `${path} should not exist`).toBe(404);
    }
  });

  test("a capability gains an index page once it gains standalone tools", async ({ page }) => {
    // Geospatial Studio's Analyze was deliberately page-less while it hosted
    // only the in-app summary; the GIS expansion gave it real tools
    // (GeoJSON Statistics and the derived-geometry actions), which is exactly
    // the condition the index-page rule tracks.
    const response = await page.goto("/geospatial-studio/analyze");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("link", { name: /GeoJSON Statistics/i })).toBeVisible();
  });

  test("sitemap.xml lists every capability index page", async ({ page, baseURL }) => {
    const response = await page.goto("/sitemap.xml");
    const body = await response!.text();
    for (const path of CAPABILITY_PATHS) {
      expect(body, `sitemap should list ${path}`).toContain(`${baseURL}${path}</loc>`);
    }
    // The three capabilities without an index page must not be listed.
    expect(body).not.toContain(`${baseURL}/pdf-studio/security</loc>`);
  });
});

test.describe("Structured data consistency across page types", () => {
  test("an Application page emits SoftwareApplication + FAQPage + BreadcrumbList", async ({ page }) => {
    await page.goto("/pdf-studio");
    const types = typesOf(await jsonLd(page));
    expect(types).toEqual(expect.arrayContaining(["SoftwareApplication", "FAQPage", "BreadcrumbList"]));
  });

  test("a tool page emits the same SoftwareApplication + FAQPage + BreadcrumbList set", async ({ page }) => {
    await page.goto("/pdf/merge");
    const types = typesOf(await jsonLd(page));
    expect(types).toEqual(expect.arrayContaining(["SoftwareApplication", "FAQPage", "BreadcrumbList"]));
  });

  test("a Developer Toolkit sub-category page emits CollectionPage, like a capability page", async ({ page }) => {
    await page.goto("/developer-tools/encoding");
    const types = typesOf(await jsonLd(page));
    expect(types).toEqual(expect.arrayContaining(["CollectionPage", "BreadcrumbList"]));
  });

  test("the homepage emits WebSite", async ({ page }) => {
    await page.goto("/");
    expect(typesOf(await jsonLd(page))).toContain("WebSite");
  });

  test("every JSON-LD block on every page type is valid JSON with a schema.org context", async ({ page }) => {
    for (const path of ["/", "/pdf-studio", "/pdf-studio/pages", "/pdf/merge", "/developer-tools/text"]) {
      await page.goto(path);
      const blocks = await jsonLd(page);
      expect(blocks.length, `${path} should emit structured data`).toBeGreaterThan(0);
      for (const block of blocks) {
        expect(block["@context"], `${path} block missing @context`).toBe("https://schema.org");
        expect(block["@type"], `${path} block missing @type`).toBeTruthy();
      }
    }
  });
});

test.describe("Internal linking", () => {
  /**
   * Studio pages deliberately carry neither a "Browse by capability" nav nor
   * a "Related applications" block — both were removed as unwanted page
   * furniture. These assert that intent so neither creeps back via
   * `StudioLayout`, and document the crawl consequence: `StudioLayout` was
   * the only internal link into the capability index pages, so those are now
   * reachable through `sitemap.xml` alone (asserted separately above).
   */
  test("a Studio page renders no capability nav and no related-applications block", async ({ page }) => {
    for (const [path, title] of [
      ["/image-studio", "Image Studio"],
      ["/data-studio", "Data Studio"],
    ] as const) {
      await page.goto(path);
      await expect(page.getByRole("navigation", { name: `${title} capabilities` })).toHaveCount(0);
      await expect(page.getByRole("navigation", { name: "Related applications" })).toHaveCount(0);
    }
  });

  test("Related applications still cross-links Applications from the index pages that keep it", async ({ page }) => {
    // Capability and Developer Toolkit index pages are unchanged — only the
    // Studio (Application) pages dropped the block.
    await page.goto("/developer-tools");
    const relatedApps = page.getByRole("navigation", { name: "Related applications" });
    for (const name of ["PDF Studio", "Image Studio", "Geospatial Studio", "Data Studio"]) {
      await expect(relatedApps.getByRole("link", { name })).toBeVisible();
    }
    await expect(relatedApps.getByRole("link", { name: "Developer Toolkit" })).toHaveCount(0);
  });

  test("Home → Application → Tool is traversable by a crawler", async ({ page }) => {
    await page.goto("/");
    await page.locator("footer").getByRole("link", { name: "PDF Studio", exact: true }).click();
    await expect(page).toHaveURL(/\/pdf-studio$/);

    // The Studio page's own "Related tools" list is now the crawl path down
    // to individual tools, since the capability hop no longer exists here.
    await page
      .getByRole("navigation", { name: "Related tools" })
      .getByRole("link", { name: /^PDF Metadata Viewer/ })
      .click();
    await expect(page).toHaveURL(/\/pdf\/metadata-viewer$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("Capability → Tool still works for anyone arriving from the sitemap", async ({ page }) => {
    await page.goto("/pdf-studio/metadata");
    await page.getByRole("link", { name: /^PDF Metadata Viewer/ }).click();
    await expect(page).toHaveURL(/\/pdf\/metadata-viewer$/);
  });
});

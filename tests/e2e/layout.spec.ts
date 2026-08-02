import { expect, test } from "@playwright/test";

/**
 * Layout invariants that no single feature owns, and that nothing else fails
 * on if they break.
 *
 * The reserved ad rails and the content column are positioned by two
 * different files (`SideRailAds.tsx` pins each rail to a viewport edge;
 * `PageContainer.tsx` reserves the gutter they sit in). Nothing in the type
 * system or the unit tests connects those two numbers, and the previous
 * arrangement — rails positioned from the column's own half-width — is
 * exactly why the first attempt at a wide layout had to be reverted rather
 * than fixed (PROJECT_LOG.md entry 38). These tests are the missing link:
 * they assert the *rendered geometry*, so any future width change that lets
 * a rail cover the content fails here instead of shipping.
 */

/** One page per layout shell, so a shell that forgets `PageContainer` is caught. */
const PAGES = [
  { url: "/", label: "homepage" },
  { url: "/pdf-studio", label: "Studio (StudioLayout)" },
  { url: "/pdf-studio/pages", label: "capability index (CapabilityPageContent)" },
  { url: "/tools/csv-viewer", label: "tool page (ToolPageLayout)" },
  { url: "/developer-tools", label: "Developer Toolkit index" },
  { url: "/developer-tools/text", label: "dev sub-category (DevCategoryPageContent)" },
];

/** Desktop widths worth pinning: the exact `xl` breakpoint where rails appear, a common laptop, and a large monitor. */
const DESKTOP_WIDTHS = [1280, 1440, 1920];

/**
 * Measures the real content column via `PageContainer`'s own
 * `data-content-column` marker.
 *
 * Deliberately not derived by walking up from the `<h1>`: page shells nest
 * their headers at different depths (the homepage centers its header, tool
 * pages wrap theirs in an extra flex div), so the walk landed on the
 * full-width padded wrapper on some pages and the actual column on others —
 * which made the overlap assertion trivially pass or trivially fail
 * depending on the page rather than on the layout.
 */
async function contentBox(page: import("@playwright/test").Page) {
  return page
    .locator("[data-content-column]")
    .first()
    .evaluate((el) => {
      const { left, right, width } = el.getBoundingClientRect();
      return { left, right, width };
    });
}

test.describe("Side rails never overlap the content column", () => {
  for (const width of DESKTOP_WIDTHS) {
    for (const { url, label } of PAGES) {
      test(`${label} at ${width}px: both rails clear the column`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(url);
        await page.locator("[data-content-column]").first().waitFor();

        const left = page.locator('[data-rail="left"]');
        const right = page.locator('[data-rail="right"]');
        await expect(left).toBeVisible();
        await expect(right).toBeVisible();

        const leftBox = (await left.boundingBox())!;
        const rightBox = (await right.boundingBox())!;
        const content = await contentBox(page);

        // The actual invariant: no horizontal overlap in either direction.
        expect(leftBox.x + leftBox.width, `left rail must end before the column starts`).toBeLessThanOrEqual(
          content.left
        );
        expect(rightBox.x, `right rail must start after the column ends`).toBeGreaterThanOrEqual(content.right);

        // ...and each rail is on the side its name claims, so a swapped
        // placement name can't come back unnoticed.
        expect(leftBox.x).toBeLessThan(width / 2);
        expect(rightBox.x).toBeGreaterThan(width / 2);

        // Neither rail may hang off the viewport, which would look like a
        // horizontal scrollbar rather than an overlap.
        expect(leftBox.x).toBeGreaterThanOrEqual(0);
        expect(rightBox.x + rightBox.width).toBeLessThanOrEqual(width);
      });
    }
  }

  test("below the xl breakpoint no rail renders at all, and the column uses the full width", async ({ page }) => {
    await page.setViewportSize({ width: 1000, height: 900 });
    await page.goto("/pdf-studio");
    await page.locator("[data-content-column]").first().waitFor();

    await expect(page.locator('[data-rail="left"]')).toBeHidden();
    await expect(page.locator('[data-rail="right"]')).toBeHidden();

    // No gutter is reserved when there's nothing to put in it.
    const content = await contentBox(page);
    expect(content.width).toBeGreaterThan(900);
  });
});

test.describe("Application pages stay wide; prose stays readable", () => {
  test("a Studio's interactive area grows with the viewport, while its prose does not", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1000 });
    await page.goto("/data-studio");
    await page.locator("[data-content-column]").first().waitFor();

    const content = await contentBox(page);
    // Wide: the application column is far past the old fixed 864px.
    expect(content.width).toBeGreaterThan(1200);

    // Narrow: an FAQ answer is capped at the prose measure (54rem = 864px),
    // not stretched across the full application width.
    const answer = page.locator("dd").first();
    const answerBox = (await answer.boundingBox())!;
    expect(answerBox.width).toBeLessThanOrEqual(864);
    // And it's genuinely narrower than the page it sits on, i.e. the cap did something.
    expect(answerBox.width).toBeLessThan(content.width - 100);
  });

  test("the 404 page is a reading page, not a full-width application page", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1000 });
    const response = await page.goto("/this-route-does-not-exist");
    expect(response?.status()).toBe(404);

    const heading = page.getByRole("heading", { name: "Page not found" });
    await expect(heading).toBeVisible();
    const box = await heading.evaluate((el) => el.parentElement!.getBoundingClientRect().width);
    expect(box).toBeLessThanOrEqual(864);
  });
});

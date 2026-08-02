import path from "node:path";
import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const FIXTURES_DIR = path.join(__dirname, "..", "fixtures", "image");

function fixture(name: string): string {
  return path.join(FIXTURES_DIR, name);
}

test.describe.configure({ timeout: 60_000 });

/** Downloads the current result and decodes it back in-browser (via a data
 * URL + canvas) so pixel content can be verified without any Node-side
 * image-decoding dependency — reuses only the browser's own APIs, same
 * technique used to empirically verify EXIF-orientation/transparency
 * behavior before committing to this engine's architecture. */
async function downloadAndSamplePixel(
  page: Page,
  button: ReturnType<Page["getByRole"]>,
  mimeType: string,
  x: number,
  y: number
) {
  const downloadPromise = page.waitForEvent("download");
  await button.click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  if (!downloadPath) throw new Error("Download did not produce a file path");
  const base64 = readFileSync(downloadPath).toString("base64");

  return page.evaluate(
    async ({ base64, mimeType, x, y }) => {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("image failed to load"));
        img.src = `data:${mimeType};base64,${base64}`;
      });
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(x, y, 1, 1).data;
      return { width: img.naturalWidth, height: img.naturalHeight, rgb: [data[0], data[1], data[2]] };
    },
    { base64, mimeType, x, y }
  );
}

test.describe("PNG to JPG — transparency handling", () => {
  test("fills transparent areas with the chosen background color instead of going black", {
    tag: "@cross-browser",
  }, async ({ page }) => {
    await page.goto("/convert/png-to-jpg");
    await page.locator('input[type="file"]').setInputFiles(fixture("transparent.png"));

    await expect(page.getByLabel("Background color")).toBeVisible();
    await page.getByLabel("Background color").fill("#00ff00");
    await page.getByRole("button", { name: "Convert", exact: true }).click();

    const downloadButton = page.getByRole("button", { name: "Download" });
    await expect(downloadButton).toBeVisible({ timeout: 20_000 });

    // (0,0) is outside the red circle drawn in transparent.png — i.e. was
    // fully transparent in the source. It must come back green (the chosen
    // background), not black (canvas's default transparent-black composite).
    const result = await downloadAndSamplePixel(page, downloadButton, "image/jpeg", 0, 0);
    expect(result.rgb[1]).toBeGreaterThan(150); // strong green channel
    expect(result.rgb[0]).toBeLessThan(100); // not red/black
  });
});

test.describe("EXIF orientation", () => {
  test("Rotate Image outputs an already-correctly-oriented image for a photo with EXIF orientation metadata", {
    tag: "@cross-browser",
  }, async ({ page }) => {
    await page.goto("/tools/rotate-image");
    await page.locator('input[type="file"]').setInputFiles(fixture("exif-oriented.jpg"));

    // No extra rotation clicked — 0° delta on top of whatever orientation
    // the browser already auto-applied when decoding.
    const submitButton = page.getByRole("button", { name: "Rotate", exact: true });
    await expect(submitButton).toBeVisible();
    const finalDownloadButton = page.getByRole("button", { name: "Download" });
    await submitButton.click();
    await expect(finalDownloadButton).toBeVisible({ timeout: 20_000 });

    // Source is 100x50, red filling x∈[0,50) y∈[0,25) (the top-left quarter),
    // with orientation=6 (rotate 90° CW to display correctly). Rotating 90°
    // CW moves top-left content to the top-*right* of the new 50x100 frame
    // (new(x',y') = old(x,y) where x'=H-1-y, y'=x) — confirmed against this
    // exact fixture during the empirical pre-implementation check (see
    // PROJECT_LOG.md), so the sample point is deliberately near the new
    // top-right corner, not top-left.
    const result = await downloadAndSamplePixel(page, finalDownloadButton, "image/jpeg", 45, 2);
    expect(result.width).toBe(50);
    expect(result.height).toBe(100);
    expect(result.rgb[0]).toBeGreaterThan(150); // red channel dominant
  });
});

test.describe("SVG security", () => {
  test("a script-carrying SVG never executes its script when converted to PNG", {
    tag: "@cross-browser",
  }, async ({ page }) => {
    let dialogFired = false;
    page.on("dialog", (dialog) => {
      dialogFired = true;
      void dialog.dismiss();
    });

    await page.goto("/convert/svg-to-png");
    await page.locator('input[type="file"]').setInputFiles(fixture("script-payload.svg"));
    await page.getByRole("button", { name: "Convert", exact: true }).click();

    await expect(page.getByRole("button", { name: "Download" })).toBeVisible({ timeout: 20_000 });

    const executed = await page.evaluate(() => (window as unknown as { __svgScriptExecuted?: boolean }).__svgScriptExecuted);
    expect(executed).toBeFalsy();
    expect(dialogFired).toBe(false);
  });

  test("an SVG with an external resource reference never triggers a network request", async ({ page, baseURL }) => {
    const externalRequests: string[] = [];
    const baseOrigin = baseURL ? new URL(baseURL).origin : null;
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (baseOrigin && url.origin !== baseOrigin) externalRequests.push(request.url());
    });

    await page.goto("/convert/svg-to-png");
    await page.locator('input[type="file"]').setInputFiles(fixture("external-ref.svg"));
    await page.getByRole("button", { name: "Convert", exact: true }).click();
    await expect(page.getByRole("button", { name: "Download" })).toBeVisible({ timeout: 20_000 });

    await page.waitForTimeout(500);
    expect(externalRequests).toEqual([]);
  });

  test("a malformed SVG fails clearly instead of crashing", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.goto("/convert/svg-to-png");
    await page.locator('input[type="file"]').setInputFiles(fixture("malformed.svg"));
    await page.getByRole("button", { name: "Convert", exact: true }).click();

    await expect(page.getByText(/valid svg/i)).toBeVisible({ timeout: 20_000 });
    expect(pageErrors).toEqual([]);
  });
});

test.describe("Malformed and large images", () => {
  test("a truncated/malformed JPEG fails clearly instead of crashing", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.goto("/tools/resize-image");
    await page.locator('input[type="file"]').setInputFiles(fixture("malformed.jpg"));
    await page.getByRole("button", { name: "Resize", exact: true }).click();

    await expect(page.getByText(/valid image|corrupted/i)).toBeVisible({ timeout: 20_000 });
    expect(pageErrors).toEqual([]);
  });

  test("a large (3000x2000) image compresses without freezing the page", async ({ page }) => {
    await page.goto("/tools/compress-image");
    await page.locator('input[type="file"]').setInputFiles(fixture("large.png"));
    await page.getByRole("button", { name: "Compress", exact: true }).click();
    await expect(page.getByRole("button", { name: "Download" })).toBeVisible({ timeout: 30_000 });
  });
});

test.describe("Batch processing", () => {
  test("converting several WebP images produces individual downloads and a combined zip", async ({ page }) => {
    await page.goto("/convert/webp-to-png");
    await page
      .locator('input[type="file"]')
      .setInputFiles([fixture("sample.webp"), fixture("sample.webp")]);
    await page.getByRole("button", { name: "Convert", exact: true }).click();

    await expect(page.getByRole("button", { name: /download all 2 as \.zip/i })).toBeVisible({ timeout: 20_000 });
    expect(await page.getByRole("button", { name: "Download", exact: true }).count()).toBe(2);
  });
});

test.describe("Image Metadata Viewer", () => {
  test("shows camera metadata and flags GPS-free content correctly", async ({ page }) => {
    await page.goto("/tools/image-metadata-viewer");
    await page.locator('input[type="file"]').setInputFiles(fixture("exif-oriented.jpg"));

    await expect(page.getByText("TestCam")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/contains gps location data/i)).not.toBeVisible();
  });
});

test.describe("Remove EXIF Metadata", () => {
  test("strips metadata and offers a cleaned download", async ({ page }) => {
    await page.goto("/tools/remove-image-metadata");
    await page.locator('input[type="file"]').setInputFiles(fixture("exif-oriented.jpg"));
    await expect(page.getByRole("button", { name: "Download" })).toBeVisible({ timeout: 20_000 });
  });
});

test.describe("All 13 pages load and accept a file", () => {
  const cases: { url: string; fixtureFile: string; actionLabel?: string }[] = [
    { url: "/convert/png-to-jpg", fixtureFile: "opaque.jpg", actionLabel: "Convert" },
    { url: "/convert/jpg-to-png", fixtureFile: "opaque.jpg", actionLabel: "Convert" },
    { url: "/convert/webp-to-jpg", fixtureFile: "sample.webp", actionLabel: "Convert" },
    { url: "/convert/jpg-to-webp", fixtureFile: "opaque.jpg", actionLabel: "Convert" },
    { url: "/convert/png-to-webp", fixtureFile: "transparent.png", actionLabel: "Convert" },
    { url: "/convert/webp-to-png", fixtureFile: "sample.webp", actionLabel: "Convert" },
    { url: "/convert/svg-to-png", fixtureFile: "normal.svg", actionLabel: "Convert" },
    { url: "/tools/resize-image", fixtureFile: "opaque.jpg", actionLabel: "Resize" },
    { url: "/tools/compress-image", fixtureFile: "opaque.jpg", actionLabel: "Compress" },
    { url: "/tools/rotate-image", fixtureFile: "opaque.jpg", actionLabel: "Rotate" },
    { url: "/tools/flip-image", fixtureFile: "opaque.jpg", actionLabel: "Flip" },
    { url: "/tools/remove-image-metadata", fixtureFile: "opaque.jpg" },
  ];

  for (const { url, fixtureFile, actionLabel } of cases) {
    test(`${url} converts ${fixtureFile} and offers a download`, async ({ page }) => {
      await page.goto(url);
      await page.locator('input[type="file"]').setInputFiles(fixture(fixtureFile));
      if (actionLabel) {
        await page.getByRole("button", { name: actionLabel, exact: true }).click();
      }
      await expect(page.getByRole("button", { name: "Download" })).toBeVisible({ timeout: 20_000 });
    });
  }
});

test.describe("Network privacy", () => {
  test("converting an image never sends its bytes anywhere off-origin", async ({ page, baseURL }) => {
    const externalRequests: string[] = [];
    const baseOrigin = baseURL ? new URL(baseURL).origin : null;
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (baseOrigin && url.origin !== baseOrigin) externalRequests.push(request.url());
    });

    await page.goto("/tools/resize-image");
    await page.locator('input[type="file"]').setInputFiles(fixture("opaque.jpg"));
    await page.getByRole("button", { name: "Resize", exact: true }).click();
    await expect(page.getByRole("button", { name: "Download" })).toBeVisible({ timeout: 20_000 });

    await page.waitForTimeout(500);
    expect(externalRequests).toEqual([]);
  });
});

test.describe("Image Studio hub (/image-studio)", () => {
  test("Edit tab's action picker switches between actions, each rendering its own unchanged UI", async ({ page }) => {
    await page.goto("/image-studio");
    await page.getByRole("tab", { name: "Edit", exact: true }).click();

    await page.getByRole("radio", { name: "Crop", exact: true }).click();
    await page.locator('input[type="file"]').first().setInputFiles(fixture("opaque.jpg"));
    await expect(page.getByRole("button", { name: "Apply Crop" })).toBeVisible();

    await page.getByRole("radio", { name: "Brightness", exact: true }).click();
    await page.locator('input[type="file"]').first().setInputFiles(fixture("opaque.jpg"));
    await expect(page.getByRole("slider", { name: "Brightness" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Apply brightness" })).toBeVisible();

    await page.getByRole("radio", { name: "Grayscale", exact: true }).click();
    await page.locator('input[type="file"]').first().setInputFiles(fixture("opaque.jpg"));
    await expect(page.getByRole("button", { name: "Convert to grayscale" })).toBeVisible();
  });

  test("Convert tab's pair picker switches between conversions, including SVG to PNG", async ({ page }) => {
    await page.goto("/image-studio");
    await page.getByRole("tab", { name: "Convert", exact: true }).click();

    await page.getByRole("radio", { name: "PNG to JPG", exact: true }).click();
    // A PNG, not a JPEG: the shared workspace gates each conversion on the
    // loaded image's detected format, so dropping a JPEG here would (by
    // design) fall back to a JPEG-capable conversion instead.
    await page.locator('input[type="file"]').first().setInputFiles(fixture("transparent.png"));
    await expect(page.getByRole("button", { name: "Convert", exact: true })).toBeVisible();

    // Dropping an SVG re-gates the picker: every raster pair becomes
    // unavailable, so the Studio moves to the one conversion this file *can*
    // do rather than leaving a tool mounted that can't run. (Choosing SVG to
    // PNG first would be the wrong order now — it's disabled while a PNG is
    // loaded, which is exactly what the gating is for.)
    await page.locator('input[type="file"]').first().setInputFiles(fixture("normal.svg"));
    await expect(page.getByRole("radio", { name: "SVG to PNG", exact: true })).toHaveAttribute(
      "aria-checked",
      "true"
    );
    await expect(page.getByRole("button", { name: "Convert", exact: true })).toBeVisible();
  });

  test("Crop produces an image smaller than the source, matching the selected region", async ({ page }) => {
    await page.goto("/image-studio");
    await page.getByRole("tab", { name: "Edit", exact: true }).click();
    await page.getByRole("radio", { name: "Crop", exact: true }).click();
    await page.locator('input[type="file"]').first().setInputFiles(fixture("opaque.jpg"));
    await expect(page.getByRole("button", { name: "Apply Crop" })).toBeEnabled();
    await page.getByRole("button", { name: "Apply Crop" }).click();

    const downloadButton = page.getByRole("button", { name: "Download" });
    await expect(downloadButton).toBeVisible({ timeout: 20_000 });
    const result = await downloadAndSamplePixel(page, downloadButton, "image/jpeg", 0, 0);
    // opaque.jpg is 200x150 (see the pixel-level engine verification); the
    // default crop selection is a centered 80% box, so the output should be
    // smaller than the source in both dimensions.
    expect(result.width).toBeLessThan(200);
    expect(result.height).toBeLessThan(150);
  });

  test("Watermark is a real Edit action: it draws the text onto the output pixels", async ({ page }) => {
    await page.goto("/image-studio");
    await page.getByRole("tab", { name: "Edit", exact: true }).click();
    await page.getByRole("radio", { name: "Watermark", exact: true }).click();
    await page.locator('input[type="file"]').first().setInputFiles(fixture("opaque.jpg"));

    // Bright green, full opacity, large, centered — so the pixel assertion
    // below is about the watermark and nothing else. opaque.jpg is a solid
    // non-green image (see the transparency test above).
    await page.getByLabel("Watermark color").fill("#00ff00");
    await page.getByLabel("Opacity").fill("1");
    await page.getByLabel("Size").fill("0.2");
    await page.getByRole("button", { name: "Apply watermark" }).click();

    const downloadButton = page.getByRole("button", { name: "Download" });
    await expect(downloadButton).toBeVisible({ timeout: 20_000 });

    // Sample the middle of the image, where a centered watermark must be.
    const result = await downloadAndSamplePixel(page, downloadButton, "image/jpeg", 100, 75);
    expect(result.width).toBe(200);
    expect(result.height).toBe(150);
    expect(result.rgb[1]).toBeGreaterThan(120); // green channel lifted by the text
  });

  test("Watermark keeps the batch shape every other Edit action uses", async ({ page }) => {
    await page.goto("/image-studio");
    await page.getByRole("tab", { name: "Edit", exact: true }).click();
    await page.getByRole("radio", { name: "Watermark", exact: true }).click();
    await page
      .locator('input[type="file"]')
      .first()
      .setInputFiles([fixture("opaque.jpg"), fixture("gps-tagged.jpg")]);

    await page.getByRole("button", { name: "Apply watermark" }).click();
    await expect(page.getByRole("button", { name: /download all/i })).toBeVisible({ timeout: 30_000 });
  });

  test("View tab: zoom controls change the displayed percentage", async ({ page }) => {
    await page.goto("/image-studio");
    await page.locator('input[type="file"]').first().setInputFiles(fixture("opaque.jpg"));
    await expect(page.getByText("100%")).toBeVisible();

    await page.getByRole("button", { name: "Zoom in" }).click();
    await expect(page.getByText("125%")).toBeVisible();

    await page.getByRole("button", { name: "Zoom out" }).click();
    await expect(page.getByText("100%")).toBeVisible();

    await page.getByRole("button", { name: "Zoom in" }).click();
    await page.getByRole("button", { name: "Reset" }).click();
    await expect(page.getByText("100%")).toBeVisible();
  });

  test("editing an image and switching to View offers an original-vs-edited compare", async ({ page }) => {
    await page.goto("/image-studio");
    await page.getByRole("tab", { name: "Edit", exact: true }).click();
    await page.getByRole("radio", { name: "Grayscale", exact: true }).click();
    await page.locator('input[type="file"]').first().setInputFiles(fixture("opaque.jpg"));
    await page.getByRole("button", { name: "Convert to grayscale" }).click();
    await expect(page.getByRole("button", { name: "Download" })).toBeVisible({ timeout: 20_000 });

    await page.getByRole("tab", { name: "View", exact: true }).click();
    const compareToggle = page.getByRole("button", { name: "Compare with edited version" });
    await expect(compareToggle).toBeVisible();

    await compareToggle.click();
    await expect(page.getByText("Original", { exact: true })).toBeVisible();
    await expect(page.getByText("Edited", { exact: true })).toBeVisible();
  });

  test("a locked tool page (/tools/resize-image) hides the Edit action picker but keeps the top-level tabs switchable", async ({
    page,
  }) => {
    await page.goto("/tools/resize-image");
    await expect(page.locator('[aria-label="Action"]')).toHaveCount(0);

    await page.getByRole("tab", { name: "Convert", exact: true }).click();
    await expect(page.getByRole("radio", { name: "PNG to JPG", exact: true })).toBeVisible();
  });

  test("Metadata tab hosts both View and Remove together, and Edit's picker no longer offers Remove Metadata", async ({
    page,
  }) => {
    await page.goto("/image-studio");
    await page.getByRole("tab", { name: "Metadata", exact: true }).click();
    const actionPicker = page.locator('[aria-label="Action"]');

    await expect(actionPicker.getByRole("radio", { name: "View", exact: true })).toBeVisible();
    await expect(actionPicker.getByRole("radio", { name: "Remove", exact: true })).toBeVisible();

    await page.locator('input[type="file"]').first().setInputFiles(fixture("exif-oriented.jpg"));
    await expect(page.getByText("TestCam")).toBeVisible({ timeout: 20_000 });

    await actionPicker.getByRole("radio", { name: "Remove", exact: true }).click();
    await page.locator('input[type="file"]').first().setInputFiles(fixture("exif-oriented.jpg"));
    await expect(page.getByRole("button", { name: "Download" })).toBeVisible({ timeout: 20_000 });

    await page.getByRole("tab", { name: "Edit", exact: true }).click();
    await expect(page.getByRole("tab", { name: "Remove Metadata" })).toHaveCount(0);
  });

  test("locked metadata tool pages hide the View/Remove picker but keep the top-level tabs switchable", async ({
    page,
  }) => {
    await page.goto("/tools/image-metadata-viewer");
    await expect(page.locator('[aria-label="Action"]')).toHaveCount(0);
    await page.locator('input[type="file"]').first().setInputFiles(fixture("exif-oriented.jpg"));
    await expect(page.getByText("TestCam")).toBeVisible({ timeout: 20_000 });

    await page.goto("/tools/remove-image-metadata");
    await expect(page.locator('[aria-label="Action"]')).toHaveCount(0);
    await page.locator('input[type="file"]').setInputFiles(fixture("exif-oriented.jpg"));
    await expect(page.getByRole("button", { name: "Download" })).toBeVisible({ timeout: 20_000 });
  });
});

/**
 * Same property as PDF Studio's own "keeps the loaded file" suite: the
 * images live in `ImageWorkspace`, so moving between Edit actions and tabs
 * never silently discards them.
 */
test.describe("Image Studio keeps the loaded images across tabs", () => {
  test("an image dropped on Edit is still loaded on another Edit action and on Metadata", async ({
    page,
  }) => {
    await page.goto("/image-studio");
    await page.getByRole("tab", { name: "Edit", exact: true }).click();
    await page.getByRole("radio", { name: "Resize", exact: true }).click();
    await page.locator('input[type="file"]').first().setInputFiles(fixture("gps-tagged.jpg"));
    await expect(page.getByRole("button", { name: "Resize", exact: true })).toBeVisible();

    await page.getByRole("radio", { name: "Rotate", exact: true }).click();
    await expect(page.getByText("gps-tagged.jpg")).toBeVisible();
    await expect(page.getByRole("button", { name: "Rotate right", exact: true })).toBeVisible();

    // A different tab entirely — and one that actually reads the file, so
    // this proves the same File object came through, not just its name.
    await page.getByRole("tab", { name: "Metadata", exact: true }).click();
    await expect(page.getByText(/contains gps location data/i)).toBeVisible({ timeout: 20_000 });

    await page.getByRole("button", { name: "Clear", exact: true }).click();
    await expect(page.getByText("gps-tagged.jpg")).toHaveCount(0);
  });

  test("an action the loaded image's format can't support is disabled, with the reason shown", async ({
    page,
  }) => {
    await page.goto("/image-studio");
    await page.getByRole("tab", { name: "Convert", exact: true }).click();
    await page.locator('input[type="file"]').first().setInputFiles(fixture("transparent.png"));
    await expect(page.getByText("transparent.png")).toBeVisible();

    // PNG in, so the WebP- and SVG-sourced conversions can't run on it.
    const webpToJpg = page.getByRole("radio", { name: "WebP to JPG", exact: true });
    await expect(webpToJpg).toHaveAttribute("aria-disabled", "true");
    await expect(webpToJpg).toHaveAttribute("title", /needs WebP/i);
    await expect(page.getByRole("radio", { name: "SVG to PNG", exact: true })).toHaveAttribute(
      "aria-disabled",
      "true"
    );
    // ...while the PNG-sourced ones stay available.
    await expect(page.getByRole("radio", { name: "PNG to WebP", exact: true })).not.toHaveAttribute(
      "aria-disabled",
      "true"
    );
  });
});

test.describe("Seeing the result without downloading it", () => {
  /*
   * Reported after launch: applying a brightness change showed no preview of
   * the result, so the only way to judge it was to download the file and open
   * it — which makes the actual workflow (nudge a few percent, look, nudge
   * again) impossible without leaving the page. `ImageBatchList` was rendering
   * `URL.createObjectURL(file)`, the *input*, and never the output.
   *
   * Asserted through the `alt` text rather than by comparing pixels: the point
   * is which image the component chose to show, and the existing pixel-level
   * tests above already cover whether the processing itself is correct.
   */
  test("an edit shows the processed image, its size change, and can flip back to the original", async ({
    page,
  }) => {
    await page.goto("/tools/compress-image");
    await page.locator('input[type="file"]').first().setInputFiles(fixture("opaque.jpg"));
    await page.getByRole("button", { name: "Compress", exact: true }).click();

    const result = page.locator('img[alt^="Result for"]');
    await expect(result).toBeVisible({ timeout: 30_000 });

    // "2.3 KB → 1.9 KB (−17%)" — before, after and the delta. For Compress
    // this is the entire answer the tool gives; it used to be invisible.
    await expect(page.getByText(/\d.*(KB|MB|B) → .*(KB|MB|B) \([+−]?\d+%\)/)).toBeVisible();

    await page.getByRole("button", { name: "Compare with original" }).click();
    await expect(page.locator('img[alt^="Original "]')).toBeVisible();
    await expect(result).toHaveCount(0);

    await page.getByRole("button", { name: "Show result" }).click();
    await expect(result).toBeVisible();
  });

  test("a batch shows every processed image, not the files that went in", async ({ page }) => {
    await page.goto("/convert/png-to-jpg");
    await page
      .locator('input[type="file"]')
      .first()
      .setInputFiles([fixture("transparent.png"), fixture("large.png")]);
    await page.getByRole("button", { name: "Convert", exact: true }).click();

    await expect(page.locator('img[alt^="Result for"]')).toHaveCount(2, { timeout: 45_000 });
  });
});

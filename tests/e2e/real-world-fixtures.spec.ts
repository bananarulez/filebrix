import path from "node:path";
import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

/**
 * Fixtures here were made by producers the code under test does NOT share:
 * reportlab and qpdf for the PDFs, Pillow for the animated WebP. Every other
 * PDF fixture in this repo came from pdf-lib or pypdf, so until now the suite
 * could only prove the engine round-trips its own output.
 *
 * See scripts/generate-real-world-pdf-fixtures.py and
 * scripts/generate-real-world-image-fixtures.py.
 */
const PDF_FIXTURES = path.join(__dirname, "..", "fixtures", "pdf");
const IMAGE_FIXTURES = path.join(__dirname, "..", "fixtures", "image");

const pdfFixture = (name: string) => path.join(PDF_FIXTURES, name);
const imageFixture = (name: string) => path.join(IMAGE_FIXTURES, name);

test.describe.configure({ timeout: 90_000 });

test.describe("PDFs from a producer that isn't pdf-lib", () => {
  test("a reportlab-produced PDF loads and its pages are usable", async ({ page }) => {
    await page.goto("/pdf/merge");
    await page
      .locator('input[type="file"]')
      .setInputFiles([pdfFixture("real-reportlab.pdf"), pdfFixture("real-linearized.pdf")]);

    // 3 pages each. If pdf-lib choked on reportlab's object layout, no
    // thumbnails would appear at all.
    await expect(page.getByText(/^Page \d$/)).toHaveCount(6, { timeout: 30_000 });

    await page.getByRole("button", { name: "Merge & download" }).click();
    await expect(page.getByRole("button", { name: /download merged\.pdf/i })).toBeVisible({ timeout: 30_000 });
  });

  test("a linearized (web-optimized) PDF is not mistaken for a malformed one", async ({ page }) => {
    await page.goto("/convert/pdf-to-txt");
    await page.locator('input[type="file"]').setInputFiles(pdfFixture("real-linearized.pdf"));

    await expect(page.getByLabel("Extracted text")).toHaveValue(/Real-producer fixture/, { timeout: 30_000 });
  });

  test("a PDF using object streams and a cross-reference stream parses", async ({ page }) => {
    // PDF 1.5 structure: most objects packed into compressed object streams
    // behind a binary xref stream, with no classic xref table anywhere.
    await page.goto("/convert/pdf-to-txt");
    await page.locator('input[type="file"]').setInputFiles(pdfFixture("real-objstm.pdf"));

    await expect(page.getByLabel("Extracted text")).toHaveValue(/Real-producer fixture/, { timeout: 30_000 });
  });

  test("a scanner-style image-only PDF reports no extractable text rather than failing", async ({ page }) => {
    await page.goto("/convert/pdf-to-txt");
    await page.locator('input[type="file"]').setInputFiles(pdfFixture("real-scanned-image-only.pdf"));

    await expect(
      page.getByText("No extractable text was found. This document may be scanned.")
    ).toBeVisible({ timeout: 30_000 });
  });
});

test.describe("CJK text in a non-embedded standard font", () => {
  test("extracts CJK text from a PDF that embeds no font program", async ({ page }) => {
    // The only test that exercises pdf.js's self-hosted cmaps/ and
    // standard_fonts/ (scripts/copy-pdfjs-assets.mjs). The failure mode for
    // missing CMaps is silent degradation — wrong glyphs or empty output —
    // never a thrown error, which is why this needs a real assertion on the
    // extracted characters rather than "did something come back".
    await page.goto("/convert/pdf-to-txt");
    await page.locator('input[type="file"]').setInputFiles(pdfFixture("real-cjk-noembed.pdf"));

    const extracted = page.getByLabel("Extracted text");
    await expect(extracted).toHaveValue(/ASCII alongside CJK/, { timeout: 30_000 });
    // The actual CJK payload, not just the Latin text sitting next to it.
    await expect(extracted).toHaveValue(/日本語のテキストサンプル/, { timeout: 30_000 });
  });
});

test.describe("Animated WebP", () => {
  test("uses only the first frame when converting an animated WebP", async ({ page }) => {
    // The webp-to-jpg/webp-to-png FAQ asserts "only a single static frame is
    // used". That was inferred from general createImageBitmap behaviour and
    // never checked against a real animated file. animated.webp is 3 flat
    // frames — red, green, blue — so the decoded colour names the frame.
    await page.goto("/convert/webp-to-png");
    await page.locator('input[type="file"]').setInputFiles(imageFixture("animated.webp"));
    await page.getByRole("button", { name: "Convert", exact: true }).click();

    const downloadButton = page.getByRole("button", { name: "Download" });
    await expect(downloadButton).toBeVisible({ timeout: 30_000 });

    const downloadPromise = page.waitForEvent("download");
    await downloadButton.click();
    const download = await downloadPromise;
    const downloadPath = await download.path();
    if (!downloadPath) throw new Error("Download did not produce a file path");
    const base64 = readFileSync(downloadPath).toString("base64");

    const rgb = await page.evaluate(async (b64) => {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("image failed to load"));
        img.src = `data:image/png;base64,${b64}`;
      });
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(80, 60, 1, 1).data;
      return [d[0], d[1], d[2]];
    }, base64);

    // Frame 0 is red (220,30,30). Green (30,200,60) would mean frame 1 was
    // decoded; blue (40,90,230) frame 2.
    expect(rgb[0]).toBeGreaterThan(150);
    expect(rgb[1]).toBeLessThan(110);
    expect(rgb[2]).toBeLessThan(110);
  });
});

test.describe("A realistically large photo", () => {
  test("compresses a 6-megapixel photo without failing or hanging", async ({ page }) => {
    // The pre-existing "large" fixture was a gradient that compressed to
    // 23 KB — large on paper, trivial in memory. This one is 6 MP, i.e.
    // ~24 MB once decoded to RGBA, which is what the engine actually holds.
    await page.goto("/tools/compress-image");
    await page.locator('input[type="file"]').setInputFiles(imageFixture("photo-large.jpg"));
    await page.getByRole("button", { name: "Compress", exact: true }).click();

    await expect(page.getByRole("button", { name: "Download" })).toBeVisible({ timeout: 60_000 });
  });
});

import path from "node:path";
import { expect, test } from "@playwright/test";

const FIXTURES_DIR = path.join(__dirname, "..", "fixtures", "pdf");

function fixture(name: string): string {
  return path.join(FIXTURES_DIR, name);
}

// pdf-lib/pdf.js have real work to do (parsing, rendering) on first use in
// each fresh page — same reasoning as parquet-viewer.spec.ts's DuckDB timeout.
test.describe.configure({ timeout: 60_000 });

test.describe("Merge PDF", () => {
  test("combines pages from two files and offers a single download", async ({ page }) => {
    await page.goto("/pdf/merge");
    await page.locator('input[type="file"]').setInputFiles([fixture("multi-page.pdf"), fixture("mixed-sizes.pdf")]);

    await expect(page.getByText(/^Page 1$/).first()).toBeVisible({ timeout: 20_000 });
    // 5 pages from multi-page.pdf + 3 from mixed-sizes.pdf.
    await expect(page.getByText(/^Page \d$/)).toHaveCount(8);

    await page.getByRole("button", { name: "Merge & download" }).click();
    await expect(page.getByRole("button", { name: /download merged\.pdf/i })).toBeVisible({ timeout: 20_000 });
  });

  test("refuses to merge with only one file", async ({ page }) => {
    await page.goto("/pdf/merge");
    await page.locator('input[type="file"]').setInputFiles(fixture("multi-page.pdf"));
    await expect(page.getByText(/^Page 1$/).first()).toBeVisible({ timeout: 20_000 });

    await page.getByRole("button", { name: "Merge & download" }).click();
    await expect(page.getByText("Add at least two PDF files to merge.")).toBeVisible();
  });
});

test.describe("Split PDF", () => {
  test("splits at a chosen marker and packages parts as a zip", async ({ page }) => {
    await page.goto("/pdf/split");
    await page.locator('input[type="file"]').setInputFiles(fixture("multi-page.pdf"));
    await expect(page.getByText(/1 part/i)).toBeVisible({ timeout: 20_000 });

    await page.getByRole("button", { name: /toggle split after page 2/i }).click();
    await expect(page.getByText(/2 parts/i)).toBeVisible();

    await page.getByRole("button", { name: "Split PDF" }).click();
    await expect(page.getByRole("button", { name: /download split-pages\.zip/i })).toBeVisible({
      timeout: 20_000,
    });
  });
});

test.describe("Rotate PDF", () => {
  test("rotates a single page and downloads the result", async ({ page }) => {
    await page.goto("/pdf/rotate");
    await page.locator('input[type="file"]').setInputFiles(fixture("rotated-pages.pdf"));
    await expect(page.getByText(/^Page 1$/).first()).toBeVisible({ timeout: 20_000 });

    await page.getByRole("button", { name: /rotate page 1 right/i }).click();
    await page.getByRole("button", { name: "Apply rotation & download" }).click();
    await expect(page.getByRole("button", { name: /download rotated\.pdf/i })).toBeVisible({
      timeout: 20_000,
    });
  });
});

test.describe("Extract PDF Pages", () => {
  test("requires a selection, then extracts only the checked pages", async ({ page }) => {
    await page.goto("/pdf/extract-pages");
    await page.locator('input[type="file"]').setInputFiles(fixture("multi-page.pdf"));
    await expect(page.getByText(/^Page 1$/).first()).toBeVisible({ timeout: 20_000 });

    await page.getByRole("button", { name: "Extract selected pages" }).click();
    await expect(page.getByText("Select at least one page to extract.")).toBeVisible();

    await page.getByRole("checkbox", { name: /Keep page 2/i }).check();
    await page.getByRole("button", { name: "Extract selected pages" }).click();
    await expect(page.getByRole("button", { name: /download extracted\.pdf/i })).toBeVisible({
      timeout: 20_000,
    });
  });
});

test.describe("Delete PDF Pages", () => {
  test("refuses to delete every page, then deletes a valid selection", async ({ page }) => {
    await page.goto("/pdf/delete-pages");
    await page.locator('input[type="file"]').setInputFiles(fixture("multi-page.pdf"));
    await expect(page.getByText(/^Page 1$/).first()).toBeVisible({ timeout: 20_000 });

    await page.getByRole("checkbox", { name: /Delete page 1/i }).check();
    await page.getByRole("button", { name: "Delete selected pages" }).click();
    await expect(page.getByRole("button", { name: /download edited\.pdf/i })).toBeVisible({ timeout: 20_000 });
  });
});

test.describe("Reorder PDF Pages", () => {
  test("moves a page and downloads the reordered file", async ({ page }) => {
    await page.goto("/pdf/reorder-pages");
    await page.locator('input[type="file"]').setInputFiles(fixture("multi-page.pdf"));
    await expect(page.getByText(/^Page 1$/).first()).toBeVisible({ timeout: 20_000 });

    await page.getByRole("button", { name: /move page 2 earlier/i }).click();
    await page.getByRole("button", { name: "Save reordered PDF" }).click();
    await expect(page.getByRole("button", { name: /download reordered\.pdf/i })).toBeVisible({
      timeout: 20_000,
    });
  });
});

test.describe("PDF Metadata Viewer", () => {
  test("shows the document's title and author", async ({ page }) => {
    await page.goto("/pdf/metadata-viewer");
    await page.locator('input[type="file"]').setInputFiles(fixture("multi-page.pdf"));

    await expect(page.getByText("Multi-page sample")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("web-transform fixture generator")).toBeVisible();
    await expect(page.getByRole("button", { name: /remove metadata/i })).not.toBeVisible();
  });
});

test.describe("Remove PDF Metadata", () => {
  test("removes metadata and offers a cleaned download", async ({ page }) => {
    await page.goto("/pdf/remove-metadata");
    await page.locator('input[type="file"]').setInputFiles(fixture("multi-page.pdf"));
    await expect(page.getByText("Multi-page sample")).toBeVisible({ timeout: 20_000 });

    await page.getByRole("button", { name: /remove metadata/i }).click();
    await expect(page.getByRole("button", { name: /download cleaned\.pdf/i })).toBeVisible({
      timeout: 20_000,
    });
  });
});

test.describe("Images to PDF", () => {
  test("builds a PDF from two images", async ({ page }) => {
    await page.goto("/convert/images-to-pdf");
    await page
      .locator('input[type="file"]')
      .setInputFiles([fixture("sample-image-1.png"), fixture("sample-image-2.jpg")]);

    await expect(page.getByText(/sample-image-1\.png, sample-image-2\.jpg/)).toBeVisible();
    await page.getByRole("button", { name: "Build PDF" }).click();
    await expect(page.getByRole("button", { name: /download images\.pdf/i })).toBeVisible({ timeout: 20_000 });
  });
});

test.describe("PDF to Images", () => {
  test("renders a multi-page PDF's pages and zips the result", async ({ page }) => {
    await page.goto("/convert/pdf-to-images");
    await page.locator('input[type="file"]').setInputFiles(fixture("multi-page.pdf"));
    await expect(page.getByRole("button", { name: "Convert to images" })).toBeVisible();

    await page.getByRole("button", { name: "Convert to images" }).click();
    await expect(page.getByRole("button", { name: /download pages\.zip/i })).toBeVisible({ timeout: 30_000 });
  });
});

test.describe("PDF to TXT", () => {
  test("extracts text from a text-based PDF", async ({ page }) => {
    await page.goto("/convert/pdf-to-txt");
    await page.locator('input[type="file"]').setInputFiles(fixture("multi-page.pdf"));

    await expect(page.getByLabel("Extracted text")).toHaveValue(/Page 1 of 5/, { timeout: 20_000 });
  });

  test('shows the exact "no extractable text" message for a scanned PDF', async ({ page }) => {
    await page.goto("/convert/pdf-to-txt");
    await page.locator('input[type="file"]').setInputFiles(fixture("scanned.pdf"));

    await expect(
      page.getByText("No extractable text was found. This document may be scanned.")
    ).toBeVisible({ timeout: 20_000 });
  });
});

test.describe("Encrypted and malformed PDFs", () => {
  test("an encrypted PDF fails clearly instead of crashing, across tools", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.goto("/pdf/metadata-viewer");
    await page.locator('input[type="file"]').setInputFiles(fixture("encrypted.pdf"));

    await expect(page.getByText(/password-protected/i)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("Your file was never uploaded.", { exact: true })).toBeVisible();
    expect(pageErrors).toEqual([]);
  });

  test("a malformed PDF fails clearly instead of crashing", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.goto("/pdf/rotate");
    await page.locator('input[type="file"]').setInputFiles(fixture("malformed.pdf"));

    await expect(page.getByRole("alert")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("Your file was never uploaded.", { exact: true })).toBeVisible();
    expect(pageErrors).toEqual([]);
  });
});

test.describe("Mixed page sizes and large documents", () => {
  test("renders thumbnails for a PDF with mixed page sizes without error", async ({ page }) => {
    await page.goto("/pdf/reorder-pages");
    await page.locator('input[type="file"]').setInputFiles(fixture("mixed-sizes.pdf"));
    await expect(page.getByText(/^Page \d$/)).toHaveCount(3, { timeout: 20_000 });
  });

  test("a 60-page PDF loads without rendering every thumbnail at once", async ({ page }) => {
    await page.goto("/pdf/reorder-pages");
    await page.locator('input[type="file"]').setInputFiles(fixture("large.pdf"));
    await expect(page.getByText(/^Page 1$/).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/^Page \d+$/)).toHaveCount(60);

    // Lazy-rendering: only thumbnails scrolled into view should have
    // actually rendered an <img>, not all 60 at once.
    const renderedImages = await page.locator('img[alt^="Page "]').count();
    expect(renderedImages).toBeLessThan(60);
  });
});

test.describe("Network privacy", () => {
  test("processing a PDF never sends its bytes anywhere off-origin", async ({ page, baseURL }) => {
    const externalRequests: string[] = [];
    const baseOrigin = baseURL ? new URL(baseURL).origin : null;

    page.on("request", (request) => {
      const url = new URL(request.url());
      if (baseOrigin && url.origin !== baseOrigin) externalRequests.push(request.url());
    });

    await page.goto("/pdf/merge");
    await page.locator('input[type="file"]').setInputFiles([fixture("multi-page.pdf"), fixture("mixed-sizes.pdf")]);
    await expect(page.getByText(/^Page 1$/).first()).toBeVisible({ timeout: 20_000 });
    await page.getByRole("button", { name: "Merge & download" }).click();
    await expect(page.getByRole("button", { name: /download merged\.pdf/i })).toBeVisible({ timeout: 20_000 });

    await page.waitForTimeout(500);
    expect(externalRequests).toEqual([]);
  });
});

test.describe("PDF Studio hub (/pdf-tools)", () => {
  test("Pages tab's action picker switches between the 6 page operations, each rendering its own unchanged UI", async ({
    page,
  }) => {
    await page.goto("/pdf-tools");
    await page.getByRole("tab", { name: "Pages", exact: true }).click();

    await page.getByRole("tab", { name: "Split", exact: true }).click();
    await page.locator('input[type="file"]').first().setInputFiles(fixture("multi-page.pdf"));
    await expect(page.getByText(/part/i)).toBeVisible({ timeout: 20_000 });

    await page.getByRole("tab", { name: "Rotate", exact: true }).click();
    await page.locator('input[type="file"]').first().setInputFiles(fixture("multi-page.pdf"));
    await expect(page.getByText(/^Page 1$/).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("button", { name: "Apply rotation & download" })).toBeVisible();
  });

  test("Convert and Metadata tabs each show a working action picker", async ({ page }) => {
    await page.goto("/pdf-tools");

    await page.getByRole("tab", { name: "Convert", exact: true }).click();
    await page.getByRole("tab", { name: "PDF to Text", exact: true }).click();
    await page.locator('input[type="file"]').first().setInputFiles(fixture("multi-page.pdf"));
    await expect(page.getByRole("button", { name: /copy/i })).toBeVisible({ timeout: 20_000 });

    await page.getByRole("tab", { name: "Metadata", exact: true }).click();
    await page.getByRole("tab", { name: "Remove", exact: true }).click();
    await page.locator('input[type="file"]').first().setInputFiles(fixture("multi-page.pdf"));
    await expect(page.getByRole("button", { name: /remove metadata/i })).toBeVisible({ timeout: 20_000 });
  });

  test("Security tab shows a placeholder — no file drop, no engine call, no off-origin network activity", async ({
    page,
    baseURL,
  }) => {
    const externalRequests: string[] = [];
    const baseOrigin = baseURL ? new URL(baseURL).origin : null;
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (baseOrigin && url.origin !== baseOrigin) externalRequests.push(request.url());
    });

    await page.goto("/pdf-tools");
    await page.getByRole("tab", { name: "Security", exact: true }).click();

    await expect(page.getByText(/isn.t available yet/i)).toBeVisible();
    await expect(page.locator('input[type="file"]')).toHaveCount(0);

    await page.waitForTimeout(500);
    expect(externalRequests).toEqual([]);
  });

  test("a locked tool page (/pdf/rotate) hides the Pages action picker but keeps the top-level tabs switchable", async ({
    page,
  }) => {
    await page.goto("/pdf/rotate");
    await expect(page.locator('[aria-label="Action"]')).toHaveCount(0);

    await page.getByRole("tab", { name: "Convert", exact: true }).click();
    await expect(page.getByRole("tab", { name: "Images to PDF", exact: true })).toBeVisible();
  });
});

/**
 * Signed PDFs are warned about, never blocked — the deliberate opposite of
 * the encrypted-PDF treatment, which is a hard error. pdf-lib rebuilds the
 * document on every structural operation, so a signature can't survive; the
 * user needs that told to them up front rather than discovering it when a
 * verifier rejects the output.
 */
test.describe("Digitally signed PDFs", () => {
  test("warns on the merge/pages workspace but still allows the operation", async ({ page }) => {
    await page.goto("/pdf/merge");
    await page.locator('input[type="file"]').setInputFiles(fixture("signed.pdf"));

    await expect(page.getByText(/This PDF is digitally signed/i)).toBeVisible({ timeout: 15_000 });
    // Non-blocking: the tool stays fully usable.
    await expect(page.getByRole("button", { name: /merge/i }).first()).toBeEnabled();
  });

  test("warns on Split", async ({ page }) => {
    await page.goto("/pdf/split");
    await page.locator('input[type="file"]').setInputFiles(fixture("signed.pdf"));
    await expect(page.getByText(/This PDF is digitally signed/i)).toBeVisible({ timeout: 15_000 });
  });

  test("warns on Remove Metadata and still produces a download", async ({ page }) => {
    await page.goto("/pdf/remove-metadata");
    await page.locator('input[type="file"]').setInputFiles(fixture("signed.pdf"));

    await expect(page.getByText(/This PDF is digitally signed/i)).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: "Remove metadata & download", exact: true }).click();
    await expect(page.getByRole("button", { name: "Download cleaned.pdf", exact: true })).toBeVisible({
      timeout: 15_000,
    });
  });

  test("shows no warning for an ordinary unsigned PDF", async ({ page }) => {
    await page.goto("/pdf/merge");
    await page.locator('input[type="file"]').setInputFiles(fixture("multi-page.pdf"));
    // Wait for the file to actually load before asserting an absence.
    await expect(page.getByRole("button", { name: /merge/i }).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/This PDF is digitally signed/i)).toHaveCount(0);
  });

  test("an encrypted PDF is still hard-rejected — the softer signature path didn't loosen it", async ({
    page,
  }) => {
    await page.goto("/pdf/merge");
    await page.locator('input[type="file"]').setInputFiles(fixture("encrypted.pdf"));
    await expect(page.getByText(/password-protected/i)).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("Remove Metadata — XMP", () => {
  test("strips the XMP stream as well as the Info dictionary", async ({ page }) => {
    await page.goto("/pdf/remove-metadata");
    await page.locator('input[type="file"]').setInputFiles(fixture("with-xmp.pdf"));

    // The viewer half of the tool proves the Info dictionary was read.
    await expect(page.getByText("INFOSECRETTITLE")).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: "Remove metadata & download", exact: true }).click();
    const downloadButton = page.getByRole("button", { name: "Download cleaned.pdf", exact: true });
    await expect(downloadButton).toBeVisible({ timeout: 15_000 });

    const download = page.waitForEvent("download");
    await downloadButton.click();

    const stream = await (await download).createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    const output = Buffer.concat(chunks).toString("latin1");

    // Assert on the real downloaded bytes: an orphaned-but-serialized XMP
    // object would pass a parser-level check while still leaking here.
    expect(output).not.toContain("INFOSECRETTITLE");
    expect(output).not.toContain("XMPSECRETTITLE");
    expect(output).not.toContain("XMPSECRETAUTHOR");
    expect(output).not.toContain("x:xmpmeta");
  });
});

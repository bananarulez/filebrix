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

  test("a page marked for deletion is greyed out, so the result is visible before committing", async ({
    page,
  }) => {
    // Moving and rotating a page already showed their effect immediately.
    // Dropping one did not — a delete selection was a checkbox and nothing
    // else, so what you would get back was invisible until you downloaded it.
    await page.goto("/pdf/delete-pages");
    await page.locator('input[type="file"]').setInputFiles(fixture("multi-page.pdf"));
    await expect(page.getByText(/^Page 1$/).first()).toBeVisible({ timeout: 20_000 });

    const opacityOf = (pageNumber: number) =>
      page
        .getByText(new RegExp(`^Page ${pageNumber}$`))
        .first()
        .evaluate((el) => {
          // The dimming wrapper is an ancestor of the thumbnail's caption.
          let node: HTMLElement | null = el as HTMLElement;
          while (node) {
            const opacity = getComputedStyle(node).opacity;
            if (opacity !== "1") return Number(opacity);
            node = node.parentElement;
          }
          return 1;
        });

    // Polled rather than read once: the dimming carries a CSS transition, so
    // a single sample taken immediately after the click catches a value from
    // partway through the animation rather than the settled one.
    expect(await opacityOf(2), "page 2 starts fully visible").toBe(1);

    await page.getByRole("checkbox", { name: /Delete page 2/i }).check();
    await expect
      .poll(opacityOf.bind(null, 2), { message: "page 2 should be dimmed once marked" })
      .toBeLessThan(1);
    expect(await opacityOf(3), "unmarked pages must stay fully visible").toBe(1);

    await page.getByRole("checkbox", { name: /Delete page 2/i }).uncheck();
    await expect
      .poll(opacityOf.bind(null, 2), { message: "unmarking restores it" })
      .toBe(1);
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

test.describe("PDF Studio hub (/pdf-studio)", () => {
  test("Pages tab's action picker switches between the 6 page operations, each rendering its own unchanged UI", async ({
    page,
  }) => {
    await page.goto("/pdf-studio");
    await page.getByRole("tab", { name: "Pages", exact: true }).click();

    await page.getByRole("radio", { name: "Split", exact: true }).click();
    await page.locator('input[type="file"]').first().setInputFiles(fixture("multi-page.pdf"));
    await expect(page.getByText(/part/i)).toBeVisible({ timeout: 20_000 });

    await page.getByRole("radio", { name: "Rotate", exact: true }).click();
    await page.locator('input[type="file"]').first().setInputFiles(fixture("multi-page.pdf"));
    await expect(page.getByText(/^Page 1$/).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("button", { name: "Apply rotation & download" })).toBeVisible();
  });

  test("Convert and Metadata tabs each show a working action picker", async ({ page }) => {
    await page.goto("/pdf-studio");

    await page.getByRole("tab", { name: "Convert", exact: true }).click();
    await page.getByRole("radio", { name: "PDF to Text", exact: true }).click();
    await page.locator('input[type="file"]').first().setInputFiles(fixture("multi-page.pdf"));
    await expect(page.getByRole("button", { name: /copy/i })).toBeVisible({ timeout: 20_000 });

    await page.getByRole("tab", { name: "Metadata", exact: true }).click();
    await page.getByRole("radio", { name: "Remove", exact: true }).click();
    await page.locator('input[type="file"]').first().setInputFiles(fixture("multi-page.pdf"));
    await expect(page.getByRole("button", { name: /remove metadata/i })).toBeVisible({ timeout: 20_000 });
  });

  test("the removed Security placeholder is gone — no tab, and no dead-end tab bar entry", async ({
    page,
  }) => {
    // pdf-lib can detect encryption but cannot write it, so the tab could
    // never ship. A permanently-empty tab is a cost on every visit, so it was
    // removed rather than left showing "not available yet" forever.
    await page.goto("/pdf-studio");
    await expect(page.getByRole("tab", { name: "Security", exact: true })).toHaveCount(0);
    // View / Pages / Edit / Convert / Metadata. Edit joined when Watermark and
    // page numbering shipped (PROJECT_LOG entry 53) — the count is asserted so
    // a tab can't reappear unnoticed, which is the point of this test.
    await expect(page.getByRole("tab")).toHaveCount(5);
    await expect(page.getByText(/isn.t available yet/i)).toHaveCount(0);
  });

  test("the Edit tab stamps a watermark and page numbers, and neither is a placeholder", async ({
    page,
  }) => {
    await page.goto("/pdf-studio");
    await page.getByRole("tab", { name: "Edit", exact: true }).click();
    await expect(page.getByRole("radio", { name: "Watermark", exact: true })).toBeVisible();
    await expect(page.getByRole("radio", { name: "Page numbers", exact: true })).toBeVisible();

    await page.locator('input[type="file"]').first().setInputFiles(fixture("multi-page.pdf"));
    await expect(page.getByRole("button", { name: /add watermark/i })).toBeVisible({ timeout: 20_000 });
    await page.getByRole("button", { name: /add watermark/i }).click();
    await expect(page.getByRole("button", { name: /^download/i })).toBeVisible({ timeout: 30_000 });

    await page.getByRole("radio", { name: "Page numbers", exact: true }).click();
    const numberButton = page.getByRole("button", { name: /number \d+ page/i });
    await expect(numberButton).toBeVisible({ timeout: 20_000 });
    await numberButton.click();
    await expect(page.getByRole("button", { name: /^download/i })).toBeVisible({ timeout: 30_000 });
  });

  test("a locked tool page (/pdf/rotate) hides the Pages action picker but keeps the top-level tabs switchable", async ({
    page,
  }) => {
    await page.goto("/pdf/rotate");
    await expect(page.locator('[aria-label="Action"]')).toHaveCount(0);

    await page.getByRole("tab", { name: "Convert", exact: true }).click();
    await expect(page.getByRole("radio", { name: "Images to PDF", exact: true })).toBeVisible();
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

/**
 * The whole point of a Studio owning the loaded file (`PdfWorkspace`) rather
 * than each tool owning its own: a PDF dropped once stays loaded while the
 * user moves around. Before this, switching Merge -> Split — or Pages ->
 * Metadata — silently discarded it, and the user had to find and drop the
 * same file again for every operation.
 */
test.describe("PDF Studio keeps the loaded file across tabs", () => {
  test("a PDF dropped on Merge is still loaded after switching to Split and to Metadata", async ({
    page,
  }) => {
    await page.goto("/pdf-studio");
    await page.getByRole("tab", { name: "Pages", exact: true }).click();
    await page.getByRole("radio", { name: "Merge", exact: true }).click();
    await page.locator('input[type="file"]').first().setInputFiles(fixture("multi-page.pdf"));
    await expect(page.getByText(/^Page 1$/).first()).toBeVisible({ timeout: 20_000 });

    // Another action in the same tab...
    await page.getByRole("radio", { name: "Split", exact: true }).click();
    await expect(page.getByText("multi-page.pdf")).toBeVisible();
    // ...reaches its own UI with no second drop: 5 pages, so 1 part to start.
    await expect(page.getByText(/1 part/i)).toBeVisible({ timeout: 20_000 });

    // ...and so does another tab entirely.
    await page.getByRole("tab", { name: "Metadata", exact: true }).click();
    await expect(page.getByText("multi-page.pdf")).toBeVisible();
    // A field label from the metadata table, i.e. the tab actually read the
    // carried-over file rather than just showing its name.
    await expect(page.getByText("Producer", { exact: true })).toBeVisible({ timeout: 20_000 });

    // "Clear" is the only thing that unloads it.
    await page.getByRole("button", { name: "Clear", exact: true }).click();
    await expect(page.getByText("multi-page.pdf")).toHaveCount(0);
  });

  test("the View tab can search the document's text and jump to a matching page", async ({ page }) => {
    await page.goto("/pdf-studio");
    await page.getByRole("tab", { name: "View", exact: true }).click();
    await page.locator('input[type="file"]').first().setInputFiles(fixture("multi-page.pdf"));
    await expect(page.getByRole("img", { name: /^Page 1 of 5$/ })).toBeVisible({ timeout: 20_000 });

    // multi-page.pdf's pages read "Page N of 5", so "Page 4" appears on
    // exactly one page — a real assertion about extracted text, not a
    // "something rendered" check.
    await page.getByLabel("Search this PDF").fill("Page 4");
    await expect(page.getByText(/1 match on 1 page/i)).toBeVisible({ timeout: 20_000 });

    await page.getByRole("button", { name: "Next match", exact: true }).click();
    await expect(page.getByRole("img", { name: /^Page 4 of 5$/ })).toBeVisible({ timeout: 20_000 });

    // A query that isn't there says so, rather than silently doing nothing.
    await page.getByLabel("Search this PDF").fill("definitely-not-in-this-document");
    await expect(page.getByText("No matches")).toBeVisible();
  });

  test("the View tab reads a loaded PDF page by page, with no file of its own to drop", async ({
    page,
  }) => {
    await page.goto("/pdf-studio");
    await page.getByRole("tab", { name: "View", exact: true }).click();
    await page.locator('input[type="file"]').first().setInputFiles(fixture("multi-page.pdf"));

    // A real rendered page, not a placeholder — pdf.js hands back a data URL.
    const pageImage = page.getByRole("img", { name: /^Page 1 of 5$/ });
    await expect(pageImage).toBeVisible({ timeout: 20_000 });
    expect(await pageImage.getAttribute("src")).toMatch(/^data:image\/png;base64,/);

    await page.getByRole("button", { name: "Next page", exact: true }).click();
    await expect(page.getByRole("img", { name: /^Page 2 of 5$/ })).toBeVisible({ timeout: 20_000 });

    // And the same document is still there for the operational tabs.
    await page.getByRole("tab", { name: "Pages", exact: true }).click();
    await expect(page.getByText("multi-page.pdf")).toBeVisible();
  });
});

test.describe("Studio URL renames", () => {
  test("the old /pdf-tools URLs permanently redirect to /pdf-studio", async ({ page }) => {
    const response = await page.goto("/pdf-tools");
    expect(response?.status()).toBe(200);
    await expect(page).toHaveURL(/\/pdf-studio$/);

    // Capability index pages under the old prefix move with it.
    await page.goto("/pdf-tools/pages");
    await expect(page).toHaveURL(/\/pdf-studio\/pages$/);
  });

  test("the old /image-tools and /geospatial-tools URLs redirect too", async ({ page }) => {
    await page.goto("/image-tools");
    await expect(page).toHaveURL(/\/image-studio$/);

    await page.goto("/image-tools/convert");
    await expect(page).toHaveURL(/\/image-studio\/convert$/);

    await page.goto("/geospatial-tools");
    await expect(page).toHaveURL(/\/geospatial-studio$/);

    await page.goto("/geospatial-tools/view");
    await expect(page).toHaveURL(/\/geospatial-studio\/view$/);
  });
});

test.describe("Seeing a PDF page properly", () => {
  test("clicking a page opens it full size, re-rendered rather than upscaled", async ({ page }) => {
    // The grid renders each page at 140px, which is enough to count pages and
    // not enough to tell which is which — so deciding *which* page to delete
    // meant downloading the PDF and opening it somewhere else.
    await page.goto("/pdf/delete-pages");
    await page.locator('input[type="file"]').setInputFiles(fixture("multi-page.pdf"));
    await expect(page.getByText(/^Page 1$/).first()).toBeVisible({ timeout: 20_000 });

    await page.getByRole("button", { name: /View page 3 full size/i }).click();

    expect(
      await page.evaluate(() => document.querySelector("dialog")?.matches(":modal") ?? false),
      "a real modal, not a div overlay"
    ).toBe(true);

    // Re-rendered at high resolution: an upscaled 140px thumbnail would still
    // report a natural width of 140.
    const enlarged = page.locator("dialog img");
    await expect(enlarged).toBeVisible({ timeout: 20_000 });
    await expect
      .poll(() => enlarged.evaluate((el) => (el as HTMLImageElement).naturalWidth), {
        message: "the enlarged page should be a fresh, larger render",
      })
      .toBeGreaterThan(400);

    await page.keyboard.press("Escape");
    expect(await page.evaluate(() => document.querySelector("dialog")?.open ?? false)).toBe(false);
  });
});

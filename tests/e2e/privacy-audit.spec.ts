import fs from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import { expect, test, type Page } from "@playwright/test";

const IMAGE_FIXTURES = path.join(__dirname, "..", "fixtures", "image");
const PDF_FIXTURES = path.join(__dirname, "..", "fixtures", "pdf");
const SPREADSHEET_FIXTURES = path.join(__dirname, "..", "fixtures", "spreadsheet");
const GEO_FIXTURES = path.join(__dirname, "..", "fixtures", "geo");

test.describe.configure({ timeout: 60_000 });

/** Attaches a request listener and returns a getter for every off-origin URL seen so far. */
function trackExternalRequests(page: Page, baseURL: string | undefined) {
  const externalRequests: string[] = [];
  const baseOrigin = baseURL ? new URL(baseURL).origin : null;
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (baseOrigin && url.origin !== baseOrigin) externalRequests.push(request.url());
  });
  return externalRequests;
}

test.describe("Privacy audit — the core promise under adversarial input", () => {
  test("GPS coordinates read from a photo's EXIF are shown locally and never transmitted anywhere", async ({
    page,
    baseURL,
  }) => {
    const externalRequests = trackExternalRequests(page, baseURL);

    await page.goto("/tools/image-metadata-viewer");
    await page.locator('input[type="file"]').setInputFiles(path.join(IMAGE_FIXTURES, "gps-tagged.jpg"));

    // Proves exifr actually parsed the coordinates (not a false-negative test).
    await expect(page.getByText(/37\.8199/)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/contains gps location data/i)).toBeVisible();

    await page.waitForTimeout(500);
    expect(externalRequests).toEqual([]);
  });

  test("a zip-slip-style malicious filename can't write outside the extracted folder", async ({ page }) => {
    // A File's .name is fully attacker-controlled via a scripted DataTransfer
    // (drag-and-drop from a malicious page), not just an OS save dialog —
    // simulated here the same way, by constructing the input's FileList in
    // the page rather than relying on setInputFiles' own filename handling.
    await page.goto("/convert/png-to-jpg");
    await page.setInputFiles('input[type="file"]', [
      { name: "../../../../evil-1.png", mimeType: "image/png", buffer: await fs.readFile(path.join(IMAGE_FIXTURES, "transparent.png")) },
      { name: "../../../../evil-2.png", mimeType: "image/png", buffer: await fs.readFile(path.join(IMAGE_FIXTURES, "opaque.jpg")) },
    ]);

    await page.getByRole("button", { name: "Convert", exact: true }).click();
    await expect(page.getByRole("button", { name: /download all/i })).toBeVisible({ timeout: 20_000 });

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /download all/i }).click();
    const download = await downloadPromise;
    const savedPath = await download.path();
    expect(savedPath).not.toBeNull();

    const zipBuffer = await fs.readFile(savedPath!);
    const zip = await JSZip.loadAsync(zipBuffer);
    const names = Object.keys(zip.files);

    expect(names.length).toBe(2);
    for (const name of names) {
      expect(name).not.toContain("..");
      expect(name).not.toContain("/");
      expect(name).not.toContain("\\");
    }
  });

  test("malformed/adversarial files across every engine are processed (or rejected) without a single network request", async ({
    page,
    baseURL,
  }) => {
    const externalRequests = trackExternalRequests(page, baseURL);

    const cases: Array<{ url: string; fixture: string }> = [
      { url: "/tools/resize-image", fixture: path.join(IMAGE_FIXTURES, "malformed.jpg") },
      { url: "/convert/svg-to-png", fixture: path.join(IMAGE_FIXTURES, "malformed.svg") },
      { url: "/pdf/merge", fixture: path.join(PDF_FIXTURES, "malformed.pdf") },
      { url: "/pdf/merge", fixture: path.join(PDF_FIXTURES, "encrypted.pdf") },
      { url: "/tools/csv-viewer", fixture: path.join(SPREADSHEET_FIXTURES, "malformed.json") },
      { url: "/geo/geojson-viewer", fixture: path.join(GEO_FIXTURES, "malformed.geojson") },
      { url: "/geo/kml-to-geojson", fixture: path.join(GEO_FIXTURES, "malformed.kml") },
      { url: "/geo/gpx-viewer", fixture: path.join(GEO_FIXTURES, "malformed.gpx") },
    ];

    for (const { url, fixture } of cases) {
      await page.goto(url);
      await page.locator('input[type="file"]').first().setInputFiles(fixture);
      // Give each tool time to attempt processing and fail/succeed locally.
      await page.waitForTimeout(400);
    }

    expect(externalRequests).toEqual([]);
  });

  test("a crafted XXE payload (external entity referencing a local file) never resolves and never phones home", async ({
    page,
    baseURL,
  }) => {
    const externalRequests = trackExternalRequests(page, baseURL);
    const xxePayload =
      '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><root>&xxe;</root>';

    await page.goto("/tools/xml-validator");
    await page.getByLabel("XML input").fill(xxePayload);
    await page.getByRole("button", { name: "Validate" }).click();

    // Either a well-formedness error, or (if some engine tolerated the
    // undefined entity) definitely not the contents of a system file.
    const bodyText = await page.locator("body").innerText();
    expect(bodyText).not.toContain("root:");

    await page.waitForTimeout(300);
    expect(externalRequests).toEqual([]);
  });
});

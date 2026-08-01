import path from "node:path";
import { expect, test } from "@playwright/test";

const FIXTURES_DIR = path.join(__dirname, "..", "fixtures", "geo");

function fixture(name: string): string {
  return path.join(FIXTURES_DIR, name);
}

test.describe.configure({ timeout: 60_000 });

async function selectFile(page: import("@playwright/test").Page, url: string, filePath: string) {
  await page.goto(url);
  await page.locator('input[type="file"]').setInputFiles(filePath);
}

test.describe("GeoJSON Viewer", () => {
  test("shows feature stats and renders the map for a mixed-geometry dataset", async ({ page }) => {
    await selectFile(page, "/geo/geojson-viewer", fixture("sample.geojson"));

    await expect(page.getByText("Features", { exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("3", { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/Point \(1\)/)).toBeVisible();
    await expect(page.getByText(/LineString \(1\)/)).toBeVisible();
    await expect(page.getByText(/Polygon \(1\)/)).toBeVisible();
    await expect(page.getByText("City Hall", { exact: true })).toBeVisible();
    await expect(page.locator(".maplibregl-canvas")).toBeVisible({ timeout: 15_000 });
  });

  test("renders the map inside its own container, and renders the dropped polygon on it — not just the basemap", {
    tag: "@cross-browser",
  }, async ({
    page,
  }) => {
    // Sanity check for a real bug found in local dev: MapLibre's own
    // `Map.remove()` unconditionally strips the `maplibregl-map` class
    // (which supplies `position: relative`) from its *shared* container
    // element, and `Map.remove()` can run for a stale, React-Strict-Mode-
    // cancelled instance *after* the surviving instance has already
    // attached — stripping the class the live map still depends on.
    // Without it, the canvas (`position: absolute`) has no positioned
    // ancestor and falls back to the viewport, rendering at the page's
    // top-left instead of inside the map's own box. `GeoMap.tsx` now sets
    // `relative` itself, defensively, regardless of MapLibre's own class.
    // Note this assertion can't actually *catch* a regression here: Strict
    // Mode's double-effect-invocation (the trigger) is dev-only — React
    // doesn't do it in the production build this e2e suite runs against —
    // so this only verifies normal positioning, not the specific race. The
    // fix still matters for everyday `npm run dev` use, which is where a
    // real screenshot from this exact scenario first surfaced it.
    await selectFile(page, "/geo/geojson-viewer", fixture("polygon.geojson"));
    const canvas = page.locator(".maplibregl-canvas");
    await expect(canvas).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(500); // let layout/position settle before measuring it

    const canvasBox = await canvas.boundingBox();
    expect(canvasBox).not.toBeNull();
    // The map sits well below the header/breadcrumb/stats — a canvas near
    // the viewport's top-left (y close to 0) means it escaped its container.
    expect(canvasBox!.y).toBeGreaterThan(300);

    // Second regression: MapLibre's own worker-URL auto-discovery
    // (`new URL("./maplibre-gl-worker.mjs", import.meta.url)`) assumes its
    // module is served from the same directory as its worker script — true
    // for the raw npm package, false once bundled into a hashed chunk URL.
    // Without `setWorkerUrl()` pointing at the self-hosted copy
    // (scripts/copy-maplibre-assets.mjs), the GeoJSON source's tiling
    // worker never starts, so it silently never finishes loading — no
    // thrown error, no failed request — while the raster basemap (which
    // doesn't need this worker) renders fine regardless. That combination
    // is exactly what made the bug easy to miss: the map visibly "works."
    // Verified here by sampling the actual composited pixel at the
    // polygon's fitted center, via the browser's own screenshot decode
    // (a live WebGL canvas can't be read with plain `drawImage` — its
    // drawing buffer clears after compositing — so this captures a real
    // screenshot and decodes *that* instead, the same technique
    // tests/e2e/image-tools.spec.ts uses for the image engine's output).
    // Polled rather than sampled once after a fixed delay: a single sample
    // after a hardcoded wait flaked under system load (tile fetch + the
    // GeoJSON worker round-trip took a little longer than the wait, not a
    // real rendering bug — confirmed by re-running in isolation, where it
    // passed) — retrying the actual condition is what a fixed sleep can't
    // give you.
    await expect
      .poll(
        async () => {
          const png = await canvas.screenshot();
          const base64 = png.toString("base64");
          const color = await page.evaluate(async (dataUrl) => {
            const img = new Image();
            await new Promise<void>((resolve, reject) => {
              img.onload = () => resolve();
              img.onerror = () => reject(new Error("image failed to decode"));
              img.src = dataUrl;
            });
            const off = document.createElement("canvas");
            off.width = img.width;
            off.height = img.height;
            const ctx = off.getContext("2d")!;
            ctx.drawImage(img, 0, 0);
            const [r, g, b] = ctx.getImageData(Math.floor(img.width / 2), Math.floor(img.height / 2), 1, 1).data;
            return { r, g, b };
          }, `data:image/png;base64,${base64}`);
          // The polygon fill is #2563eb at 25% opacity over a light-gray/
          // white basemap — distinctly blue-tinted (blue channel clearly
          // exceeds red), unlike any plausible basemap tone at this location.
          return color.b - color.r;
        },
        { message: "expected the polygon's blue fill to be visible at the canvas center", timeout: 15_000 }
      )
      .toBeGreaterThan(15);
  });

  test("shows every dropped feature in the list, not a 5-row-capped preview", async ({ page }) => {
    await selectFile(page, "/geo/geojson-viewer", fixture("many-points.geojson"));
    await expect(page.getByText("Features (7)", { exact: false })).toBeVisible({ timeout: 15_000 });
    for (let i = 1; i <= 7; i++) {
      await expect(page.getByRole("cell", { name: `Point ${i}`, exact: true })).toBeVisible();
    }
  });

  test("the feature list's Type column shows the real geometry type, even when a feature's own name doesn't", async ({
    page,
  }) => {
    await selectFile(page, "/geo/geojson-viewer", fixture("weird-names.geojson"));
    await expect(page.getByRole("columnheader", { name: "Type", exact: true })).toBeVisible({ timeout: 15_000 });

    const polygonRow = page.getByRole("row").filter({ has: page.getByRole("cell", { name: "asdf123", exact: true }) });
    await expect(polygonRow.getByRole("cell", { name: "Polygon", exact: true })).toBeVisible();

    const pointRow = page.getByRole("row").filter({ has: page.getByRole("cell", { name: "!!zzz!!", exact: true }) });
    await expect(pointRow.getByRole("cell", { name: "Point", exact: true })).toBeVisible();

    const lineRow = page.getByRole("row").filter({ has: page.getByRole("cell", { name: "xx_99", exact: true }) });
    await expect(lineRow.getByRole("cell", { name: "LineString", exact: true })).toBeVisible();
  });

  test("clicking a feature row highlights it on the map, shows its coordinates, and Clear selection removes both", async ({
    page,
  }) => {
    await selectFile(page, "/geo/geojson-viewer", fixture("many-points.geojson"));
    await expect(page.getByRole("cell", { name: "Point 3", exact: true })).toBeVisible({ timeout: 15_000 });

    const row = page.getByRole("row").filter({ has: page.getByRole("cell", { name: "Point 3", exact: true }) });
    await row.click();

    await expect(row).toHaveAttribute("aria-selected", "true");
    const detail = page.getByText(/Selected feature — Point/);
    await expect(detail).toBeVisible();
    // many-points.geojson's 3rd feature is at [14.43, 50.082] — shown as "lat, lng".
    await expect(page.getByText(/50\.082000, 14\.430000/)).toBeVisible();

    await page.getByRole("button", { name: "Clear selection" }).click();
    await expect(detail).not.toBeVisible();
    await expect(row).toHaveAttribute("aria-selected", "false");
  });

  test("the map provides a fullscreen control", async ({ page }) => {
    await selectFile(page, "/geo/geojson-viewer", fixture("polygon.geojson"));
    await expect(page.locator(".maplibregl-ctrl-fullscreen")).toBeVisible({ timeout: 15_000 });
  });

  test("switching the basemap style requests tiles from the newly selected style", async ({ page }) => {
    await selectFile(page, "/geo/geojson-viewer", fixture("polygon.geojson"));
    await expect(page.locator(".maplibregl-canvas")).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(1500); // let the default (light) style's own tiles start first

    const darkTileRequest = page.waitForRequest((request) => request.url().includes("dark_all"), {
      timeout: 15_000,
    });
    await page.getByLabel("Basemap style").selectOption("dark");
    await expect(await darkTileRequest).toBeTruthy();
  });

  test("switching the basemap — including the very first switch — preserves the loaded GeoJSON on the map", async ({
    page,
  }) => {
    // Regression test for a real bug: MapLibre's setStyle() diffs against
    // the current style and, when the diff can be applied without a full
    // rebuild, fires "style.load" *synchronously* inside that same
    // setStyle() call. maplibreClient.ts's waitForLayers() used to call
    // map.setStyle() first and register map.once("style.load", ...)
    // afterward — a race that could miss a synchronous fire outright,
    // permanently losing the user's dropped features on that particular
    // switch (verified locally to reproduce specifically on the first-ever
    // switch, though the underlying race isn't inherently first-switch-
    // specific). Fixed by registering the listener before triggering the
    // style change. Uses the same blue-fill pixel-sampling technique as
    // "renders the dropped polygon on it" above, polled since a live
    // WebGL canvas can't be read with plain drawImage.
    await selectFile(page, "/geo/geojson-viewer", fixture("polygon.geojson"));
    const canvas = page.locator(".maplibregl-canvas");
    await expect(canvas).toBeVisible({ timeout: 15_000 });

    async function blueness(): Promise<number> {
      const png = await canvas.screenshot();
      const base64 = png.toString("base64");
      const color = await page.evaluate(async (dataUrl) => {
        const img = new Image();
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error("image failed to decode"));
          img.src = dataUrl;
        });
        const off = document.createElement("canvas");
        off.width = img.width;
        off.height = img.height;
        const ctx = off.getContext("2d")!;
        ctx.drawImage(img, 0, 0);
        const [r, g, b] = ctx.getImageData(Math.floor(img.width / 2), Math.floor(img.height / 2), 1, 1).data;
        return { r, g, b };
      }, `data:image/png;base64,${base64}`);
      return color.b - color.r;
    }

    await expect
      .poll(blueness, { message: "polygon fill visible before any basemap switch", timeout: 15_000 })
      .toBeGreaterThan(15);

    // The very first switch is the one that reproduced the bug.
    await page.getByLabel("Basemap style").selectOption("dark");
    await expect
      .poll(blueness, { message: "polygon fill visible after the first basemap switch", timeout: 15_000 })
      .toBeGreaterThan(15);

    // Switching back must also still show it — confirms this isn't merely
    // "the new style happens to already have the data," but a real
    // restore cycle that keeps working both directions.
    await page.getByLabel("Basemap style").selectOption("light");
    await expect
      .poll(blueness, { message: "polygon fill visible after switching back", timeout: 15_000 })
      .toBeGreaterThan(15);
  });

  test("handles a large feature collection without freezing", async ({ page }) => {
    await selectFile(page, "/geo/geojson-viewer", fixture("large.geojson"));
    await expect(page.getByText("5,000", { exact: true }).first()).toBeVisible({ timeout: 30_000 });
  });

  test("shows a friendly error for malformed GeoJSON", async ({ page }) => {
    await selectFile(page, "/geo/geojson-viewer", fixture("malformed.geojson"));
    await expect(page.getByRole("alert")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/never uploaded/i)).toBeVisible();
  });
});

test.describe("GeoJSON Validator", () => {
  test("reports a clean file as valid", async ({ page }) => {
    await selectFile(page, "/geo/geojson-validator", fixture("sample.geojson"));
    await expect(page.getByText(/no problems found/i)).toBeVisible({ timeout: 15_000 });
  });

  test("lists auto-fixable issues and only changes the file after an explicit repair click", async ({ page }) => {
    await selectFile(page, "/geo/geojson-validator", fixture("repairable.geojson"));

    await expect(page.getByText(/isn't closed/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/"properties"/)).toBeVisible();
    const repairButton = page.getByRole("button", { name: /repair automatically/i });
    await expect(repairButton).toBeVisible();
    await expect(page.getByRole("button", { name: /download repaired geojson/i })).not.toBeVisible();

    await repairButton.click();

    await expect(page.getByText(/closed 1 unclosed polygon ring/i)).toBeVisible({ timeout: 15_000 });
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /download repaired geojson/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("repairable.geojson");
  });

  test("shows a friendly error for malformed GeoJSON", async ({ page }) => {
    await selectFile(page, "/geo/geojson-validator", fixture("malformed.geojson"));
    await expect(page.getByRole("alert")).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("GeoJSON Simplifier", () => {
  test("reduces vertex count and offers a download", async ({ page }) => {
    await selectFile(page, "/geo/geojson-simplifier", fixture("sample.geojson"));
    await page.getByRole("button", { name: /medium \(0\.001/i }).click();
    await page.getByRole("button", { name: /^simplify$/i }).click();

    await expect(page.getByText("Vertices before", { exact: true })).toBeVisible({ timeout: 15_000 });
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /download simplified geojson/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("sample.geojson");
  });
});

test.describe("KML ↔ GeoJSON", () => {
  test("kml-to-geojson converts and downloads", async ({ page }) => {
    await selectFile(page, "/geo/kml-to-geojson", fixture("sample.kml"));
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /download \.geojson/i }).click({ timeout: 15_000 });
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("sample.geojson");
  });

  test("geojson-to-kml converts and downloads", async ({ page }) => {
    await selectFile(page, "/geo/geojson-to-kml", fixture("sample.geojson"));
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /download \.kml/i }).click({ timeout: 15_000 });
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("sample.kml");
  });

  test("shows a friendly error for malformed KML", async ({ page }) => {
    await selectFile(page, "/geo/kml-to-geojson", fixture("malformed.kml"));
    await expect(page.getByRole("alert")).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("GPX Viewer", () => {
  test("shows distance, elevation stats and an elevation profile", async ({ page }) => {
    await selectFile(page, "/geo/gpx-viewer", fixture("sample.gpx"));

    await expect(page.getByText("Distance", { exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Elevation gain", { exact: true })).toBeVisible();
    await expect(page.getByText(/105 m/)).toBeVisible(); // gain: 35+35+35 = 105 (10→45→80→60→95)
    await expect(page.getByRole("img", { name: /elevation profile/i })).toBeVisible();
    await expect(page.locator(".maplibregl-canvas")).toBeVisible({ timeout: 15_000 });
  });

  test("shows a friendly error for malformed GPX", async ({ page }) => {
    await selectFile(page, "/geo/gpx-viewer", fixture("malformed.gpx"));
    await expect(page.getByRole("alert")).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("GPX → GeoJSON / KML", () => {
  test("gpx-to-geojson converts and downloads", async ({ page }) => {
    await selectFile(page, "/geo/gpx-to-geojson", fixture("sample.gpx"));
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /download \.geojson/i }).click({ timeout: 15_000 });
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("sample.geojson");
  });

  test("gpx-to-kml converts and downloads", async ({ page }) => {
    await selectFile(page, "/geo/gpx-to-kml", fixture("sample.gpx"));
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /download \.kml/i }).click({ timeout: 15_000 });
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("sample.kml");
  });
});

test.describe("GeoJSON ↔ CSV", () => {
  test("geojson-to-csv converts and downloads", async ({ page }) => {
    await selectFile(page, "/geo/geojson-to-csv", fixture("sample.geojson"));
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /download \.csv/i }).click({ timeout: 15_000 });
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("sample.csv");
  });

  test("csv-to-geojson auto-detects columns, converts, and downloads", async ({ page }) => {
    await selectFile(page, "/geo/csv-to-geojson", fixture("coordinates.csv"));

    await expect(page.getByText("Choose the coordinate columns")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByLabel(/latitude column/i)).toHaveValue("latitude");
    await expect(page.getByLabel(/longitude column/i)).toHaveValue("longitude");

    await page.getByRole("button", { name: /convert to geojson/i }).click();

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /download \.geojson/i }).click({ timeout: 15_000 });
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("coordinates.geojson");
  });
});

test.describe("Coordinate Converter", () => {
  test("converts mixed-format pasted coordinates", async ({ page }) => {
    await page.goto("/geo/coordinate-converter");
    await page.getByLabel(/coordinates/i).fill("40.7128, -74.0060\nnot a coordinate\n18T 583960 4507523");
    await page.getByRole("button", { name: /^convert$/i }).click();

    await expect(page.getByText(/could not recognize/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("button", { name: /download converted coordinates/i })).toBeVisible();
  });

  test("converts to UTM", async ({ page }) => {
    await page.goto("/geo/coordinate-converter");
    await page.getByLabel(/coordinates/i).fill("40.7128, -74.0060");
    await page.getByLabel(/convert to/i).selectOption("utm");
    await page.getByRole("button", { name: /^convert$/i }).click();

    await expect(page.locator("table").getByText(/18T/)).toBeVisible({ timeout: 10_000 });
  });
});

test("user geometries and coordinates are never sent over the network — only basemap tile images are", async ({
  page,
  baseURL,
}) => {
  const externalRequests: string[] = [];
  const baseOrigin = baseURL ? new URL(baseURL).origin : null;

  page.on("request", (request) => {
    const url = new URL(request.url());
    if (baseOrigin && url.origin !== baseOrigin) {
      externalRequests.push(request.url());
    }
  });

  await selectFile(page, "/geo/geojson-viewer", fixture("sample.geojson"));
  await expect(page.locator(".maplibregl-canvas")).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(1000);

  for (const url of externalRequests) {
    expect(url).toContain("basemaps.cartocdn.com");
    // Tile requests only ever carry z/x/y path segments — never a query
    // string that could smuggle coordinates or properties.
    expect(new URL(url).search).toBe("");
  }
});

test.describe("Geospatial Studio hub (/geospatial-studio)", () => {
  test("View renders the right viewer for whichever format is loaded", async ({ page }) => {
    await page.goto("/geospatial-studio");
    await page.getByRole("tab", { name: "View", exact: true }).click();

    await page.locator('input[type="file"]').setInputFiles(fixture("sample.geojson"));
    await expect(page.getByText("Features", { exact: true })).toBeVisible({ timeout: 15_000 });

    // Dropping a GPX swaps the viewer automatically — View has no format
    // picker, because the workspace already detected the format and asking
    // the user to restate it was the one thing making this Studio's layout
    // differ from the others.
    await page.locator('input[type="file"]').setInputFiles(fixture("sample.gpx"));
    await expect(page.getByText(/distance/i).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("radio", { name: "GPX", exact: true })).toHaveCount(0);
    await expect(page.getByRole("radio", { name: "GeoJSON / KML", exact: true })).toHaveCount(0);
  });

  test("View tab's widened GeoJSON viewer also accepts a KML file", async ({ page }) => {
    await page.goto("/geospatial-studio");
    await page.getByRole("tab", { name: "View", exact: true }).click();

    await page.locator('input[type="file"]').first().setInputFiles(fixture("sample.kml"));
    await expect(page.getByText("Features", { exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(page.locator(".maplibregl-canvas")).toBeVisible({ timeout: 15_000 });
  });

  test("Edit tab's action picker switches between Simplify and Validate & Repair, each rendering its own unchanged UI", async ({
    page,
  }) => {
    await page.goto("/geospatial-studio");
    await page.getByRole("tab", { name: "Edit", exact: true }).click();

    await page.getByRole("radio", { name: "Simplify", exact: true }).click();
    await page.locator('input[type="file"]').first().setInputFiles(fixture("sample.geojson"));
    await expect(page.getByText(/tolerance/i).first()).toBeVisible({ timeout: 15_000 });

    await page.getByRole("radio", { name: "Validate & Repair", exact: true }).click();
    await page.locator('input[type="file"]').first().setInputFiles(fixture("repairable.geojson"));
    await expect(page.getByRole("button", { name: "Repair automatically" })).toBeVisible({ timeout: 15_000 });
  });

  test("the removed Coordinate Editing placeholder is gone from the Edit actions", async ({ page }) => {
    // Drawing/editing geometry on the map needs a map-editing library this
    // project doesn't have and wouldn't add lightly, so the action was removed
    // rather than left as a permanent "not available yet".
    await page.goto("/geospatial-studio");
    await page.getByRole("tab", { name: "Edit", exact: true }).click();
    await expect(page.getByRole("radio", { name: "Coordinate Editing", exact: true })).toHaveCount(0);
    await expect(page.getByText(/isn.t available yet/i)).toHaveCount(0);
  });

  test("Analyze tab shows feature count, geometry types, CRS, bounding box, attribute summary and validation status", async ({
    page,
  }) => {
    await page.goto("/geospatial-studio");
    await page.getByRole("tab", { name: "Analyze", exact: true }).click();
    await page.locator('input[type="file"]').first().setInputFiles(fixture("sample.geojson"));

    await expect(page.getByText("Features", { exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Point \(1\)/)).toBeVisible();
    await expect(page.getByText("CRS", { exact: true })).toBeVisible();
    await expect(page.getByText("WGS84 (EPSG:4326)", { exact: true })).toBeVisible();
    await expect(page.getByText("Bounding box", { exact: true })).toBeVisible();
    await expect(page.getByText("Attribute summary", { exact: true })).toBeVisible();
    await expect(page.getByText("Validation status", { exact: true })).toBeVisible();
    await expect(page.getByText(/no problems found/i)).toBeVisible();
    // Read-only: no repair action on this tab (that's Edit's job).
    await expect(page.getByRole("button", { name: "Repair automatically" })).toHaveCount(0);
  });

  test("Convert tab's action picker switches between all 7 converters", async ({ page }) => {
    await page.goto("/geospatial-studio");
    await page.getByRole("tab", { name: "Convert", exact: true }).click();

    await page.getByRole("radio", { name: "KML to GeoJSON", exact: true }).click();
    await page.locator('input[type="file"]').first().setInputFiles(fixture("sample.kml"));
    await expect(page.getByRole("button", { name: "Download .geojson" })).toBeVisible({ timeout: 15_000 });

    await page.getByRole("radio", { name: "Coordinate Converter", exact: true }).click();
    await expect(page.locator("textarea#coordinate-input")).toBeVisible();
  });

  test("a locked tool page (/geo/geojson-simplifier) hides the Edit action picker but keeps the top-level tabs switchable", async ({
    page,
  }) => {
    await page.goto("/geo/geojson-simplifier");
    await expect(page.locator('[aria-label="Action"]')).toHaveCount(0);

    await page.getByRole("tab", { name: "Convert", exact: true }).click();
    await expect(page.getByRole("radio", { name: "KML to GeoJSON", exact: true })).toBeVisible();
  });
});

/**
 * The 2026 "core GIS workflows" expansion: CRS transformation, geometry
 * operations (buffer/dissolve/merge/split) and analysis (statistics,
 * centroid, bounding box, convex hull).
 *
 * Every one of them is reached both from its own SEO landing page (a locked
 * deep link into the shared Studio) and from an in-app action picker — these
 * assert both routes, and that the *output values* are genuinely correct
 * rather than merely that a download button appeared. That distinction is not
 * academic: a first version of the CRS tool passed a "download exists" check
 * while silently transforming nothing at all, because it handed
 * `parseAnyGeoFile`'s `{ geojson, sourceFormat }` wrapper to the engine
 * instead of the document inside it.
 */
test.describe("Geospatial Studio — CRS transformation", () => {
  test("reprojects to S-JTSK with real metre coordinates, preserving attributes and geometry types", async ({
    page,
  }) => {
    await selectFile(page, "/geo/crs-converter", fixture("squares.geojson"));
    await page.locator("#crs-source").waitFor({ timeout: 20_000 });

    // Both pickers render the same quick-select buttons, so scope to the target.
    await page
      .getByRole("group", { name: "Target CRS" })
      .getByRole("button", { name: "EPSG:5514", exact: true })
      .click();
    await page.getByRole("button", { name: "Convert CRS", exact: true }).click();

    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: /Download reprojected GeoJSON/i }).click({ timeout: 20_000 });
    const stream = await (await download).createReadStream();
    let text = "";
    for await (const chunk of stream) text += chunk;
    const output = JSON.parse(text);

    // Prague sits near (-744 km, -1043 km) in S-JTSK; degrees would be ~14/50.
    const [x, y] = output.features[0].geometry.coordinates[0][0];
    expect(x).toBeLessThan(-700_000);
    expect(x).toBeGreaterThan(-800_000);
    expect(y).toBeLessThan(-1_000_000);
    expect(y).toBeGreaterThan(-1_100_000);

    expect(output.features[0].properties).toEqual({ region: "north", pop: 10 });
    expect(output.features.map((f: { geometry: { type: string } }) => f.geometry.type)).toEqual([
      "Polygon",
      "Polygon",
      "MultiPolygon",
    ]);
    // A non-4326 target records its CRS in the legacy member so readers aren't misled.
    expect(JSON.stringify(output.crs)).toContain("5514");
  });

  test("finds a CRS by alias, not just by EPSG code", async ({ page }) => {
    await selectFile(page, "/geo/crs-converter", fixture("squares.geojson"));
    await page.locator("#crs-target-search").fill("british national grid");
    await expect(page.locator("#crs-target option").first()).toContainText("27700");

    await page.locator("#crs-target-search").fill("krovak");
    await expect(page.locator("#crs-target")).toContainText("5514");
  });
});

test.describe("Geospatial Studio — geometry operations", () => {
  test("buffer produces a downloadable result from its own landing page", async ({ page }) => {
    await selectFile(page, "/geo/geojson-buffer", fixture("squares.geojson"));
    await expect(page.getByRole("tab", { name: "Edit", exact: true })).toHaveAttribute("aria-selected", "true");
    await page.getByRole("button", { name: "Buffer", exact: true }).click({ timeout: 20_000 });
    await expect(page.getByRole("button", { name: /Download buffer result/i })).toBeVisible({ timeout: 25_000 });
  });

  test("dissolve merges touching polygons and offers the file's real attributes to group by", async ({ page }) => {
    await selectFile(page, "/geo/geojson-dissolve", fixture("squares.geojson"));
    await page.getByRole("button", { name: "Dissolve", exact: true }).waitFor({ timeout: 20_000 });

    // Keys come from the file itself, not a hardcoded list.
    const options = await page.locator("select").last().locator("option").allTextContents();
    expect(options).toEqual(expect.arrayContaining(["region", "pop"]));

    await page.getByRole("button", { name: "Dissolve", exact: true }).click();
    await expect(page.getByRole("button", { name: /Download dissolve result/i })).toBeVisible({ timeout: 25_000 });
    // 3 in (two of them adjacent, one a MultiPolygon far away) -> fewer out.
    await expect(page.locator("dd").nth(1)).toHaveText("2");
  });

  test("split multi geometry runs from the Studio's own Edit action picker", async ({ page }) => {
    await page.goto("/geospatial-studio");
    await page.getByRole("tab", { name: "Edit", exact: true }).click();
    await page.getByRole("radio", { name: "Split Multi", exact: true }).click();
    await page.locator('input[type="file"]').first().setInputFiles(fixture("squares.geojson"));
    await page.getByRole("button", { name: "Split Multi Geometry", exact: true }).click({ timeout: 20_000 });
    await expect(page.getByRole("button", { name: /Download split multi geometry result/i })).toBeVisible({
      timeout: 25_000,
    });
  });
});

test.describe("Geospatial Studio — analysis", () => {
  test("statistics reports counts, area, CRS and per-attribute summaries", async ({ page }) => {
    await selectFile(page, "/geo/geojson-statistics", fixture("squares.geojson"));
    await expect(page.getByRole("tab", { name: "Analyze", exact: true })).toHaveAttribute("aria-selected", "true");

    await expect(page.getByText("Total area")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("columnheader", { name: "Attribute" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "pop", exact: true })).toBeVisible();
    await expect(page.getByRole("cell", { name: "region", exact: true })).toBeVisible();
    // Lengths/areas are only meaningful under a stated CRS assumption.
    await expect(page.getByText(/EPSG:4326/).first()).toBeVisible();
  });

  test("centroid, bounding box and convex hull are reachable as Analyze actions", async ({ page }) => {
    await page.goto("/geospatial-studio");
    await page.getByRole("tab", { name: "Analyze", exact: true }).click();

    for (const action of ["Centroid", "Bounding Box", "Convex Hull"]) {
      await expect(page.getByRole("radio", { name: action, exact: true })).toBeVisible();
    }

    await page.getByRole("radio", { name: "Convex Hull", exact: true }).click();
    await page.locator('input[type="file"]').first().setInputFiles(fixture("squares.geojson"));
    await page.getByRole("button", { name: "Convex Hull", exact: true }).click({ timeout: 20_000 });
    await expect(page.getByRole("button", { name: /Download convex hull result/i })).toBeVisible({ timeout: 25_000 });
  });
});

test.describe("Geospatial Studio — geometry validation", () => {
  test("reports a self-intersection, which structural validation alone would miss", async ({ page }) => {
    await selectFile(page, "/geo/geojson-validator", fixture("self-intersecting.geojson"));
    // Structurally this file is perfectly valid GeoJSON — only the geometric
    // pass catches the bow tie.
    await expect(page.getByText(/intersects itself/i)).toBeVisible({ timeout: 20_000 });
  });
});

test("the expansion adds no new top-level tabs — everything lives under the existing four", async ({ page }) => {
  await page.goto("/geospatial-studio");
  const tabs = page.locator('[role="tablist"][aria-label="Application mode"] [role="tab"]');
  await expect(tabs).toHaveCount(4);
  await expect(tabs).toHaveText(["View", "Edit", "Analyze", "Convert"]);
});

/**
 * The shared workspace: one drop zone for the whole Studio, a file that
 * survives tab switches, and actions gated on the detected format.
 *
 * Before this, every geo tool owned its own `file` state and its own drop
 * zone, so switching tabs unmounted the tool and silently discarded the
 * user's file — they had to re-drop it for each operation.
 */
test.describe("Geospatial Studio — shared file workspace", () => {
  test("there is exactly one drop zone, and the file survives every tab switch", async ({ page }) => {
    await page.goto("/geospatial-studio");
    await expect(page.locator('input[type="file"]')).toHaveCount(1);

    await page.locator('input[type="file"]').setInputFiles(fixture("squares.geojson"));
    await expect(page.getByText(/Detected: GeoJSON/)).toBeVisible({ timeout: 20_000 });

    for (const tab of ["Edit", "Analyze", "Convert", "View"]) {
      await page.getByRole("tab", { name: tab, exact: true }).click();
      // The file is still loaded, and no tool has added a second drop zone.
      await expect(page.getByText("squares.geojson")).toBeVisible();
      await expect(page.locator('input[type="file"]')).toHaveCount(1);
    }
  });

  test("a tool runs off the shared file without it being re-dropped", async ({ page }) => {
    await page.goto("/geospatial-studio");
    await page.locator('input[type="file"]').setInputFiles(fixture("squares.geojson"));
    await expect(page.getByText(/Detected: GeoJSON/)).toBeVisible({ timeout: 20_000 });

    await page.getByRole("tab", { name: "Analyze", exact: true }).click();
    await page.getByRole("radio", { name: "Statistics", exact: true }).click();
    await expect(page.getByText("Total length")).toBeVisible({ timeout: 20_000 });
  });

  test("actions the loaded format can't support are disabled and explain why", async ({ page }) => {
    await page.goto("/geospatial-studio");
    await page.locator('input[type="file"]').setInputFiles(fixture("squares.geojson"));
    await expect(page.getByText(/Detected: GeoJSON/)).toBeVisible({ timeout: 20_000 });

    await page.getByRole("tab", { name: "Convert", exact: true }).click();
    const kmlAction = page.getByRole("radio", { name: "KML to GeoJSON", exact: true });
    await expect(kmlAction).toHaveAttribute("aria-disabled", "true");
    // The tooltip is the whole point — a disabled control with no explanation
    // is worse than none.
    await expect(kmlAction).toHaveAttribute("title", /needs KML/i);

    // `force` because Playwright itself won't click an aria-disabled element,
    // which is already evidence the state is real; this proves the click is
    // additionally a no-op in the app's own handler.
    await kmlAction.click({ force: true });
    await expect(kmlAction).toHaveAttribute("aria-checked", "false");

    await expect(page.getByRole("radio", { name: "GeoJSON to KML", exact: true })).not.toHaveAttribute(
      "aria-disabled",
      "true"
    );
  });

  test("gating flips when a different format is loaded", async ({ page }) => {
    await page.goto("/geospatial-studio");
    await page.locator('input[type="file"]').setInputFiles(fixture("squares.geojson"));
    await expect(page.getByText(/Detected: GeoJSON/)).toBeVisible({ timeout: 20_000 });

    await page.locator('input[type="file"]').setInputFiles(fixture("sample.gpx"));
    await expect(page.getByText(/Detected: GPX/)).toBeVisible({ timeout: 20_000 });

    await page.getByRole("tab", { name: "Convert", exact: true }).click();
    await expect(page.getByRole("radio", { name: "GPX to GeoJSON", exact: true })).not.toHaveAttribute(
      "aria-disabled",
      "true"
    );
    await expect(page.getByRole("radio", { name: "GeoJSON to KML", exact: true })).toHaveAttribute(
      "aria-disabled",
      "true"
    );

    // View has no picker to gate — it just follows the detected format, so
    // the GPX viewer's own output is the assertion.
    await page.getByRole("tab", { name: "View", exact: true }).click();
    await expect(page.getByText(/distance/i).first()).toBeVisible({ timeout: 20_000 });
  });

  test("the drop zone sits below the tab bar, like every other Studio", async ({ page }) => {
    await page.goto("/geospatial-studio");

    const tabBar = page.getByRole("tab", { name: "Convert", exact: true });
    const dropZone = page.getByText("Drop a GeoJSON, KML, GPX or CSV file here");
    const tabBox = await tabBar.boundingBox();
    const dropBox = await dropZone.boundingBox();

    expect(tabBox).not.toBeNull();
    expect(dropBox).not.toBeNull();
    expect(dropBox!.y).toBeGreaterThan(tabBox!.y);
  });

  test("a paste-only action hides the drop zone instead of implying a file is needed", async ({
    page,
  }) => {
    await page.goto("/geospatial-studio");
    await page.getByRole("tab", { name: "Convert", exact: true }).click();
    await expect(page.getByText("Drop a GeoJSON, KML, GPX or CSV file here")).toBeVisible();

    await page.getByRole("radio", { name: "Coordinate Converter", exact: true }).click();
    await expect(page.getByText("Drop a GeoJSON, KML, GPX or CSV file here")).toHaveCount(0);
  });
});

/**
 * CRS search covers the full EPSG catalogue (8,000+ systems), not just the
 * curated quick-select list. The catalogue is generated at install time by
 * `scripts/generate-epsg-index.mjs` and lazy-loaded on the first search.
 */
test.describe("Geospatial Studio — full EPSG catalogue search", () => {
  test("finds and uses a CRS that isn't in the curated list", async ({ page }) => {
    await selectFile(page, "/geo/crs-converter", fixture("squares.geojson"));
    await page.locator("#crs-source").waitFor({ timeout: 20_000 });

    // EPSG:2065 is deliberately obscure — it only resolves via the full index.
    await page.locator("#crs-target-search").fill("2065");
    await expect(page.locator("#crs-target")).toContainText("2065", { timeout: 20_000 });

    await page.locator("#crs-target").selectOption("EPSG:2065");
    await page.getByRole("button", { name: "Convert CRS", exact: true }).click();

    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: /Download reprojected GeoJSON/i }).click({ timeout: 20_000 });
    const stream = await (await download).createReadStream();
    let text = "";
    for await (const chunk of stream) text += chunk;

    const [x, y] = JSON.parse(text).features[0].geometry.coordinates[0][0];
    // Real projected metres, not degrees left untouched.
    expect(Math.abs(x)).toBeGreaterThan(1000);
    expect(Number.isFinite(y)).toBe(true);
  });

  test("a name search returns far more than the curated handful", async ({ page }) => {
    await selectFile(page, "/geo/crs-converter", fixture("squares.geojson"));
    await page.locator("#crs-source").waitFor({ timeout: 20_000 });

    await page.locator("#crs-target-search").fill("Lambert");
    await expect
      .poll(async () => page.locator("#crs-target option").count(), { timeout: 20_000 })
      .toBeGreaterThan(10);
  });
});

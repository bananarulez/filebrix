import path from "node:path";
import { expect, test } from "@playwright/test";

const FIXTURES_DIR = path.join(__dirname, "..", "fixtures", "spreadsheet");

function fixture(name: string): string {
  return path.join(FIXTURES_DIR, name);
}

test.describe.configure({ timeout: 60_000 });

test.describe("JSON Formatter", () => {
  test("formats valid JSON and reports a clear error for invalid JSON", async ({ page }) => {
    await page.goto("/tools/json-formatter");
    await page.getByLabel("JSON input").fill('{"b":2,"a":1}');
    await page.getByRole("button", { name: "Format" }).click();
    await expect(page.getByLabel("Formatted JSON")).toHaveValue('{\n  "b": 2,\n  "a": 1\n}');

    await page.getByLabel("JSON input").fill("{not valid");
    await page.getByRole("button", { name: "Format" }).click();
    await expect(page.getByText("Your file was never uploaded.", { exact: true })).toBeVisible();
  });
});

test.describe("JSON Minifier", () => {
  test("removes whitespace from JSON", async ({ page }) => {
    await page.goto("/tools/json-minifier");
    await page.getByLabel("JSON input").fill('{\n  "a": 1\n}');
    await page.getByRole("button", { name: "Minify" }).click();
    await expect(page.getByLabel("Minified JSON")).toHaveValue('{"a":1}');
  });
});

test.describe("XML Formatter", () => {
  test("pretty-prints XML and reports a clear error for malformed XML", async ({ page }) => {
    await page.goto("/tools/xml-formatter");
    await page.getByLabel("XML input").fill("<root><a>1</a><b>2</b></root>");
    await page.getByRole("button", { name: "Format" }).click();
    await expect(page.getByLabel("Formatted XML")).toHaveValue("<root>\n  <a>1</a>\n  <b>2</b>\n</root>");

    await page.getByLabel("XML input").fill("<root><a></root>");
    await page.getByRole("button", { name: "Format" }).click();
    await expect(page.getByText("Your file was never uploaded.", { exact: true })).toBeVisible();
  });
});

test.describe("XML Validator", () => {
  test("confirms well-formed XML and reports malformed XML", async ({ page }) => {
    await page.goto("/tools/xml-validator");
    await page.getByLabel("XML input").fill("<root><a>1</a></root>");
    await page.getByRole("button", { name: "Validate" }).click();
    await expect(page.getByLabel("Result")).toHaveValue(/well-formed/i);

    await page.getByLabel("XML input").fill("<root><a></root>");
    await page.getByRole("button", { name: "Validate" }).click();
    await expect(page.getByText("Your file was never uploaded.", { exact: true })).toBeVisible();
  });
});

test.describe("JSON to XML", () => {
  test("converts JSON to XML using the documented rules", async ({ page }) => {
    await page.goto("/convert/json-to-xml");
    await page.getByLabel("JSON input").fill('{"@id":"5","name":"Alice"}');
    await page.getByRole("button", { name: "Convert" }).click();
    await expect(page.getByLabel("XML output")).toHaveValue('<root id="5"><name>Alice</name></root>');
  });
});

test.describe("XML to JSON", () => {
  test("converts XML to JSON and documents the single-vs-array limitation in the FAQ", async ({ page }) => {
    await page.goto("/convert/xml-to-json");
    await page.getByLabel("XML input").fill('<root id="5"><name>Alice</name></root>');
    await page.getByRole("button", { name: "Convert" }).click();
    const output = await page.getByLabel("JSON output").inputValue();
    expect(JSON.parse(output)).toEqual({ "@id": "5", name: "Alice" });

    await expect(page.getByText(/happened once here/i)).toBeVisible();
  });
});

test.describe("JSON to YAML / YAML to JSON", () => {
  test("round-trips a JSON object through YAML and back", async ({ page }) => {
    await page.goto("/convert/json-to-yaml");
    await page.getByLabel("JSON input").fill('{"a":1,"b":["x","y"]}');
    await page.getByRole("button", { name: "Convert" }).click();
    const yaml = await page.getByLabel("YAML output").inputValue();
    expect(yaml).toContain("a: 1");

    await page.goto("/convert/yaml-to-json");
    await page.getByLabel("YAML input").fill(yaml);
    await page.getByRole("button", { name: "Convert" }).click();
    const json = await page.getByLabel("JSON output").inputValue();
    expect(JSON.parse(json)).toEqual({ a: 1, b: ["x", "y"] });
  });
});

test.describe("CSV to XML / XML to CSV", () => {
  test("converts a CSV file to XML and offers a download", async ({ page }) => {
    await page.goto("/convert/csv-to-xml");
    await page.locator('input[type="file"]').setInputFiles(fixture("sample.csv"));
    await page.getByRole("button", { name: "Convert", exact: true }).click({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: /download \.xml/i })).toBeVisible({ timeout: 15_000 });
  });

  test("converts a repeating-record XML file to CSV and offers a download", async ({ page }) => {
    await page.goto("/convert/xml-to-csv");
    await page.locator('input[type="file"]').setInputFiles(fixture("sample.xml"));
    await page.getByRole("button", { name: "Convert", exact: true }).click({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: /download \.csv/i })).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("XML security", () => {
  const xxePayload =
    '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><foo>&xxe;</foo>';

  test("XML Validator never leaks local file content or contacts the network for an XXE payload", async ({
    page,
    baseURL,
  }) => {
    const externalRequests: string[] = [];
    const baseOrigin = baseURL ? new URL(baseURL).origin : null;
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (baseOrigin && url.origin !== baseOrigin) externalRequests.push(request.url());
    });

    await page.goto("/tools/xml-validator");
    await page.getByLabel("XML input").fill(xxePayload);
    await page.getByRole("button", { name: "Validate" }).click();

    // Either a validation error or a "well-formed" result is acceptable —
    // what matters is that no file content ever appears anywhere on the page.
    const bodyText = (await page.textContent("body")) ?? "";
    expect(bodyText).not.toContain("root:");
    expect(bodyText.toLowerCase()).not.toContain("/bin/bash");
    await page.waitForTimeout(300);
    expect(externalRequests).toEqual([]);
  });

  test("XML to JSON never leaks local file content for an XXE payload", async ({ page }) => {
    await page.goto("/convert/xml-to-json");
    await page.getByLabel("XML input").fill(xxePayload);
    await page.getByRole("button", { name: "Convert" }).click();
    const bodyText = (await page.textContent("body")) ?? "";
    expect(bodyText).not.toContain("root:");
  });

  test("XML Formatter never leaks local file content for an XXE payload", async ({ page }) => {
    await page.goto("/tools/xml-formatter");
    await page.getByLabel("XML input").fill(xxePayload);
    await page.getByRole("button", { name: "Format" }).click();
    const bodyText = (await page.textContent("body")) ?? "";
    expect(bodyText).not.toContain("root:");
    expect(bodyText.toLowerCase()).not.toContain("/bin/bash");
  });

  test("XML to CSV (file-upload path, a different parser entry point than the text tools above) never leaks local file content for an XXE payload", async ({
    page,
  }) => {
    await page.goto("/convert/xml-to-csv");
    await page.locator('input[type="file"]').setInputFiles(fixture("xxe.xml"));
    await page.waitForTimeout(500);
    const bodyText = (await page.textContent("body")) ?? "";
    expect(bodyText).not.toContain("root:");
    expect(bodyText.toLowerCase()).not.toContain("/bin/bash");
  });

  test("script-tag-shaped XML content is treated as inert text, never executed", async ({ page }) => {
    let dialogFired = false;
    page.on("dialog", (dialog) => {
      dialogFired = true;
      void dialog.dismiss();
    });

    await page.goto("/tools/xml-formatter");
    await page
      .getByLabel("XML input")
      .fill("<root><note>&lt;script&gt;alert('xss')&lt;/script&gt;</note></root>");
    await page.getByRole("button", { name: "Format" }).click();
    await expect(page.getByLabel("Formatted XML")).toHaveValue(/&lt;script&gt;/);

    await page.waitForTimeout(300);
    expect(dialogFired).toBe(false);
  });

  test("does not hang on a billion-laughs-style entity expansion payload", async ({ page }) => {
    const billionLaughs = `<?xml version="1.0"?>
<!DOCTYPE lolz [
  <!ENTITY lol "lol">
  <!ENTITY lol2 "&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;">
  <!ENTITY lol3 "&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;">
]>
<lolz>&lol3;</lolz>`;

    await page.goto("/tools/xml-validator");
    await page.getByLabel("XML input").fill(billionLaughs);
    await page.getByRole("button", { name: "Validate" }).click();
    // The requirement is "doesn't hang the page" — some result (valid or
    // invalid) must appear within a bounded time; either is acceptable.
    await expect(page.getByLabel("Result").or(page.getByText("Your file was never uploaded.", { exact: true })).first()).toBeVisible({
      timeout: 10_000,
    });
  });
});

/**
 * These 9 JSON/XML/YAML tools were the last Studio-owned tools whose pages
 * rendered bespoke UI (a colocated `TextTransformTool` wrapper) rather than
 * the shared Studio app. They now render `SpreadsheetDataApp` with the right
 * mode + action preselected, exactly like the other 44 Studio tool pages.
 *
 * The tests above already prove each tool still *works* at its own URL; these
 * assert the entry-point contract that makes that a deep link rather than a
 * redirect or a duplicate implementation.
 */
test.describe("Data Studio deep-link entry points", () => {
  const ENTRY_POINTS = [
    { url: "/tools/json-formatter", tab: "Editor" },
    { url: "/tools/json-minifier", tab: "Editor" },
    { url: "/tools/xml-formatter", tab: "Editor" },
    { url: "/tools/json-validator", tab: "Analyzer" },
    { url: "/tools/xml-validator", tab: "Analyzer" },
    { url: "/convert/json-to-xml", tab: "Converter" },
    { url: "/convert/xml-to-json", tab: "Converter" },
    { url: "/convert/json-to-yaml", tab: "Converter" },
    { url: "/convert/yaml-to-json", tab: "Converter" },
  ];

  for (const { url, tab } of ENTRY_POINTS) {
    test(`${url} opens the Studio on the ${tab} tab without changing the URL`, async ({ page }) => {
      const response = await page.goto(url);

      // Must be a real 200 at this exact path — never a redirect to
      // /data-studio, and never a client-side navigation away from it.
      expect(response?.status()).toBe(200);
      expect(new URL(page.url()).pathname).toBe(url);

      // The shared Studio's own tab bar is mounted, with the tool's own
      // capability already selected — no second selection needed.
      await expect(page.getByRole("tab", { name: tab, exact: true })).toHaveAttribute("aria-selected", "true");

      // The page keeps its own SEO identity rather than the Studio's.
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        "href",
        new RegExp(`${url}$`)
      );
      const jsonLd = await page.locator('script[type="application/ld+json"]').allTextContents();
      expect(jsonLd.length).toBeGreaterThan(0);
      for (const block of jsonLd) expect(JSON.parse(block)["@context"]).toContain("schema.org");
    });
  }

  test("a locked entry point hides the action picker but keeps the Studio's tabs switchable", async ({ page }) => {
    await page.goto("/tools/json-formatter");
    // Locked to one action, so no second-level picker — its SEO promise is
    // "JSON Formatter", not "all of Data Studio's Edit actions".
    await expect(page.locator('[role="tablist"][aria-label="Action"]')).toHaveCount(0);

    // The top-level tabs still work, so the page is a superset entry point,
    // not a dead end.
    await page.getByRole("tab", { name: "Viewer", exact: true }).click();
    await expect(page.getByText(/Drop a spreadsheet or data file/i)).toBeVisible();
  });

  test("the unlocked Studio hub exposes the same tools as in-app actions", async ({ page }) => {
    await page.goto("/data-studio");
    await page.getByRole("tab", { name: "Editor", exact: true }).click();
    await expect(page.getByRole("radio", { name: "JSON Formatter", exact: true })).toBeVisible();

    // Selecting the action in-app gives the identical working tool.
    await page.getByRole("radio", { name: "JSON Formatter", exact: true }).click();
    await page.getByLabel("JSON input").fill('{"b":2,"a":1}');
    await page.getByRole("button", { name: "Format", exact: true }).click();
    await expect(page.getByLabel("Formatted JSON")).toHaveValue('{\n  "b": 2,\n  "a": 1\n}');
  });
});

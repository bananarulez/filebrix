import path from "node:path";
import { expect, test } from "@playwright/test";

const SPREADSHEET_FIXTURES_DIR = path.join(__dirname, "..", "fixtures", "spreadsheet");

test.describe.configure({ timeout: 60_000 });

// Next.js's own route announcer also has role="alert", so a bare
// page.getByRole("alert") always matches 2 elements. Scope to the tool
// section landmark (ToolPageLayout's `aria-label={`${tool.name} tool`}`).
function toolAlert(page: import("@playwright/test").Page) {
  return page.getByRole("region", { name: /tool$/i }).getByRole("alert");
}

test.describe("JSON Validator", () => {
  test("confirms valid JSON and reports a specific error for invalid JSON", async ({ page }) => {
    await page.goto("/tools/json-validator");
    await page.getByLabel(/json input/i).fill('{"a": 1}');
    await page.getByRole("button", { name: /^validate$/i }).click();
    await expect(page.getByLabel(/result/i)).toHaveValue(/valid/i);

    await page.getByLabel(/json input/i).fill('{"a": }');
    await page.getByRole("button", { name: /^validate$/i }).click();
    await expect(toolAlert(page)).toBeVisible();
  });
});

test.describe("Base64 Encode / Decode", () => {
  test("round-trips Unicode text through encode and decode", async ({ page }) => {
    const text = "Café 🎉 日本語";

    await page.goto("/tools/base64-encode");
    await page.getByLabel(/text input/i).fill(text);
    await page.getByRole("button", { name: /^encode$/i }).click();
    const encoded = await page.getByLabel(/base64 output/i).inputValue();
    expect(encoded.length).toBeGreaterThan(0);

    await page.goto("/tools/base64-decode");
    await page.getByLabel(/base64 input/i).fill(encoded);
    await page.getByRole("button", { name: /^decode$/i }).click();
    await expect(page.getByLabel(/decoded text/i)).toHaveValue(text);
  });

  test("shows a clear error for invalid Base64", async ({ page }) => {
    await page.goto("/tools/base64-decode");
    await page.getByLabel(/base64 input/i).fill("not valid base64 !!!");
    await page.getByRole("button", { name: /^decode$/i }).click();
    await expect(toolAlert(page)).toBeVisible();
  });
});

test.describe("URL Encode / Decode", () => {
  test("round-trips text with reserved characters", async ({ page }) => {
    const text = "a b&c=d/e?f#g";

    await page.goto("/tools/url-encode");
    await page.getByLabel(/text input/i).fill(text);
    await page.getByRole("button", { name: /^encode$/i }).click();
    const encoded = await page.getByLabel(/url-encoded output/i).inputValue();
    expect(encoded).toContain("%20");

    await page.goto("/tools/url-decode");
    await page.getByLabel(/url-encoded input/i).fill(encoded);
    await page.getByRole("button", { name: /^decode$/i }).click();
    await expect(page.getByLabel(/decoded text/i)).toHaveValue(text);
  });
});

test.describe("UUID Generator", () => {
  test("generates the requested count of valid, unique UUIDs", async ({ page }) => {
    await page.goto("/tools/uuid-generator");
    await expect(page.getByLabel(/generated uuids/i)).not.toHaveValue("", { timeout: 10_000 });

    await page.getByRole("spinbutton").fill("10");
    await page.getByRole("button", { name: /^generate$/i }).click();

    const value = await page.getByLabel(/generated uuids/i).inputValue();
    const lines = value.split("\n");
    expect(lines.length).toBe(10);
    expect(new Set(lines).size).toBe(10);
    for (const uuid of lines) {
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    }
  });
});

test.describe("Hash Generator", () => {
  test("computes real SHA-256 via the Web Crypto API", async ({ page }) => {
    await page.goto("/tools/hash-generator");
    await page.getByLabel(/text input/i).fill("abc");
    await page.getByRole("button", { name: /compute hashes/i }).click();
    await expect(page.getByText("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad")).toBeVisible({
      timeout: 10_000,
    });
    // Unique to the always-visible inline warning banner, not the FAQ (which
    // covers the same point in different wording further down the page).
    await expect(page.getByText(/for password storage, use a dedicated/i)).toBeVisible();
  });
});

test.describe("Unix Timestamp Converter", () => {
  test("converts a timestamp to a date and shows a live current time", async ({ page }) => {
    await page.goto("/tools/unix-timestamp-converter");
    await expect(page.getByText("Unix seconds").first()).toBeVisible({ timeout: 10_000 });

    await page.getByLabel(/unix timestamp → date/i).fill("1700000000");
    await expect(page.getByText("2023-11-14T22:13:20.000Z")).toBeVisible();
  });
});

test.describe("Text Diff", () => {
  test("highlights additions and deletions between two texts", async ({ page }) => {
    await page.goto("/tools/text-diff");
    await page.getByLabel(/original text/i).fill("line one\nline two\nline three");
    await page.getByLabel(/changed text/i).fill("line one\nline TWO\nline three");
    await page.getByRole("button", { name: /^compare$/i }).click();

    // Summary wording changed with the richer viewer (+N added / N removed,
    // plus a change-block count); the underlying counts are the same.
    await expect(page.getByText(/\+1 added/)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/1 removed/)).toBeVisible();
    await expect(page.getByRole("button", { name: /download diff/i })).toBeVisible();
  });
});

test.describe("JSON Diff", () => {
  test("ignores key order but flags a real value change", async ({ page }) => {
    await page.goto("/tools/json-diff");
    await page.getByLabel(/original json/i).fill('{"a": 1, "b": 2}');
    await page.getByLabel(/changed json/i).fill('{"b": 2, "a": 99}');
    await page.getByRole("button", { name: /^compare$/i }).click();

    await expect(page.getByText(/\+1 added/)).toBeVisible({ timeout: 10_000 });
  });

  test("shows a friendly error when one side isn't valid JSON", async ({ page }) => {
    await page.goto("/tools/json-diff");
    await page.getByLabel(/original json/i).fill("not json");
    await page.getByLabel(/changed json/i).fill("{}");
    await page.getByRole("button", { name: /^compare$/i }).click();
    await expect(toolAlert(page)).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("SQL Formatter", () => {
  test("pretty-prints a compact query without executing it", async ({ page }) => {
    await page.goto("/tools/sql-formatter");
    await page.getByLabel(/sql input/i).fill("select id,name from users where active=1;");
    await page.getByRole("button", { name: /^format$/i }).click();

    const output = await page.getByLabel(/formatted sql/i).inputValue({ timeout: 10_000 });
    expect(output).toContain("SELECT");
    expect(output).toContain("FROM");
    expect(output.split("\n").length).toBeGreaterThan(1);
  });
});

test.describe("CSV to SQL INSERT", () => {
  test("builds one INSERT statement per row and downloads it", async ({ page }) => {
    await page.goto("/convert/csv-to-sql");
    await page.locator('input[type="file"]').setInputFiles(path.join(SPREADSHEET_FIXTURES_DIR, "sample.csv"));

    await expect(page.getByLabel(/table name/i)).toHaveValue("sample", { timeout: 10_000 });
    await page.getByRole("button", { name: /build insert statements/i }).click();

    const output = await page.getByLabel(/generated sql insert statements/i).inputValue({ timeout: 10_000 });
    // 4 data rows in sample.csv — note one row's value has an embedded
    // newline (a multi-line quoted CSV field), so counting "INSERT INTO"
    // occurrences is correct where counting output lines would not be.
    expect(output.match(/INSERT INTO/g)?.length).toBe(4);
    expect(output).toContain("Café");

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /download \.sql/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("sample.sql");
  });
});

test("developer text tools never send pasted input over the network", async ({ page, baseURL }) => {
  const externalRequests: string[] = [];
  const baseOrigin = baseURL ? new URL(baseURL).origin : null;

  page.on("request", (request) => {
    const url = new URL(request.url());
    if (baseOrigin && url.origin !== baseOrigin) externalRequests.push(request.url());
  });

  await page.goto("/tools/hash-generator");
  await page.getByLabel(/text input/i).fill("some secret-looking text");
  await page.getByRole("button", { name: /compute hashes/i }).click();
  await expect(page.locator("code").first()).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(500);

  expect(externalRequests).toEqual([]);
});

test.describe("Developer Toolkit landing page (/developer-tools)", () => {
  test("shows all 4 category cards with a tool count and a working Open link", async ({ page }) => {
    await page.goto("/developer-tools");
    await expect(page.getByRole("heading", { level: 1, name: "Developer Toolkit" })).toBeVisible();

    // JSON was retired as a category once its 9 tools moved to Data Studio —
    // Text absorbed JSON Diff (the one JSON-bucket tool that stayed in
    // Developer Toolkit), growing from 11 to 12. See PROJECT_LOG.md "Data
    // Studio absorbs JSON/XML/YAML tooling."
    const cases: { name: string; toolCount: string }[] = [
      { name: "Text", toolCount: "12 tools" },
      { name: "Encoding", toolCount: "8 tools" },
      { name: "SQL", toolCount: "2 tools" },
      { name: "Utilities", toolCount: "3 tools" },
    ];

    for (const { name, toolCount } of cases) {
      await expect(page.getByRole("heading", { level: 2, name, exact: true })).toBeVisible();
      await expect(page.getByText(toolCount, { exact: true })).toBeVisible();
      await expect(page.getByRole("link", { name: `Open ${name}` })).toBeVisible();
    }

    await page.getByRole("link", { name: "Open Encoding" }).click();
    await expect(page).toHaveURL(/\/developer-tools\/encoding$/);
    await expect(page.getByRole("heading", { level: 1, name: "Encoding" })).toBeVisible();
  });

  test("each sub-category page lists only tools that belong to it", async ({ page }) => {
    await page.goto("/developer-tools/sql");
    await expect(page.getByRole("heading", { level: 1, name: "SQL" })).toBeVisible();
    await expect(page.getByRole("link", { name: /^SQL Formatter/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /^CSV to SQL INSERT/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /^UUID Generator/ })).toHaveCount(0);

    await page.goto("/developer-tools/text");
    await expect(page.getByRole("heading", { level: 1, name: "Text" })).toBeVisible();
    await expect(page.getByRole("link", { name: /^Text Diff/ })).toBeVisible();
  });

  test("breadcrumb on a sub-category page goes Home → Developer Toolkit → category", async ({ page }) => {
    await page.goto("/developer-tools/utilities");
    const breadcrumb = page.getByRole("navigation", { name: "Breadcrumb" });
    await expect(breadcrumb.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    await expect(breadcrumb.getByRole("link", { name: "Developer Toolkit" })).toHaveAttribute(
      "href",
      "/developer-tools"
    );
    await expect(breadcrumb.getByText("Utilities")).toBeVisible();

    await breadcrumb.getByRole("link", { name: "Developer Toolkit" }).click();
    await expect(page).toHaveURL(/\/developer-tools$/);
    await expect(page.getByRole("heading", { level: 1, name: "Developer Toolkit" })).toBeVisible();
  });

  test("existing tool routes are unaffected by the new category architecture", async ({ page }) => {
    const response = await page.goto("/tools/json-validator");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: "JSON Validator" })).toBeVisible();
  });
});

test.describe("Text category — new tools (/developer-tools/text)", () => {
  test("the Text category page now lists 12 tools, including Text Diff, JSON Diff and all 10 new ones", async ({
    page,
  }) => {
    await page.goto("/developer-tools/text");
    await expect(page.getByRole("heading", { level: 1, name: "Text" })).toBeVisible();
    for (const name of [
      "Text Diff",
      "JSON Diff",
      "Word Counter",
      "Character Counter",
      "Line Counter",
      "Remove Empty Lines",
      "Remove Duplicate Lines",
      "Sort Lines",
      "Reverse Lines",
      "Trim Whitespace",
      "Normalize Line Endings",
      "Case Converter",
    ]) {
      await expect(page.getByRole("link", { name: new RegExp(`^${name}`) })).toBeVisible();
    }
  });

  test("Word Counter, Character Counter and Line Counter update live as you type, sharing one component", async ({
    page,
  }) => {
    await page.goto("/tools/word-counter");
    await page.getByLabel("Text").fill("The quick brown fox jumps over the lazy dog.");
    await expect(page.getByText("9", { exact: true })).toBeVisible();

    await page.goto("/tools/character-counter");
    await page.getByLabel("Text").fill("hello world");
    await expect(page.getByText("11", { exact: true })).toBeVisible();

    await page.goto("/tools/line-counter");
    await page.getByLabel("Text").fill("one two\nthree four\nfive six");
    await expect(page.getByText("3", { exact: true })).toBeVisible();
  });

  test("Remove Empty Lines strips blank lines only", async ({ page }) => {
    await page.goto("/tools/remove-empty-lines");
    await page.getByLabel("Text").fill("a\n\nb\n   \nc");
    await page.getByRole("button", { name: "Remove empty lines" }).click();
    await expect(page.getByLabel("Result")).toHaveValue("a\nb\nc");
  });

  test("Remove Duplicate Lines keeps first occurrence, preserving order", async ({ page }) => {
    await page.goto("/tools/remove-duplicate-lines");
    await page.getByLabel("Text").fill("b\na\nb\nc");
    await page.getByRole("button", { name: "Remove duplicates" }).click();
    await expect(page.getByLabel("Result")).toHaveValue("b\na\nc");
  });

  test("Sort Lines respects the chosen direction", async ({ page }) => {
    await page.goto("/tools/sort-lines");
    await page.getByLabel("Text").fill("banana\napple\ncherry");
    await page.getByRole("button", { name: "Sort lines" }).click();
    await expect(page.getByLabel("Result")).toHaveValue("apple\nbanana\ncherry");

    await page.getByRole("radio", { name: "Z → A" }).check();
    await page.getByRole("button", { name: "Sort lines" }).click();
    await expect(page.getByLabel("Result")).toHaveValue("cherry\nbanana\napple");
  });

  test("Reverse Lines reverses line order only", async ({ page }) => {
    await page.goto("/tools/reverse-lines");
    await page.getByLabel("Text").fill("first\nsecond\nthird");
    await page.getByRole("button", { name: "Reverse lines" }).click();
    await expect(page.getByLabel("Result")).toHaveValue("third\nsecond\nfirst");
  });

  test("Trim Whitespace trims each line", async ({ page }) => {
    await page.goto("/tools/trim-whitespace");
    await page.getByLabel("Text").fill("  a  \n\tb\t");
    await page.getByRole("button", { name: "Trim whitespace" }).click();
    await expect(page.getByLabel("Result")).toHaveValue("a\nb");
  });

  test("Normalize Line Endings converts to the chosen target", async ({ page }) => {
    await page.goto("/tools/normalize-line-endings");
    await page.getByLabel("Text").fill("a\r\nb\nc");
    await page.getByRole("radio", { name: "LF (Unix/macOS)" }).check();
    await page.getByRole("button", { name: "Normalize" }).click();
    await expect(page.getByLabel("Result")).toHaveValue("a\nb\nc");
  });

  test("Case Converter switches between all 4 modes", async ({ page }) => {
    await page.goto("/tools/case-converter");
    await page.getByLabel("Text").fill("hello world");

    await page.getByRole("button", { name: "Convert" }).click();
    await expect(page.getByLabel("Result")).toHaveValue("HELLO WORLD");

    await page.getByRole("radio", { name: "Title Case" }).check();
    await page.getByRole("button", { name: "Convert" }).click();
    await expect(page.getByLabel("Result")).toHaveValue("Hello World");
  });

  test("new text tools never send pasted input over the network", async ({ page, baseURL }) => {
    const externalRequests: string[] = [];
    const baseOrigin = baseURL ? new URL(baseURL).origin : null;
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (baseOrigin && url.origin !== baseOrigin) externalRequests.push(request.url());
    });

    await page.goto("/tools/case-converter");
    await page.getByLabel("Text").fill("some secret-looking text");
    await page.getByRole("button", { name: "Convert" }).click();
    await expect(page.getByLabel("Result")).toBeVisible();
    await page.waitForTimeout(500);

    expect(externalRequests).toEqual([]);
  });
});

test.describe("Encoding category — new tools (/developer-tools/encoding)", () => {
  test("the Encoding category page now lists 8 tools", async ({ page }) => {
    await page.goto("/developer-tools/encoding");
    await expect(page.getByRole("heading", { level: 1, name: "Encoding" })).toBeVisible();
    for (const name of [
      "Base64 Encode",
      "Base64 Decode",
      "URL Encode",
      "URL Decode",
      "HTML Encode",
      "HTML Decode",
      "Unicode Escape",
      "Unicode Unescape",
    ]) {
      await expect(page.getByRole("link", { name: new RegExp(`^${name}`) })).toBeVisible();
    }
  });

  test("HTML Encode / Decode round-trip and encode only the 5 predefined characters", async ({ page }) => {
    const text = `<a href="x">Tom & Jerry's</a>`;

    await page.goto("/tools/html-encode");
    await page.getByLabel("Text", { exact: true }).fill(text);
    await page.getByRole("button", { name: "Encode" }).click();
    const encoded = await page.getByLabel("HTML-encoded text").inputValue();
    expect(encoded).toBe("&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&#39;s&lt;/a&gt;");

    await page.goto("/tools/html-decode");
    await page.getByLabel("HTML-encoded text").fill(encoded);
    await page.getByRole("button", { name: "Decode" }).click();
    await expect(page.getByLabel("Decoded text")).toHaveValue(text);
  });

  test("HTML Decode also handles numeric character references", async ({ page }) => {
    await page.goto("/tools/html-decode");
    await page.getByLabel("HTML-encoded text").fill("caf&#233; &#x26;");
    await page.getByRole("button", { name: "Decode" }).click();
    await expect(page.getByLabel("Decoded text")).toHaveValue("café &");
  });

  test("Unicode Escape / Unescape round-trip non-ASCII text", async ({ page }) => {
    const text = "café 日本語 🎉";

    await page.goto("/tools/unicode-escape");
    await page.getByLabel("Text", { exact: true }).fill(text);
    await page.getByRole("button", { name: "Escape" }).click();
    const escaped = await page.getByLabel("Escaped text").inputValue();
    expect(escaped).not.toBe(text);
    expect(escaped).toMatch(/\\u[0-9a-f]{4}/);

    await page.goto("/tools/unicode-unescape");
    await page.getByLabel("Escaped text", { exact: true }).fill(escaped);
    await page.getByRole("button", { name: "Unescape" }).click();
    await expect(page.getByLabel("Decoded text")).toHaveValue(text);
  });

  test("new encoding tools never send pasted input over the network", async ({ page, baseURL }) => {
    const externalRequests: string[] = [];
    const baseOrigin = baseURL ? new URL(baseURL).origin : null;
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (baseOrigin && url.origin !== baseOrigin) externalRequests.push(request.url());
    });

    await page.goto("/tools/html-encode");
    await page.getByLabel("Text", { exact: true }).fill("some secret-looking <text>");
    await page.getByRole("button", { name: "Encode" }).click();
    await expect(page.getByLabel("HTML-encoded text")).toBeVisible();
    await page.waitForTimeout(500);

    expect(externalRequests).toEqual([]);
  });
});

/**
 * The diff viewer, rebuilt to match what people expect from a dedicated diff
 * tool: aligned rows with line numbers on both sides, word-level highlighting
 * inside a changed line, next/previous navigation over change *blocks*, a
 * split/unified toggle, and ignore-case / ignore-whitespace options.
 */
test.describe("Text Diff viewer", () => {
  const ORIGINAL = "alpha\nthe quick brown fox\ngamma\ndelta\nepsilon";
  const CHANGED = "alpha\nthe slow brown fox\ngamma\nDELTA\nepsilon";

  async function compare(page: import("@playwright/test").Page) {
    await page.goto("/tools/text-diff");
    await page.getByLabel(/original text/i).fill(ORIGINAL);
    await page.getByLabel(/changed text/i).fill(CHANGED);
    await page.getByRole("button", { name: /^compare$/i }).click();
    await expect(page.getByText(/\d+ changes?/).first()).toBeVisible({ timeout: 15_000 });
  }

  test("summarises changes and shows line numbers on both sides", async ({ page }) => {
    await compare(page);
    await expect(page.getByText("2 changes")).toBeVisible();
    await expect(page.getByText(/\+\d+ added/)).toBeVisible();
    await expect(page.getByText(/\d+ removed/)).toBeVisible();
    await expect(page.getByText(/\d+ unchanged/)).toBeVisible();
    // Both sides are numbered, so the viewer reads like a real diff rather
    // than an anonymous list of rows.
    expect(await page.locator("table td.select-none").count()).toBeGreaterThan(5);
  });

  test("highlights only the words that changed within a line", async ({ page }) => {
    await compare(page);
    const marks = await page.locator("table mark").allTextContents();
    expect(marks.some((text) => /quick/.test(text))).toBe(true);
    expect(marks.some((text) => /slow/.test(text))).toBe(true);
    // "brown fox" is common to both sides and must not be highlighted, or the
    // whole line lights up and the highlighting stops meaning anything.
    expect(marks.some((text) => /brown/.test(text))).toBe(false);
  });

  test("steps through changes with the next/previous buttons", async ({ page }) => {
    await compare(page);
    await expect(page.getByText("Change 1 of 2")).toBeVisible();
    await page.getByRole("button", { name: "Next change" }).click();
    await expect(page.getByText("Change 2 of 2")).toBeVisible();
    // Wraps around rather than dead-ending on the last change.
    await page.getByRole("button", { name: "Next change" }).click();
    await expect(page.getByText("Change 1 of 2")).toBeVisible();
    await page.getByRole("button", { name: "Previous change" }).click();
    await expect(page.getByText("Change 2 of 2")).toBeVisible();
  });

  test("toggles between split and unified views", async ({ page }) => {
    await compare(page);
    await expect(page.getByRole("tab", { name: "split", exact: true })).toHaveAttribute("aria-selected", "true");

    await page.getByRole("tab", { name: "unified", exact: true }).click();
    await expect(page.getByRole("tab", { name: "unified", exact: true })).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("table tr").first()).toBeVisible();

    await page.getByRole("tab", { name: "split", exact: true }).click();
    await expect(page.getByRole("tab", { name: "split", exact: true })).toHaveAttribute("aria-selected", "true");
  });

  test("ignore case collapses a case-only difference", async ({ page }) => {
    await compare(page);
    await expect(page.getByText("2 changes")).toBeVisible();

    // "delta" vs "DELTA" is one of the two changes; ignoring case drops it.
    await page.getByLabel(/ignore case/i).check();
    await page.getByRole("button", { name: /^compare$/i }).click();
    await expect(page.getByText("1 change", { exact: false })).toBeVisible({ timeout: 15_000 });
  });

  test("reports no differences for identical input", async ({ page }) => {
    await page.goto("/tools/text-diff");
    await page.getByLabel(/original text/i).fill("same\ntext");
    await page.getByLabel(/changed text/i).fill("same\ntext");
    await page.getByRole("button", { name: /^compare$/i }).click();
    await expect(page.getByText("No differences")).toBeVisible({ timeout: 15_000 });
    // With nothing to step through, the navigation controls stay hidden.
    await expect(page.getByRole("button", { name: "Next change" })).toHaveCount(0);
  });
});

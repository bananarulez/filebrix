// @vitest-environment node
//
// extractPdfText() has no DOM dependency (unlike thumbnail.ts/rasterize.ts,
// which need a real <canvas>) — see CLAUDE.md's note on why this file is
// unit-tested directly rather than pushed to e2e-only. Forcing the plain
// Node environment (rather than the project's default jsdom) avoids
// pdfjs-dist's environment auto-detection picking browser-only code paths
// that don't exist under jsdom's partial DOM shim.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { extractPdfText } from "@/engines/pdf/render/extractText";

const FIXTURES_DIR = path.resolve(process.cwd(), "tests", "fixtures", "pdf");

async function loadRealDocument(filename: string) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = new Uint8Array(fs.readFileSync(path.join(FIXTURES_DIR, filename)));
  return pdfjs.getDocument({ data }).promise;
}

describe("extractPdfText — real fixtures", () => {
  it("extracts real embedded text from every page of a text-based multi-page PDF", async () => {
    const doc = await loadRealDocument("multi-page.pdf");
    const result = await extractPdfText(doc);
    expect(result.pages).toHaveLength(doc.numPages);
    expect(result.hasExtractableText).toBe(true);
    expect(result.pages.some((text) => text.trim().length > 0)).toBe(true);
  });

  it("reports hasExtractableText: false for a scanned (image-only) PDF, never fabricating OCR text", async () => {
    const doc = await loadRealDocument("scanned.pdf");
    const result = await extractPdfText(doc);
    expect(result.hasExtractableText).toBe(false);
    expect(result.pages.every((text) => text.trim().length === 0)).toBe(true);
  });
});

describe("extractPdfText — pure logic via a mocked PDFDocumentProxy", () => {
  function fakeDoc(pagesItems: Array<Array<{ str?: string }>>) {
    const cleanupCalls: number[] = [];
    return {
      numPages: pagesItems.length,
      cleanupCalls,
      async getPage(pageNumber: number) {
        const items = pagesItems[pageNumber - 1];
        return {
          async getTextContent() {
            return { items };
          },
          cleanup() {
            cleanupCalls.push(pageNumber);
          },
        };
      },
      // Minimal shape satisfying the PDFDocumentProxy type at the call site.
    } as unknown as import("pdfjs-dist").PDFDocumentProxy & { cleanupCalls: number[] };
  }

  it("joins str items with no separator, matching pdf.js's own text layout convention", async () => {
    const doc = fakeDoc([[{ str: "Hello" }, { str: ", " }, { str: "world" }]]);
    const result = await extractPdfText(doc);
    expect(result.pages).toEqual(["Hello, world"]);
    expect(result.hasExtractableText).toBe(true);
  });

  it("filters out TextMarkedContent items (no .str) without crashing", async () => {
    const doc = fakeDoc([[{ str: "A" }, {}, { str: "B" }]]);
    const result = await extractPdfText(doc);
    expect(result.pages).toEqual(["AB"]);
  });

  it("treats a page with only whitespace/empty text as not extractable, but still returns its (empty) entry", async () => {
    const doc = fakeDoc([[{ str: "  " }], [{ str: "Real content" }]]);
    const result = await extractPdfText(doc);
    expect(result.pages).toEqual(["  ", "Real content"]);
    expect(result.hasExtractableText).toBe(true);
  });

  it("reports hasExtractableText: false when every page is empty", async () => {
    const doc = fakeDoc([[], [{ str: "" }]]);
    const result = await extractPdfText(doc);
    expect(result.hasExtractableText).toBe(false);
  });

  it("calls page.cleanup() for every page, even across multiple pages", async () => {
    const doc = fakeDoc([[{ str: "1" }], [{ str: "2" }], [{ str: "3" }]]);
    await extractPdfText(doc);
    expect(doc.cleanupCalls).toEqual([1, 2, 3]);
  });
});

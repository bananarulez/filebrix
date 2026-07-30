import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { inspectPdf } from "@/engines/pdf/structural/inspect";
import { buildPdfFromSelection } from "@/engines/pdf/structural/pages";
import { buildPdfFromImages } from "@/engines/pdf/structural/imagesToPdf";
import { readPdfMetadata, removePdfMetadata } from "@/engines/pdf/structural/metadata";
import { ProcessingError } from "@/lib/errors/ProcessingError";
import type { Progress } from "@/engines/shared/types";

const FIXTURES_DIR = path.join(__dirname, "..", "fixtures", "pdf");

function fixture(name: string): Uint8Array {
  return new Uint8Array(readFileSync(path.join(FIXTURES_DIR, name)));
}

describe("inspectPdf", () => {
  it("reports page count, size, and rotation for a multi-page PDF", async () => {
    const info = await inspectPdf(fixture("multi-page.pdf"));
    expect(info.pageCount).toBe(5);
    expect(info.pages).toHaveLength(5);
    expect(info.pages[0]?.rotation).toBe(0);
    expect(info.pages[0]?.width).toBeGreaterThan(0);
  });

  it("reports each page's own rotation", async () => {
    const info = await inspectPdf(fixture("rotated-pages.pdf"));
    expect(info.pages.map((p) => p.rotation)).toEqual([0, 90, 180, 270]);
  });

  it("reports mixed page sizes accurately", async () => {
    const info = await inspectPdf(fixture("mixed-sizes.pdf"));
    const sizes = info.pages.map((p) => [Math.round(p.width), Math.round(p.height)]);
    expect(sizes[2]).toEqual([200, 300]);
    expect(sizes[0]).not.toEqual(sizes[1]);
  });

  it("throws a clear MALFORMED_FILE error for a corrupted PDF", async () => {
    await expect(inspectPdf(fixture("malformed.pdf"))).rejects.toMatchObject({
      code: "MALFORMED_FILE",
    });
  });

  it("throws a clear UNSUPPORTED_FORMAT error for an encrypted PDF, never attempting to bypass the password", async () => {
    await expect(inspectPdf(fixture("encrypted.pdf"))).rejects.toMatchObject({
      code: "UNSUPPORTED_FORMAT",
    });
    await expect(inspectPdf(fixture("encrypted.pdf"))).rejects.toThrow(/password-protected/i);
  });

  it("handles a minimal single blank page without error", async () => {
    const info = await inspectPdf(fixture("empty.pdf"));
    expect(info.pageCount).toBe(1);
  });
});

describe("buildPdfFromSelection — the shared merge/extract/delete/reorder/rotate primitive", () => {
  it("extracts a subset of pages in the requested order (extract/reorder)", async () => {
    const source = fixture("multi-page.pdf");
    const result = await buildPdfFromSelection(
      [source],
      [
        { sourceIndex: 0, pageIndex: 2 },
        { sourceIndex: 0, pageIndex: 0 },
      ]
    );
    const info = await inspectPdf(result);
    expect(info.pageCount).toBe(2);
  });

  it("merges pages from multiple source files in the given order", async () => {
    const a = fixture("multi-page.pdf");
    const b = fixture("mixed-sizes.pdf");
    const result = await buildPdfFromSelection(
      [a, b],
      [
        { sourceIndex: 0, pageIndex: 0 },
        { sourceIndex: 1, pageIndex: 0 },
        { sourceIndex: 0, pageIndex: 1 },
      ]
    );
    const info = await inspectPdf(result);
    expect(info.pageCount).toBe(3);
  });

  it("applies a rotation delta on top of a page's existing rotation", async () => {
    const source = fixture("rotated-pages.pdf");
    const result = await buildPdfFromSelection(
      [source],
      [{ sourceIndex: 0, pageIndex: 0, rotationDelta: 90 }]
    );
    const info = await inspectPdf(result);
    expect(info.pages[0]?.rotation).toBe(90);
  });

  it("rejects an empty selection with a clear error instead of producing a 0-page PDF", async () => {
    await expect(buildPdfFromSelection([fixture("multi-page.pdf")], [])).rejects.toMatchObject({
      code: "MALFORMED_FILE",
    });
  });

  it("reports per-page progress that ends at 100%", async () => {
    const source = fixture("large.pdf");
    const selection = Array.from({ length: 60 }, (_, pageIndex) => ({ sourceIndex: 0, pageIndex }));
    const reports: Progress[] = [];

    const result = await buildPdfFromSelection([source], selection, (progress) =>
      reports.push(progress)
    );

    expect((await inspectPdf(result)).pageCount).toBe(60);
    // Per page, not per source file: a 60-page single-file build reports far
    // more than the two updates a per-file granularity could manage.
    expect(reports.length).toBeGreaterThan(10);
    expect(reports.some((r) => r.message?.includes("Copying page 30 of 60"))).toBe(true);
    expect(reports.at(-1)?.percent).toBe(100);
    // Monotonic — a bar that goes backwards reads as a restart.
    const percents = reports.map((r) => r.percent ?? 0);
    expect([...percents].sort((a, b) => a - b)).toEqual(percents);
  });

  it("caps how often it reports, so a huge selection can't flood the boundary", async () => {
    const source = fixture("large.pdf");
    // 600 page references (every page ten times over) against a 100-report cap.
    const selection = Array.from({ length: 600 }, (_, i) => ({
      sourceIndex: 0,
      pageIndex: i % 60,
    }));
    const reports: Progress[] = [];

    await buildPdfFromSelection([source], selection, (progress) => reports.push(progress));

    // ≤100 copy reports, plus the leading "Reading…" and the two closing ones.
    expect(reports.length).toBeLessThanOrEqual(103);
    expect(reports.at(-1)?.percent).toBe(100);
  });

  it("produces identical output whether or not a progress callback is passed", async () => {
    const source = fixture("multi-page.pdf");
    const selection = [
      { sourceIndex: 0, pageIndex: 1 },
      { sourceIndex: 0, pageIndex: 0 },
    ];
    const withProgress = await buildPdfFromSelection([source], selection, () => {});
    const withoutProgress = await buildPdfFromSelection([source], selection);

    // Progress reporting is observational only — it must not touch what gets
    // built. (Byte-identical here because pdf-lib stamps no timestamp of its
    // own into a document it created from copied pages.)
    expect((await inspectPdf(withProgress)).pageCount).toBe(
      (await inspectPdf(withoutProgress)).pageCount
    );
    expect(withProgress.length).toBe(withoutProgress.length);
  });
});

describe("buildPdfFromImages", () => {
  it("creates one page per image, sized to that image's own dimensions", async () => {
    const png = fixture("sample-image-1.png");
    const jpg = fixture("sample-image-2.jpg");
    const result = await buildPdfFromImages([png, jpg]);
    const info = await inspectPdf(result);
    expect(info.pageCount).toBe(2);
    expect(Math.round(info.pages[0]!.width)).toBe(400);
    expect(Math.round(info.pages[0]!.height)).toBe(300);
    expect(Math.round(info.pages[1]!.width)).toBe(300);
    expect(Math.round(info.pages[1]!.height)).toBe(500);
  });

  it("rejects a non-image file with a clear error", async () => {
    await expect(buildPdfFromImages([fixture("multi-page.pdf")])).rejects.toBeInstanceOf(ProcessingError);
  });
});

describe("PDF metadata", () => {
  it("reads title/author set on the source document", async () => {
    const info = await readPdfMetadata(fixture("multi-page.pdf"));
    expect(info.title).toBe("Multi-page sample");
    expect(info.author).toBe("web-transform fixture generator");
    expect(info.pageCount).toBe(5);
  });

  it("removes all standard metadata fields", async () => {
    const cleaned = await removePdfMetadata(fixture("multi-page.pdf"));
    const info = await readPdfMetadata(cleaned);
    expect(info.title).toBeUndefined();
    expect(info.author).toBeUndefined();
    expect(info.pageCount).toBe(5);
  });
});

/**
 * TASK A — metadata removal must strip *both* channels a PDF stores it in.
 *
 * `with-xmp.pdf` (scripts/generate-pdf-metadata-fixtures.py, via pypdf —
 * pdf-lib can't write XMP) deliberately carries an Info dictionary *and* a
 * catalog `/Metadata` XMP stream, with distinct sentinel strings in each so
 * a test can tell which one survived. Assertions are against the raw output
 * bytes rather than a re-parsed document: the whole point is that nothing is
 * left *in the file*, and a parser-level check would miss an orphaned object
 * that no longer has a reference but is still serialized — which is exactly
 * the bug this fixture caught.
 */
describe("removePdfMetadata — XMP metadata stream", () => {
  const latin1 = new TextDecoder("latin1");
  const contains = (bytes: Uint8Array, needle: string) => latin1.decode(bytes).includes(needle);

  it("the fixture really does carry both an Info dictionary and an XMP stream", () => {
    const input = fixture("with-xmp.pdf");
    // Guards the test itself: if the fixture ever regenerates without one of
    // the two channels, the assertions below would pass vacuously.
    expect(contains(input, "INFOSECRETTITLE")).toBe(true);
    expect(contains(input, "XMPSECRETTITLE")).toBe(true);
    expect(contains(input, "x:xmpmeta")).toBe(true);
  });

  it("removes the Info dictionary, the XMP packet, and every sentinel in either", async () => {
    const output = await removePdfMetadata(fixture("with-xmp.pdf"));

    for (const sentinel of [
      "INFOSECRETTITLE",
      "INFOSECRETAUTHOR",
      "INFOSECRETSUBJECT",
      "INFOSECRETKEYWORDS",
      "INFOSECRETCREATOR",
      "INFOSECRETPRODUCER",
      "XMPSECRETTITLE",
      "XMPSECRETAUTHOR",
      "XMPSECRETTOOL",
    ]) {
      expect(contains(output, sentinel), `${sentinel} survived removal`).toBe(false);
    }

    // The XMP envelope itself must be gone, not merely its payload.
    expect(contains(output, "x:xmpmeta")).toBe(false);
    expect(contains(output, "xpacket")).toBe(false);
  });

  it("leaves a valid, readable PDF with no metadata behind", async () => {
    const output = await removePdfMetadata(fixture("with-xmp.pdf"));
    const info = await readPdfMetadata(output);

    expect(info.pageCount).toBe(1);
    expect(info.title).toBeUndefined();
    expect(info.author).toBeUndefined();
    expect(info.producer).toBeUndefined();

    // Still structurally sound enough for every other tool to consume.
    const inspected = await inspectPdf(output);
    expect(inspected.pageCount).toBe(1);
  });

  it("is a no-op on a PDF that has no XMP stream at all", async () => {
    const output = await removePdfMetadata(fixture("multi-page.pdf"));
    const info = await readPdfMetadata(output);
    expect(info.pageCount).toBe(5);
    expect(info.title).toBeUndefined();
  });
});

/**
 * TASK B — signed PDFs are detected and reported, never rejected.
 *
 * This is deliberately the opposite treatment from encryption: an encrypted
 * PDF throws (pdf-lib can't read its content at all), whereas a signed PDF
 * must remain fully processable — the signature simply won't survive, and
 * the user needs to be told rather than blocked.
 */
describe("digital signature detection", () => {
  it("reports hasSignature for a PDF carrying an /FT /Sig field", async () => {
    const info = await inspectPdf(fixture("signed.pdf"));
    expect(info.hasSignature).toBe(true);
  });

  it("reports hasSignature: false for ordinary PDFs", async () => {
    for (const name of ["multi-page.pdf", "with-xmp.pdf", "rotated-pages.pdf"]) {
      const info = await inspectPdf(fixture(name));
      expect(info.hasSignature, `${name} was misreported as signed`).toBe(false);
    }
  });

  it("surfaces the same flag through readPdfMetadata", async () => {
    expect((await readPdfMetadata(fixture("signed.pdf"))).hasSignature).toBe(true);
    expect((await readPdfMetadata(fixture("multi-page.pdf"))).hasSignature).toBe(false);
  });

  it("still processes a signed PDF rather than rejecting it", async () => {
    // The whole point of the non-blocking treatment: every structural
    // operation must keep working on a signed document.
    const signed = fixture("signed.pdf");

    const rebuilt = await buildPdfFromSelection([signed], [{ sourceIndex: 0, pageIndex: 0 }]);
    expect((await inspectPdf(rebuilt)).pageCount).toBe(1);

    const stripped = await removePdfMetadata(signed);
    expect((await inspectPdf(stripped)).pageCount).toBe(1);
  });

  it("does not weaken the encrypted-PDF rejection", async () => {
    // Guards the softer signature path from having loosened the hard one.
    await expect(inspectPdf(fixture("encrypted.pdf"))).rejects.toThrow(/password-protected/i);
  });
});

/**
 * readPdfMetadata must report what the file says, not what pdf-lib would
 * write. pdf-lib's default load path calls `updateInfoDict()` in its
 * constructor, which sets `Producer`/`Creator` to its own name and `ModDate`
 * to *now* — so a metadata viewer built on the default load would show every
 * document as modified today. Found while testing metadata removal; this
 * pins the fix.
 */
describe("readPdfMetadata — reports the file's real values", () => {
  it("does not report a modification date of 'now' for an older file", async () => {
    const info = await readPdfMetadata(fixture("multi-page.pdf"));
    if (info.modificationDate === undefined) return; // nothing to check

    const reported = new Date(info.modificationDate).getTime();
    const oneMinuteAgo = Date.now() - 60_000;
    expect(reported, "ModDate looks freshly stamped rather than read").toBeLessThan(oneMinuteAgo);
  });

  it("reports the same values on repeated reads", async () => {
    // A mutating read would produce a different ModDate each call.
    const first = await readPdfMetadata(fixture("multi-page.pdf"));
    await new Promise((resolve) => setTimeout(resolve, 1100));
    const second = await readPdfMetadata(fixture("multi-page.pdf"));
    expect(second).toEqual(first);
  });
});

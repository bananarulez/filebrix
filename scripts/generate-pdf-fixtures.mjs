// Generates the PDF-engine e2e fixtures under tests/fixtures/pdf/. Uses our
// own installed pdf-lib (dogfooding), matching
// scripts/generate-spreadsheet-fixtures.mjs's approach. Run manually
// whenever fixtures need to be regenerated:
//
//   node scripts/generate-pdf-fixtures.mjs
//
// The encrypted fixture can't be made with pdf-lib (no encryption support)
// — see generate-encrypted-pdf-fixture.py, run separately with Python+pypdf.
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument, StandardFonts, degrees, PageSizes, rgb } from "pdf-lib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, "..", "tests", "fixtures", "pdf");
mkdirSync(fixturesDir, { recursive: true });

function write(name, bytes) {
  const path = join(fixturesDir, name);
  writeFileSync(path, bytes);
  console.log(`wrote ${path} (${bytes.length} bytes)`);
}

async function addLabeledPage(doc, font, label) {
  const page = doc.addPage(PageSizes.A4);
  const { height } = page.getSize();
  page.drawText(label, { x: 50, y: height - 80, size: 24, font });
  return page;
}

// --- multi-page.pdf: 5 pages, each with distinguishable text (also exercises PDF-to-TXT) ---
{
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  doc.setTitle("Multi-page sample");
  doc.setAuthor("web-transform fixture generator");
  for (let i = 1; i <= 5; i += 1) {
    await addLabeledPage(doc, font, `Page ${i} of 5`);
  }
  write("multi-page.pdf", await doc.save());
}

// --- rotated-pages.pdf: 4 pages, rotations 0/90/180/270 ---
{
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const rotations = [0, 90, 180, 270];
  for (const rotation of rotations) {
    const page = await addLabeledPage(doc, font, `Rotated ${rotation}`);
    page.setRotation(degrees(rotation));
  }
  write("rotated-pages.pdf", await doc.save());
}

// --- mixed-sizes.pdf: A4, Letter, and a small custom size ---
{
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const sizes = [PageSizes.A4, PageSizes.Letter, [200, 300]];
  for (const [i, size] of sizes.entries()) {
    const page = doc.addPage(size);
    page.drawText(`Size ${i + 1}`, { x: 20, y: size[1] - 40, size: 18, font });
  }
  write("mixed-sizes.pdf", await doc.save());
}

// --- large.pdf: 60 pages, for lazy-thumbnail/perf testing ---
{
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= 60; i += 1) {
    await addLabeledPage(doc, font, `Page ${i} of 60`);
  }
  write("large.pdf", await doc.save());
}

// --- scanned.pdf: a page with only a drawn rectangle, no text at all ---
// (simulates a scanned/image-only PDF for the "no extractable text" path)
{
  const doc = await PDFDocument.create();
  const page = doc.addPage(PageSizes.A4);
  const { width, height } = page.getSize();
  page.drawRectangle({
    x: 50,
    y: height - 250,
    width: width - 100,
    height: 200,
    borderColor: rgb(0, 0, 0),
    borderWidth: 2,
  });
  write("scanned.pdf", await doc.save());
}

// --- malformed.pdf: corrupt a valid PDF's trailer/xref so parsing fails cleanly ---
{
  const valid = readFileSync(join(fixturesDir, "multi-page.pdf"));
  const corrupted = Buffer.from(valid);
  // Blow away the last 200 bytes (trailer + xref + %%EOF) — same "corrupt the
  // footer metadata" technique used for the malformed Parquet fixture.
  const corruptStart = Math.max(0, corrupted.length - 200);
  for (let i = corruptStart; i < corrupted.length; i += 1) {
    corrupted[i] = 0x00;
  }
  write("malformed.pdf", corrupted);
}

// --- empty.pdf: a single essentially-blank page (edge case: valid but minimal) ---
{
  const doc = await PDFDocument.create();
  doc.addPage(PageSizes.A4);
  write("empty.pdf", await doc.save());
}

console.log("Done. Run scripts/generate-encrypted-pdf-fixture.py separately for the encrypted fixture.");

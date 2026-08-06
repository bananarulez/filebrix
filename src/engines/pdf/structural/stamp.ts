import { degrees, PDFFont, PDFPage, rgb, StandardFonts } from "pdf-lib";
import { loadPdfDocument, toPdfProcessingError } from "./load";
import { ProcessingError } from "@/lib/errors/ProcessingError";

/**
 * Drawing text onto every page — the shared mechanism behind Watermark PDF
 * and PDF page numbering. Both are `drawText` per page with a position, so
 * they're one module rather than two that would drift.
 *
 * Uses pdf-lib's standard Helvetica, which needs no font file and is one of
 * the 14 fonts every PDF reader is required to have. That's also the
 * limitation: the standard fonts are WinAnsi-encoded, so text outside Latin-1
 * (Cyrillic, Greek, CJK, and Czech's ř/ě/ů among others) cannot be encoded.
 * That is detected and reported rather than silently mangled — see
 * `assertEncodable`.
 */

export type StampPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "center"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export interface WatermarkPdfOptions {
  text: string;
  position: StampPosition;
  /** 0–1. */
  opacity: number;
  fontSize: number;
  /** Counter-clockwise, in degrees, on top of any page rotation. 45 is the conventional diagonal watermark. */
  rotationDegrees: number;
  color: { r: number; g: number; b: number };
}

export interface PageNumberOptions {
  position: StampPosition;
  fontSize: number;
  /** `{n}` and `{total}` are substituted; anything else is literal. */
  format: string;
  /** 1-based page to start numbering from — earlier pages are left unstamped (title pages, covers). */
  startPage: number;
  /** The number printed on `startPage`, so a chapter can continue a previous document's numbering. */
  startNumber: number;
}

/** Distance from the page edge, in points, for every non-centred position. */
const MARGIN = 36;

/**
 * Where a point sits in *unrotated* page space, given where it should appear
 * to a reader looking at the page as displayed.
 *
 * A PDF page carries `/Rotate`, "the number of degrees by which the page
 * shall be rotated clockwise when displayed". Content coordinates are in the
 * unrotated space, so stamping a page with `/Rotate 90` at what looks like
 * the bottom-right actually lands somewhere else entirely once the viewer
 * applies the rotation — the failure people describe as "my page numbers came
 * out sideways in the margin".
 *
 * Exported for its own unit test: this is pure arithmetic with four known
 * corner mappings, so it can be verified exactly, unlike the rendering around
 * it.
 */
export function visibleToUnrotated(
  angle: number,
  width: number,
  height: number,
  visibleX: number,
  visibleY: number
): { x: number; y: number } {
  // Rotating the page θ clockwise maps unrotated (x, y) to visible:
  //   90:  (y, width - x)     180: (width - x, height - y)     270: (height - y, x)
  // These are those relations solved for (x, y).
  switch (((angle % 360) + 360) % 360) {
    case 90:
      return { x: width - visibleY, y: visibleX };
    case 180:
      return { x: width - visibleX, y: height - visibleY };
    case 270:
      return { x: visibleY, y: height - visibleX };
    default:
      return { x: visibleX, y: visibleY };
  }
}

/** The page's size as a reader sees it — width and height swap on a quarter turn. */
export function visibleSize(angle: number, width: number, height: number): { width: number; height: number } {
  const normalized = ((angle % 360) + 360) % 360;
  return normalized === 90 || normalized === 270 ? { width: height, height: width } : { width, height };
}

/**
 * Anchor for a piece of text of known size, in *visible* coordinates, with
 * the y value already adjusted so `drawText`'s baseline lands sensibly rather
 * than clipping the descenders off a bottom-aligned stamp.
 */
function anchor(
  position: StampPosition,
  visible: { width: number; height: number },
  textWidth: number,
  textHeight: number
): { x: number; y: number } {
  const left = MARGIN;
  const right = Math.max(MARGIN, visible.width - textWidth - MARGIN);
  const centerX = Math.max(0, (visible.width - textWidth) / 2);
  const bottom = MARGIN;
  const top = Math.max(MARGIN, visible.height - textHeight - MARGIN);
  const centerY = Math.max(0, (visible.height - textHeight) / 2);

  switch (position) {
    case "top-left":
      return { x: left, y: top };
    case "top-center":
      return { x: centerX, y: top };
    case "top-right":
      return { x: right, y: top };
    case "center":
      return { x: centerX, y: centerY };
    case "bottom-left":
      return { x: left, y: bottom };
    case "bottom-center":
      return { x: centerX, y: bottom };
    case "bottom-right":
      return { x: right, y: bottom };
  }
}

/**
 * The standard 14 fonts can't encode outside WinAnsi, and pdf-lib throws a
 * low-level error naming the offending code point. Checking up front turns
 * that into a sentence a user can act on — and, more importantly, stops a
 * partially-stamped document being handed back as if it had worked.
 */
function assertEncodable(font: PDFFont, text: string): void {
  try {
    font.widthOfTextAtSize(text, 12);
    font.encodeText(text);
  } catch {
    throw new ProcessingError(
      "UNSUPPORTED_FORMAT",
      "This text contains characters the built-in PDF fonts can't encode (for example Cyrillic, Greek, CJK, or some Central European accents). Try text in basic Latin characters."
    );
  }
}

function stampPage(
  page: PDFPage,
  font: PDFFont,
  text: string,
  options: {
    position: StampPosition;
    fontSize: number;
    opacity: number;
    extraRotation: number;
    color: { r: number; g: number; b: number };
  }
): void {
  const { width, height } = page.getSize();
  const pageAngle = page.getRotation().angle;
  const visible = visibleSize(pageAngle, width, height);

  const textWidth = font.widthOfTextAtSize(text, options.fontSize);
  const textHeight = font.heightAtSize(options.fontSize);
  const spot = anchor(options.position, visible, textWidth, textHeight);
  const { x, y } = visibleToUnrotated(pageAngle, width, height, spot.x, spot.y);

  page.drawText(text, {
    x,
    y,
    size: options.fontSize,
    font,
    opacity: options.opacity,
    color: rgb(options.color.r, options.color.g, options.color.b),
    // Pre-rotating by the page's own angle cancels the viewer's clockwise
    // display rotation, so the stamp reads upright however the page is set.
    rotate: degrees(pageAngle + options.extraRotation),
  });
}

export async function watermarkPdf(
  bytes: Uint8Array | ArrayBuffer,
  options: WatermarkPdfOptions
): Promise<Uint8Array> {
  const text = options.text.trim();
  if (text === "") throw new ProcessingError("MALFORMED_FILE", "Enter some watermark text.");

  try {
    const doc = await loadPdfDocument(bytes);
    const font = await doc.embedFont(StandardFonts.Helvetica);
    assertEncodable(font, text);

    for (const page of doc.getPages()) {
      stampPage(page, font, text, {
        position: options.position,
        fontSize: options.fontSize,
        opacity: options.opacity,
        extraRotation: options.rotationDegrees,
        color: options.color,
      });
    }
    return await doc.save();
  } catch (cause) {
    throw toPdfProcessingError(cause);
  }
}

/** `{n}` / `{total}` substitution. Kept separate so the numbering logic is testable without a document. */
export function formatPageNumber(format: string, current: number, total: number): string {
  return format.replaceAll("{n}", String(current)).replaceAll("{total}", String(total));
}

export async function addPageNumbers(
  bytes: Uint8Array | ArrayBuffer,
  options: PageNumberOptions
): Promise<Uint8Array> {
  try {
    const doc = await loadPdfDocument(bytes);
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const pages = doc.getPages();

    // `total` counts the pages that actually get a number, so "Page 1 of 9"
    // on a 10-page document that skips its cover is right rather than
    // off-by-one against what the reader can see.
    const firstIndex = Math.max(0, options.startPage - 1);
    const total = Math.max(0, pages.length - firstIndex);

    for (let index = firstIndex; index < pages.length; index++) {
      const label = formatPageNumber(options.format, options.startNumber + (index - firstIndex), total);
      assertEncodable(font, label);
      stampPage(pages[index], font, label, {
        position: options.position,
        fontSize: options.fontSize,
        opacity: 1,
        extraRotation: 0,
        color: { r: 0, g: 0, b: 0 },
      });
    }
    return await doc.save();
  } catch (cause) {
    throw toPdfProcessingError(cause);
  }
}

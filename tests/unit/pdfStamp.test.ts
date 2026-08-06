import { describe, expect, it } from "vitest";
import { formatPageNumber, visibleSize, visibleToUnrotated } from "@/engines/pdf/structural/stamp";

/**
 * The rotation mapping is the part of stamping that's easy to get wrong and
 * impossible to notice without opening the file: a page number placed
 * "bottom-right" on a page with /Rotate 90 lands somewhere else entirely, and
 * every assertion about the *output document* still passes.
 *
 * It's pure arithmetic with exactly-known answers, so it's pinned here rather
 * than left to a visual check.
 */
const W = 600; // unrotated width
const H = 800; // unrotated height

describe("stamp placement under page rotation", () => {
  it("swaps the visible dimensions on a quarter turn only", () => {
    expect(visibleSize(0, W, H)).toEqual({ width: W, height: H });
    expect(visibleSize(180, W, H)).toEqual({ width: W, height: H });
    expect(visibleSize(90, W, H)).toEqual({ width: H, height: W });
    expect(visibleSize(270, W, H)).toEqual({ width: H, height: W });
  });

  it("is the identity on an unrotated page", () => {
    expect(visibleToUnrotated(0, W, H, 10, 20)).toEqual({ x: 10, y: 20 });
  });

  it("maps each visible corner to the right unrotated corner at 90°", () => {
    // Rotating the page 90° clockwise for display sends the unrotated
    // bottom-left corner to the visible top-left. Visible space is H x W.
    const visible = visibleSize(90, W, H);
    // visible bottom-left -> unrotated bottom-right
    expect(visibleToUnrotated(90, W, H, 0, 0)).toEqual({ x: W, y: 0 });
    // visible top-left -> unrotated bottom-left
    expect(visibleToUnrotated(90, W, H, 0, visible.height)).toEqual({ x: 0, y: 0 });
    // visible bottom-right -> unrotated top-right
    expect(visibleToUnrotated(90, W, H, visible.width, 0)).toEqual({ x: W, y: H });
  });

  it("maps each visible corner to the right unrotated corner at 270°", () => {
    const visible = visibleSize(270, W, H);
    expect(visibleToUnrotated(270, W, H, 0, 0)).toEqual({ x: 0, y: H });
    expect(visibleToUnrotated(270, W, H, visible.width, 0)).toEqual({ x: 0, y: 0 });
    expect(visibleToUnrotated(270, W, H, 0, visible.height)).toEqual({ x: W, y: H });
  });

  it("flips both axes at 180°", () => {
    expect(visibleToUnrotated(180, W, H, 0, 0)).toEqual({ x: W, y: H });
    expect(visibleToUnrotated(180, W, H, W, H)).toEqual({ x: 0, y: 0 });
  });

  it("stays inside the page for every rotation and corner", () => {
    // The property that actually matters: a stamp asked for near an edge must
    // land on the page, whatever /Rotate says.
    for (const angle of [0, 90, 180, 270]) {
      const visible = visibleSize(angle, W, H);
      for (const [vx, vy] of [
        [36, 36],
        [visible.width - 36, 36],
        [36, visible.height - 36],
        [visible.width - 36, visible.height - 36],
      ]) {
        const { x, y } = visibleToUnrotated(angle, W, H, vx, vy);
        expect(x, `angle ${angle} x`).toBeGreaterThanOrEqual(0);
        expect(x, `angle ${angle} x`).toBeLessThanOrEqual(W);
        expect(y, `angle ${angle} y`).toBeGreaterThanOrEqual(0);
        expect(y, `angle ${angle} y`).toBeLessThanOrEqual(H);
      }
    }
  });

  it("normalizes a negative or over-full-turn angle", () => {
    // pdf-lib reports whatever the file says, which can be -90 or 450.
    expect(visibleToUnrotated(-90, W, H, 5, 7)).toEqual(visibleToUnrotated(270, W, H, 5, 7));
    expect(visibleToUnrotated(450, W, H, 5, 7)).toEqual(visibleToUnrotated(90, W, H, 5, 7));
    expect(visibleSize(-90, W, H)).toEqual({ width: H, height: W });
  });
});

describe("page number formatting", () => {
  it("substitutes both tokens", () => {
    expect(formatPageNumber("Page {n} of {total}", 3, 12)).toBe("Page 3 of 12");
  });

  it("supports a bare number and repeated tokens", () => {
    expect(formatPageNumber("{n}", 7, 12)).toBe("7");
    expect(formatPageNumber("{n}/{total} — {n}", 2, 4)).toBe("2/4 — 2");
  });

  it("leaves an unknown token alone rather than guessing", () => {
    expect(formatPageNumber("{page} {n}", 1, 2)).toBe("{page} 1");
  });
});

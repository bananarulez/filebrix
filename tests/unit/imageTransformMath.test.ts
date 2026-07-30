import { describe, expect, it } from "vitest";
import { computeResizeDimensions, computeRotatedDimensions } from "@/engines/image/transform/dimensions";
import {
  EXTENSION_BY_FORMAT,
  formatIsLossy,
  formatSupportsTransparency,
  MIME_BY_FORMAT,
} from "@/engines/image/transform/mime";

describe("computeResizeDimensions", () => {
  const original = { width: 400, height: 200 }; // 2:1 aspect ratio

  it("derives height from width when only width is given (aspect locked)", () => {
    expect(computeResizeDimensions(original, { width: 200, lockAspectRatio: true })).toEqual({
      width: 200,
      height: 100,
    });
  });

  it("derives width from height when only height is given (aspect locked)", () => {
    expect(computeResizeDimensions(original, { height: 50, lockAspectRatio: true })).toEqual({
      width: 100,
      height: 50,
    });
  });

  it("uses both dimensions exactly when aspect ratio is not locked", () => {
    expect(computeResizeDimensions(original, { width: 300, height: 300, lockAspectRatio: false })).toEqual({
      width: 300,
      height: 300,
    });
  });

  it("width wins over height when both are given but locked", () => {
    expect(
      computeResizeDimensions(original, { width: 100, height: 999, lockAspectRatio: true })
    ).toEqual({ width: 100, height: 50 });
  });

  it("returns the original dimensions when neither width nor height is given", () => {
    expect(computeResizeDimensions(original, { lockAspectRatio: true })).toEqual(original);
  });

  it("never produces a zero or negative dimension", () => {
    const result = computeResizeDimensions({ width: 10, height: 1000 }, { width: 1, lockAspectRatio: true });
    expect(result.height).toBeGreaterThanOrEqual(1);
  });
});

describe("computeRotatedDimensions", () => {
  const original = { width: 400, height: 200 };

  it("swaps width/height for a 90-degree rotation", () => {
    expect(computeRotatedDimensions(original, 90)).toEqual({ width: 200, height: 400 });
  });

  it("swaps width/height for a 270-degree rotation", () => {
    expect(computeRotatedDimensions(original, 270)).toEqual({ width: 200, height: 400 });
  });

  it("keeps dimensions unchanged for 0 and 180 degrees", () => {
    expect(computeRotatedDimensions(original, 0)).toEqual(original);
    expect(computeRotatedDimensions(original, 180)).toEqual(original);
  });

  it("normalizes an out-of-range or negative degree value", () => {
    expect(computeRotatedDimensions(original, -90)).toEqual({ width: 200, height: 400 });
    expect(computeRotatedDimensions(original, 450)).toEqual({ width: 200, height: 400 });
  });
});

describe("format helpers", () => {
  it("maps every raster format to a mime type and extension", () => {
    expect(MIME_BY_FORMAT.png).toBe("image/png");
    expect(MIME_BY_FORMAT.jpg).toBe("image/jpeg");
    expect(MIME_BY_FORMAT.webp).toBe("image/webp");
    expect(EXTENSION_BY_FORMAT.jpg).toBe("jpg");
  });

  it("knows JPEG has no transparency support, unlike PNG/WebP", () => {
    expect(formatSupportsTransparency("jpg")).toBe(false);
    expect(formatSupportsTransparency("png")).toBe(true);
    expect(formatSupportsTransparency("webp")).toBe(true);
  });

  it("knows only jpg/webp are lossy (quality is meaningful)", () => {
    expect(formatIsLossy("jpg")).toBe(true);
    expect(formatIsLossy("webp")).toBe(true);
    expect(formatIsLossy("png")).toBe(false);
  });
});

export type RasterFormat = "png" | "jpg" | "webp";

export type FlipAxis = "horizontal" | "vertical";

export interface ImageProcessOptions {
  outputFormat: RasterFormat;
  /** 0–1. Only consulted for jpg/webp — PNG is lossless and ignores this. */
  quality?: number;
  /** Pixel-space rectangle in the *source* image's own coordinates, applied
   * before rotate/flip/resize. */
  crop?: { x: number; y: number; width: number; height: number };
  resize?: { width: number; height: number };
  rotateDegrees?: 0 | 90 | 180 | 270;
  flip?: FlipAxis;
  /** -100..100, 0 = no change. Composed into a single CSS filter string with
   * contrast/grayscale — confirmed empirically that OffscreenCanvas's 2D
   * context `filter` works inside a real Worker in this project's target
   * Chromium before relying on it here. */
  brightness?: number;
  /** -100..100, 0 = no change. */
  contrast?: number;
  grayscale?: boolean;
  /** Filled in before drawing when converting a possibly-transparent source
   * (png/webp) to an opaque format (jpg) — otherwise transparent pixels
   * composite against canvas's default transparent black. */
  backgroundColor?: string;
}

export interface ImageDimensions {
  width: number;
  height: number;
}

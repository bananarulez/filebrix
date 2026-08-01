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
  /** Text drawn over the finished image. See `WatermarkOptions`. */
  watermark?: WatermarkOptions;
}

export type WatermarkPosition =
  | "top-left"
  | "top-right"
  | "center"
  | "bottom-left"
  | "bottom-right";

/**
 * A text watermark, drawn as the last pass before encoding.
 *
 * Deliberately text-only for now: an *image* watermark would mean decoding a
 * second source in the worker and a second file input in the UI, which is a
 * materially bigger feature than the one this replaced a placeholder for.
 *
 * `fontScale` is a fraction of the image's smaller side rather than an
 * absolute pixel size, so the same settings look the same on a 400px thumbnail
 * and a 6000px photo — an absolute size would be invisible on one and
 * enormous on the other, and this pipeline is batch-first.
 */
export interface WatermarkOptions {
  text: string;
  position: WatermarkPosition;
  /** 0–1. */
  opacity: number;
  /** Fraction of the image's smaller side, e.g. 0.06 ≈ 6%. */
  fontScale: number;
  color: string;
}

export interface ImageDimensions {
  width: number;
  height: number;
}

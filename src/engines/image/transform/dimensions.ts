import type { ImageDimensions } from "../types";

/**
 * Resolves a target size for a resize operation. When `lockAspectRatio` is
 * true and only one of width/height is given, the other is derived from the
 * original's aspect ratio; when both are given with the lock on, height is
 * still derived from width (width wins) so the result can't be stretched.
 */
export function computeResizeDimensions(
  original: ImageDimensions,
  target: { width?: number; height?: number; lockAspectRatio: boolean }
): ImageDimensions {
  const width = target.width && target.width > 0 ? Math.round(target.width) : undefined;
  const height = target.height && target.height > 0 ? Math.round(target.height) : undefined;

  if (!target.lockAspectRatio && width && height) {
    return { width, height };
  }

  const aspectRatio = original.width / original.height;

  if (width && !height) {
    return { width, height: Math.max(1, Math.round(width / aspectRatio)) };
  }
  if (height && !width) {
    return { width: Math.max(1, Math.round(height * aspectRatio)), height };
  }
  if (width && height) {
    // Both given but locked: width wins, height is derived to preserve ratio.
    return { width, height: Math.max(1, Math.round(width / aspectRatio)) };
  }
  return original;
}

/** 90°/270° rotation swaps the visual width/height; 0°/180° don't. */
export function computeRotatedDimensions(original: ImageDimensions, degrees: number): ImageDimensions {
  const normalized = ((degrees % 360) + 360) % 360;
  return normalized === 90 || normalized === 270
    ? { width: original.height, height: original.width }
    : { ...original };
}

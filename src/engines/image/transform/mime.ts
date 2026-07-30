import type { RasterFormat } from "../types";

export const MIME_BY_FORMAT: Record<RasterFormat, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
};

export const EXTENSION_BY_FORMAT: Record<RasterFormat, string> = {
  png: "png",
  jpg: "jpg",
  webp: "webp",
};

/** JPEG has no alpha channel; PNG/WebP do. */
export function formatSupportsTransparency(format: RasterFormat): boolean {
  return format !== "jpg";
}

/** `toBlob`/`convertToBlob`'s `quality` argument is only consulted for
 * lossy formats — passing it for PNG is silently ignored by the browser,
 * which is exactly why the Compress Image tool special-cases PNG instead
 * of showing a slider that would visibly do nothing. */
export function formatIsLossy(format: RasterFormat): boolean {
  return format === "jpg" || format === "webp";
}

import { IMAGE_FORMAT_LABEL, type ImageWorkspaceFormat } from "./ImageWorkspace";

/**
 * Which source formats each Image Studio action can actually run on.
 *
 * This used to be expressed implicitly, one drop zone at a time, by each
 * tool's own `accept` attribute — which stops working the moment there's one
 * shared drop zone feeding every action. Making it explicit is what lets the
 * Studio disable "WebP to JPG" for a loaded PNG (with a reason the user can
 * read) instead of mounting a tool that can't run.
 *
 * A `null` entry means "needs no file at all" — only the Watermark
 * placeholder, which is never gated. Same shape and rules as the Geospatial
 * Studio's `actionFormats.ts`.
 */
export type ActionFormats = readonly ImageWorkspaceFormat[] | null;

/** Every pixel-level operation goes through `createImageBitmap`, which this project's target browsers can't hand an SVG (see CLAUDE.md). */
const RASTER: readonly ImageWorkspaceFormat[] = ["png", "jpg", "webp"];

const MIME_BY_FORMAT: Record<ImageWorkspaceFormat, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
  svg: "image/svg+xml",
};

export const ACTION_FORMATS: Record<string, ActionFormats> = {
  // --- Edit -----------------------------------------------------------------
  crop: RASTER,
  resize: RASTER,
  compress: RASTER,
  rotate: RASTER,
  flip: RASTER,
  brightness: RASTER,
  contrast: RASTER,
  grayscale: RASTER,
  // Was `null` (needs no file) while Watermark was a placeholder; it is a
  // real raster operation now, so it takes a file and is gated like the rest.
  watermark: RASTER,

  // --- Convert --------------------------------------------------------------
  "png-to-jpg": ["png"],
  "jpg-to-png": ["jpg"],
  "webp-to-jpg": ["webp"],
  "jpg-to-webp": ["jpg"],
  "png-to-webp": ["png"],
  "webp-to-png": ["webp"],
  "svg-to-png": ["svg"],

  // --- Metadata -------------------------------------------------------------
  view: RASTER,
  remove: RASTER,
};

/** Actions that operate on exactly one image; everything else is a batch. */
const SINGLE_FILE_ACTIONS = new Set<string>(["crop", "view"]);

function listFormats(formats: readonly ImageWorkspaceFormat[]): string {
  const labels = formats.map((format) => IMAGE_FORMAT_LABEL[format]);
  if (labels.length === 1) return labels[0];
  return `${labels.slice(0, -1).join(", ")} or ${labels[labels.length - 1]}`;
}

/**
 * Builds the `disabledReasons` map an `ActionPicker` needs for the currently
 * loaded images. Returns an empty object when nothing is loaded, so the user
 * can pick what they want *before* dropping anything.
 */
export function buildDisabledReasons<T extends string>(
  actions: readonly T[],
  format: ImageWorkspaceFormat | null
): Partial<Record<T, string>> {
  if (!format) return {};

  const reasons: Partial<Record<T, string>> = {};
  for (const action of actions) {
    const accepted = ACTION_FORMATS[action];
    if (accepted === null || accepted === undefined) continue; // needs no file / unknown action
    if (accepted.includes(format)) continue;
    reasons[action] = `Not available for a ${IMAGE_FORMAT_LABEL[format]} image — this action needs ${listFormats(
      accepted
    )}.`;
  }
  return reasons;
}

/**
 * Whether an action works on a loaded file at all. Every current action does
 * — the entry is kept because the Studio's drop zone genuinely depends on the
 * answer, and Data and Geospatial Studio both have paste-first actions that
 * return `false` here. An unknown action is assumed to need a file, the safe
 * default: showing the drop zone is never wrong, hiding it for something that
 * does need one would strand the user.
 */
export function actionNeedsFile(action: string): boolean {
  return ACTION_FORMATS[action] !== null;
}

export function actionAcceptsMultiple(action: string): boolean {
  return !SINGLE_FILE_ACTIONS.has(action);
}

/** The file picker's `accept` filter for an action — the MIME types it can actually read. */
export function acceptFor(action: string): string | undefined {
  const accepted = ACTION_FORMATS[action];
  if (!accepted) return undefined;
  return accepted.map((format) => MIME_BY_FORMAT[format]).join(",");
}

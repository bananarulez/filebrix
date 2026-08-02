import type { GeoWorkspaceFormat } from "./GeoWorkspace";

/**
 * Which source formats each Geospatial Studio action can actually run on.
 *
 * Most Edit/Analyze actions accept all three geometry formats because
 * `parseAnyGeoFile` normalizes KML and GPX to GeoJSON before any engine op
 * sees them — the genuine restrictions are the format *converters* (a
 * KML-to-GeoJSON action needs real KML) and the two viewers, whose UIs are
 * built around a specific format's shape.
 *
 * A `null` entry means "needs no file at all" (the coordinate converter),
 * which is never gated.
 */
export type ActionFormats = readonly GeoWorkspaceFormat[] | null;

/**
 * Every format that reaches an engine op as GeoJSON. Shapefile and TopoJSON
 * join KML and GPX here because `parseAnyGeoFile` normalizes all four before
 * any op sees them — the gating is about what the *file* is, not about what
 * the op can read.
 */
const ALL_GEOMETRY: readonly GeoWorkspaceFormat[] = ["geojson", "topojson", "kml", "kmz", "gpx", "shapefile"];

export const ACTION_FORMATS: Record<string, ActionFormats> = {
  // --- View ---------------------------------------------------------------
  geojson: ["geojson", "topojson", "kml", "kmz", "shapefile"],
  gpx: ["gpx"],

  // --- Edit ---------------------------------------------------------------
  simplify: ALL_GEOMETRY,
  repair: ALL_GEOMETRY,
  buffer: ALL_GEOMETRY,
  dissolve: ALL_GEOMETRY,
  merge: ALL_GEOMETRY,
  "split-multi": ALL_GEOMETRY,

  // --- Analyze ------------------------------------------------------------
  summary: ALL_GEOMETRY,
  statistics: ALL_GEOMETRY,
  centroid: ALL_GEOMETRY,
  "bounding-box": ALL_GEOMETRY,
  "convex-hull": ALL_GEOMETRY,

  // --- Convert ------------------------------------------------------------
  "kml-to-geojson": ["kml", "kmz"],
  "geojson-to-kml": ["geojson"],
  "shapefile-to-geojson": ["shapefile"],
  "topojson-to-geojson": ["topojson"],
  "gpx-to-geojson": ["gpx"],
  "gpx-to-kml": ["gpx"],
  "geojson-to-csv": ["geojson"],
  "csv-to-geojson": ["csv"],
  "crs-converter": ALL_GEOMETRY,
  "coordinate-converter": null,
  "utm-zone-finder": null,
  "map-tile-calculator": null,
};

const FORMAT_LABEL: Record<GeoWorkspaceFormat, string> = {
  geojson: "GeoJSON",
  topojson: "TopoJSON",
  kml: "KML",
  kmz: "KMZ",
  gpx: "GPX",
  shapefile: "Shapefile",
  csv: "CSV",
};

function listFormats(formats: readonly GeoWorkspaceFormat[]): string {
  const labels = formats.map((format) => FORMAT_LABEL[format]);
  if (labels.length === 1) return labels[0];
  return `${labels.slice(0, -1).join(", ")} or ${labels[labels.length - 1]}`;
}

/**
 * Builds the `disabledReasons` map an `ActionPicker` needs for the currently
 * loaded file. Returns an empty object when no file is loaded — with nothing
 * to gate against, every action stays selectable so the user can choose what
 * they want *before* dropping a file.
 */
export function buildDisabledReasons<T extends string>(
  actions: readonly T[],
  sourceFormat: GeoWorkspaceFormat | null
): Partial<Record<T, string>> {
  if (!sourceFormat) return {};

  const reasons: Partial<Record<T, string>> = {};
  for (const action of actions) {
    const accepted = ACTION_FORMATS[action];
    if (accepted === null || accepted === undefined) continue; // needs no file / unknown action
    if (accepted.includes(sourceFormat)) continue;
    reasons[action] = `Not available for a ${FORMAT_LABEL[sourceFormat]} file — this action needs ${listFormats(
      accepted
    )}.`;
  }
  return reasons;
}

/**
 * Whether an action works on a loaded file at all. Only the coordinate
 * converter doesn't (it transforms pasted text), and the Studio uses this to
 * decide whether to render its drop zone — the same call Data Studio makes
 * for its paste-first actions. An unknown action is assumed to need a file,
 * which is the safe default: showing the drop zone is never wrong, hiding it
 * for something that does need one would strand the user.
 */
export function actionNeedsFile(action: string): boolean {
  return ACTION_FORMATS[action] !== null;
}

/** The first action in `actions` that the loaded format supports, or null. */
export function firstEnabledAction<T extends string>(
  actions: readonly T[],
  sourceFormat: GeoWorkspaceFormat | null
): T | null {
  const reasons = buildDisabledReasons(actions, sourceFormat);
  return actions.find((action) => !reasons[action]) ?? null;
}

import distance from "@turf/distance";
import { ProcessingError } from "@/lib/errors/ProcessingError";
import { asRecord, extractFeatureList, isPosition, type GeoJsonRecord } from "../ops/shape";
import { escapeXmlText, parseXmlOrThrow } from "./parseXml";
import type { ElevationProfilePoint, GpxTrackStats } from "../types";

type TogeojsonModule = typeof import("@tmcw/togeojson");
let togeojsonModulePromise: Promise<TogeojsonModule> | null = null;

async function getTogeojson(): Promise<TogeojsonModule> {
  if (!togeojsonModulePromise) togeojsonModulePromise = import("@tmcw/togeojson");
  return togeojsonModulePromise;
}

export async function gpxTextToGeoJson(text: string): Promise<unknown> {
  const doc = parseXmlOrThrow(text, "GPX");
  const rootTag = doc.documentElement?.localName?.toLowerCase();
  if (rootTag !== "gpx") {
    throw new ProcessingError(
      "MALFORMED_FILE",
      "This doesn't look like a GPX file — its root element isn't <gpx>."
    );
  }
  const togeojson = await getTogeojson();
  try {
    return togeojson.gpx(doc);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    throw new ProcessingError("MALFORMED_FILE", `Could not read this GPX file: ${message}`);
  }
}

/** All LineString/MultiLineString vertices across every track/route feature, in file order — `@tmcw/togeojson` puts a GPX `<trkpt>`'s `<ele>` in the position's 3rd coordinate. */
function collectTrackPositions(root: GeoJsonRecord): number[][] {
  const extracted = extractFeatureList(root);
  if (!extracted) return [];
  const positions: number[][] = [];
  for (const feature of extracted.features) {
    const featureRecord = asRecord(feature);
    const geometry = featureRecord ? asRecord(featureRecord.geometry) : null;
    if (!geometry) continue;
    if (geometry.type === "LineString" && Array.isArray(geometry.coordinates)) {
      positions.push(...(geometry.coordinates as unknown[]).filter(isPosition));
    } else if (geometry.type === "MultiLineString" && Array.isArray(geometry.coordinates)) {
      for (const line of geometry.coordinates as unknown[]) {
        if (Array.isArray(line)) positions.push(...line.filter(isPosition));
      }
    }
  }
  return positions;
}

/** Computed straight from GPX track points — no map/network round trip. */
export function computeGpxTrackStats(root: unknown): GpxTrackStats {
  const record = asRecord(root);
  const positions = record ? collectTrackPositions(record) : [];

  let distanceMeters = 0;
  for (let i = 1; i < positions.length; i += 1) {
    distanceMeters += distance(
      [positions[i - 1][0], positions[i - 1][1]],
      [positions[i][0], positions[i][1]],
      { units: "meters" }
    );
  }

  const elevations = positions.map((position) => position[2]).filter((value): value is number => typeof value === "number");
  const hasElevation = elevations.length > 0;

  let elevationGainMeters: number | null = null;
  let elevationLossMeters: number | null = null;
  if (hasElevation) {
    let gain = 0;
    let loss = 0;
    for (let i = 1; i < positions.length; i += 1) {
      const prev = positions[i - 1][2];
      const curr = positions[i][2];
      if (typeof prev !== "number" || typeof curr !== "number") continue;
      const delta = curr - prev;
      if (delta > 0) gain += delta;
      else loss += -delta;
    }
    elevationGainMeters = gain;
    elevationLossMeters = loss;
  }

  return {
    distanceMeters,
    elevationGainMeters,
    elevationLossMeters,
    minElevationMeters: hasElevation ? Math.min(...elevations) : null,
    maxElevationMeters: hasElevation ? Math.max(...elevations) : null,
    pointCount: positions.length,
    hasElevation,
  };
}

/** Cumulative-distance/elevation series for the elevation profile chart. Returns an empty array when the track has no elevation data. */
export function buildElevationProfile(root: unknown): ElevationProfilePoint[] {
  const record = asRecord(root);
  const positions = record ? collectTrackPositions(record) : [];
  if (positions.length === 0 || typeof positions[0][2] !== "number") return [];

  const profile: ElevationProfilePoint[] = [];
  let cumulativeMeters = 0;
  positions.forEach((position, index) => {
    if (index > 0) {
      cumulativeMeters += distance(
        [positions[index - 1][0], positions[index - 1][1]],
        [position[0], position[1]],
        { units: "meters" }
      );
    }
    if (typeof position[2] === "number") {
      profile.push({ distanceMeters: cumulativeMeters, elevationMeters: position[2] });
    }
  });
  return profile;
}

function formatTrkpt(position: number[]): string {
  const [lon, lat, elevation] = position;
  const eleTag = typeof elevation === "number" ? `<ele>${elevation}</ele>` : "";
  return `<trkpt lat="${lat}" lon="${lon}">${eleTag}</trkpt>`;
}

/** Point features become `<wpt>` waypoints; LineString/MultiLineString features become `<trk>` tracks. Polygons have no GPX equivalent and are skipped, with the caller expected to warn the user. */
export function geoJsonToGpxText(root: unknown): { gpxText: string; skippedFeatureCount: number } {
  const record = asRecord(root);
  if (!record) {
    throw new ProcessingError("MALFORMED_FILE", "This file's contents aren't a GeoJSON object.");
  }
  const extracted = extractFeatureList(record);
  if (!extracted) {
    const type = typeof record.type === "string" ? record.type : "(missing)";
    throw new ProcessingError("MALFORMED_FILE", `Unrecognized GeoJSON "type": ${type}.`);
  }

  const waypoints: string[] = [];
  const tracks: string[] = [];
  let skippedFeatureCount = 0;

  for (const feature of extracted.features) {
    const featureRecord = asRecord(feature);
    const geometry = featureRecord ? asRecord(featureRecord.geometry) : null;
    const properties = featureRecord ? asRecord(featureRecord.properties) : null;
    const name = properties && typeof properties.name === "string" ? escapeXmlText(properties.name) : undefined;

    if (!geometry) {
      continue;
    } else if (geometry.type === "Point" && isPosition(geometry.coordinates)) {
      const [lon, lat, elevation] = geometry.coordinates as number[];
      const eleTag = typeof elevation === "number" ? `<ele>${elevation}</ele>` : "";
      const nameTag = name ? `<name>${name}</name>` : "";
      waypoints.push(`<wpt lat="${lat}" lon="${lon}">${eleTag}${nameTag}</wpt>`);
    } else if (geometry.type === "LineString" && Array.isArray(geometry.coordinates)) {
      const points = (geometry.coordinates as unknown[]).filter(isPosition) as number[][];
      const nameTag = name ? `<name>${name}</name>` : "";
      tracks.push(`<trk>${nameTag}<trkseg>${points.map(formatTrkpt).join("")}</trkseg></trk>`);
    } else if (geometry.type === "MultiLineString" && Array.isArray(geometry.coordinates)) {
      const segments = (geometry.coordinates as unknown[])
        .map((line) => (Array.isArray(line) ? (line.filter(isPosition) as number[][]) : []))
        .filter((points) => points.length > 0)
        .map((points) => `<trkseg>${points.map(formatTrkpt).join("")}</trkseg>`)
        .join("");
      const nameTag = name ? `<name>${name}</name>` : "";
      tracks.push(`<trk>${nameTag}${segments}</trk>`);
    } else {
      skippedFeatureCount += 1;
    }
  }

  const gpxText =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<gpx version="1.1" creator="FileBrix" xmlns="http://www.topografix.com/GPX/1/1">` +
    `${waypoints.join("")}${tracks.join("")}</gpx>`;

  return { gpxText, skippedFeatureCount };
}

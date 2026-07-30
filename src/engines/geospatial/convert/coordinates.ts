// Statically imported here (not at a page/component top level) — this
// whole module is dynamically imported by CoordinateConverterTool on first
// use, same lazy-load boundary as every other engine module. `utm` is a
// tiny, zero-dependency package, but the pattern stays consistent with the
// rest of the codebase regardless of library size.
import * as utm from "utm";

export type CoordinateFormat = "dd" | "dms" | "ddm" | "utm";

export interface ParsedCoordinate {
  lat: number;
  lon: number;
}

export interface CoordinateLineResult {
  input: string;
  output: string | null;
  error: string | null;
}

const DD_PATTERN =
  /^\s*(-?\d+(?:\.\d+)?)\s*°?\s*([NSns])?\s*[,\s]\s*(-?\d+(?:\.\d+)?)\s*°?\s*([EWew])?\s*$/;

const DMS_PATTERN =
  /^\s*(\d+(?:\.\d+)?)\s*°\s*(\d+(?:\.\d+)?)\s*['’]\s*(\d+(?:\.\d+)?)\s*["”]\s*([NSns])\s*[,\s]?\s*(\d+(?:\.\d+)?)\s*°\s*(\d+(?:\.\d+)?)\s*['’]\s*(\d+(?:\.\d+)?)\s*["”]\s*([EWew])\s*$/;

const DDM_PATTERN =
  /^\s*(\d+(?:\.\d+)?)\s*°\s*(\d+(?:\.\d+)?)\s*['’]\s*([NSns])\s*[,\s]?\s*(\d+(?:\.\d+)?)\s*°\s*(\d+(?:\.\d+)?)\s*['’]\s*([EWew])\s*$/;

const UTM_PATTERN = /^\s*(\d{1,2})\s*([C-HJ-NP-X])\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s*$/i;

function hemisphereSign(hemisphere: string | undefined, negativeFor: "S" | "W"): 1 | -1 {
  if (!hemisphere) return 1;
  return hemisphere.toUpperCase() === negativeFor ? -1 : 1;
}

function isValidLatLon(lat: number, lon: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

function parseDd(line: string): ParsedCoordinate | null {
  const match = DD_PATTERN.exec(line);
  if (!match) return null;
  const [, latRaw, latHem, lonRaw, lonHem] = match;
  const lat = parseFloat(latRaw) * hemisphereSign(latHem, "S");
  const lon = parseFloat(lonRaw) * hemisphereSign(lonHem, "W");
  return isValidLatLon(lat, lon) ? { lat, lon } : null;
}

function parseDms(line: string): ParsedCoordinate | null {
  const match = DMS_PATTERN.exec(line);
  if (!match) return null;
  const [, latD, latM, latS, latHem, lonD, lonM, lonS, lonHem] = match;
  const lat =
    (parseFloat(latD) + parseFloat(latM) / 60 + parseFloat(latS) / 3600) * hemisphereSign(latHem, "S");
  const lon =
    (parseFloat(lonD) + parseFloat(lonM) / 60 + parseFloat(lonS) / 3600) * hemisphereSign(lonHem, "W");
  return isValidLatLon(lat, lon) ? { lat, lon } : null;
}

function parseDdm(line: string): ParsedCoordinate | null {
  const match = DDM_PATTERN.exec(line);
  if (!match) return null;
  const [, latD, latM, latHem, lonD, lonM, lonHem] = match;
  const lat = (parseFloat(latD) + parseFloat(latM) / 60) * hemisphereSign(latHem, "S");
  const lon = (parseFloat(lonD) + parseFloat(lonM) / 60) * hemisphereSign(lonHem, "W");
  return isValidLatLon(lat, lon) ? { lat, lon } : null;
}

function parseUtm(line: string): ParsedCoordinate | null {
  const match = UTM_PATTERN.exec(line);
  if (!match) return null;
  const [, zoneNum, zoneLetter, easting, northing] = match;
  try {
    const result = utm.toLatLon(
      parseFloat(easting),
      parseFloat(northing),
      parseInt(zoneNum, 10),
      zoneLetter.toUpperCase()
    );
    return isValidLatLon(result.latitude, result.longitude)
      ? { lat: result.latitude, lon: result.longitude }
      : null;
  } catch {
    return null;
  }
}

/** Tries every supported format in turn (most visually distinctive pattern first) and returns the first match, or null if the line matches none of them. */
export function parseCoordinateLine(line: string): ParsedCoordinate | null {
  if (!line.trim()) return null;
  return parseUtm(line) ?? parseDms(line) ?? parseDdm(line) ?? parseDd(line);
}

export function formatDd(coord: ParsedCoordinate): string {
  return `${coord.lat.toFixed(6)}, ${coord.lon.toFixed(6)}`;
}

function toDegMinSec(value: number): { degrees: number; minutes: number; seconds: number } {
  const abs = Math.abs(value);
  const degrees = Math.floor(abs);
  const minutesFloat = (abs - degrees) * 60;
  const minutes = Math.floor(minutesFloat);
  const seconds = (minutesFloat - minutes) * 60;
  return { degrees, minutes, seconds };
}

export function formatDms(coord: ParsedCoordinate): string {
  const lat = toDegMinSec(coord.lat);
  const lon = toDegMinSec(coord.lon);
  const latHem = coord.lat >= 0 ? "N" : "S";
  const lonHem = coord.lon >= 0 ? "E" : "W";
  return `${lat.degrees}°${lat.minutes}'${lat.seconds.toFixed(2)}"${latHem} ${lon.degrees}°${lon.minutes}'${lon.seconds.toFixed(2)}"${lonHem}`;
}

export function formatDdm(coord: ParsedCoordinate): string {
  const absLat = Math.abs(coord.lat);
  const absLon = Math.abs(coord.lon);
  const latDeg = Math.floor(absLat);
  const latMin = (absLat - latDeg) * 60;
  const lonDeg = Math.floor(absLon);
  const lonMin = (absLon - lonDeg) * 60;
  const latHem = coord.lat >= 0 ? "N" : "S";
  const lonHem = coord.lon >= 0 ? "E" : "W";
  return `${latDeg}°${latMin.toFixed(3)}'${latHem} ${lonDeg}°${lonMin.toFixed(3)}'${lonHem}`;
}

export function formatUtm(coord: ParsedCoordinate): string {
  const result = utm.fromLatLon(coord.lat, coord.lon);
  return `${result.zoneNum}${result.zoneLetter} ${Math.round(result.easting)} ${Math.round(result.northing)}`;
}

export function formatCoordinate(coord: ParsedCoordinate, format: CoordinateFormat): string {
  switch (format) {
    case "dd":
      return formatDd(coord);
    case "dms":
      return formatDms(coord);
    case "ddm":
      return formatDdm(coord);
    case "utm":
      return formatUtm(coord);
  }
}

/** Converts every non-blank line independently, so one bad line doesn't block the rest. */
export function convertCoordinateLines(text: string, outputFormat: CoordinateFormat): CoordinateLineResult[] {
  return text
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const parsed = parseCoordinateLine(line);
      if (!parsed) {
        return { input: line, output: null, error: "Could not recognize this as a coordinate." };
      }
      try {
        return { input: line, output: formatCoordinate(parsed, outputFormat), error: null };
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : "Could not convert this coordinate.";
        return { input: line, output: null, error: message };
      }
    });
}

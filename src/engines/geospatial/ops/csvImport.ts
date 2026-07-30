import { ProcessingError } from "@/lib/errors/ProcessingError";
import type { CellValue, CsvColumnGuess, CsvToGeoJsonOutcome, NormalizedTable } from "../types";

const LAT_NAMES = new Set(["lat", "latitude", "y"]);
const LON_NAMES = new Set(["lon", "lng", "long", "longitude", "x"]);

/** Best-effort header match — always overridable by the user, never trusted blindly. */
export function detectLatLonColumns(columns: string[]): CsvColumnGuess {
  let latColumn: string | null = null;
  let lonColumn: string | null = null;
  for (const column of columns) {
    const normalized = column.trim().toLowerCase();
    if (!latColumn && LAT_NAMES.has(normalized)) latColumn = column;
    if (!lonColumn && LON_NAMES.has(normalized)) lonColumn = column;
  }
  return { latColumn, lonColumn };
}

function toNumber(value: CellValue): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function toPropertyValue(value: CellValue): unknown {
  if (value instanceof Date) return value.toISOString();
  return value;
}

export function csvTableToGeoJson(table: NormalizedTable, latColumn: string, lonColumn: string): CsvToGeoJsonOutcome {
  const latIndex = table.columns.indexOf(latColumn);
  const lonIndex = table.columns.indexOf(lonColumn);
  if (latIndex === -1 || lonIndex === -1) {
    throw new ProcessingError("MALFORMED_FILE", "The selected latitude/longitude columns weren't found in this CSV.");
  }

  const propertyColumns = table.columns
    .map((name, index) => ({ name, index }))
    .filter(({ index }) => index !== latIndex && index !== lonIndex);

  const features: unknown[] = [];
  let skippedCount = 0;

  table.rows.forEach((row) => {
    const lat = toNumber(row[latIndex]);
    const lon = toNumber(row[lonIndex]);
    if (lat === null || lon === null || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      skippedCount += 1;
      return;
    }
    const properties: Record<string, unknown> = {};
    for (const { name, index } of propertyColumns) {
      properties[name] = toPropertyValue(row[index]);
    }
    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [lon, lat] },
      properties,
    });
  });

  const warnings: string[] = [];
  if (skippedCount > 0) {
    warnings.push(
      `${skippedCount} row(s) were skipped — missing, non-numeric, or out-of-range latitude/longitude values.`
    );
  }
  if (features.length === 0) {
    warnings.push("No rows produced a valid point — double-check the selected latitude/longitude columns.");
  }

  return { geojson: { type: "FeatureCollection", features }, warnings };
}

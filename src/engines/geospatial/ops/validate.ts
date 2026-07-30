import { ProcessingError } from "@/lib/errors/ProcessingError";
import { asRecord, extractFeatureList, isPosition, SIMPLE_GEOMETRY_TYPES, type GeoJsonRecord } from "./shape";
import type { RepairOutcome, ValidationIssue, ValidationResult } from "../types";

const MAX_ISSUES = 200;

const RANGE_WARNING_LIMIT = 20;

class IssueCollector {
  readonly issues: ValidationIssue[] = [];
  private truncated = false;
  private rangeWarningCount = 0;

  add(issue: ValidationIssue): void {
    if (this.issues.length >= MAX_ISSUES) {
      this.truncated = true;
      return;
    }
    this.issues.push(issue);
  }

  addRangeWarning(issue: ValidationIssue): void {
    if (this.rangeWarningCount >= RANGE_WARNING_LIMIT) return;
    this.rangeWarningCount += 1;
    this.add(issue);
  }

  finish(): ValidationIssue[] {
    if (this.truncated) {
      this.issues.push({
        severity: "warning",
        message: `Stopped listing issues after ${MAX_ISSUES} — this dataset has more structural problems than shown here.`,
        autoFixable: false,
      });
    }
    return this.issues;
  }
}

/** Structural validation only — never modifies the input. Use `repairGeoJson` to apply the auto-fixable subset of what's found here. */
export function validateGeoJson(root: unknown): ValidationResult {
  const record = asRecord(root);
  const collector = new IssueCollector();

  if (!record) {
    collector.add({ severity: "error", message: "This isn't a JSON object.", autoFixable: false });
    return finalize(collector);
  }

  const extracted = extractFeatureList(record);
  if (!extracted) {
    const type = typeof record.type === "string" ? record.type : "(missing)";
    collector.add({
      severity: "error",
      message: `Unrecognized or unsupported GeoJSON "type": ${type}.`,
      autoFixable: false,
    });
    return finalize(collector);
  }

  if (extracted.isFeatureCollection && !Array.isArray(record.features)) {
    collector.add({
      severity: "error",
      message: 'A FeatureCollection\'s "features" member must be an array.',
      autoFixable: false,
    });
    return finalize(collector);
  }

  extracted.features.forEach((feature, index) => {
    const featureIndex = extracted.isFeatureCollection ? index : undefined;
    validateFeature(feature, extracted.isBareGeometry, featureIndex, collector);
  });

  return finalize(collector);
}

function finalize(collector: IssueCollector): ValidationResult {
  const issues = collector.finish();
  return {
    valid: !issues.some((issue) => issue.severity === "error"),
    issues,
    canRepair: issues.some((issue) => issue.autoFixable),
  };
}

function validateFeature(
  feature: unknown,
  isBareGeometry: boolean,
  featureIndex: number | undefined,
  collector: IssueCollector
): void {
  const record = asRecord(feature);
  if (!record) {
    collector.add({ severity: "error", message: describe(featureIndex, "is not an object."), autoFixable: false });
    return;
  }

  if (!isBareGeometry) {
    if (record.type !== "Feature") {
      collector.add({
        severity: "error",
        message: describe(featureIndex, `has "type": ${JSON.stringify(record.type)} instead of "Feature".`),
        featureIndex,
        autoFixable: false,
      });
    }

    if (!("properties" in record)) {
      collector.add({
        severity: "warning",
        message: describe(featureIndex, 'is missing a "properties" member.'),
        featureIndex,
        autoFixable: true,
      });
    } else if (record.properties !== null && asRecord(record.properties) === null) {
      collector.add({
        severity: "error",
        message: describe(featureIndex, '"properties" must be an object or null.'),
        featureIndex,
        autoFixable: false,
      });
    }

    if (!("geometry" in record)) {
      collector.add({
        severity: "error",
        message: describe(featureIndex, 'is missing a "geometry" member.'),
        featureIndex,
        autoFixable: false,
      });
      return;
    }
  }

  if (record.geometry === null) return; // Null geometry is valid GeoJSON.
  const geometry = asRecord(record.geometry);
  if (!geometry) {
    collector.add({
      severity: "error",
      message: describe(featureIndex, '"geometry" must be an object or null.'),
      featureIndex,
      autoFixable: false,
    });
    return;
  }

  validateGeometry(geometry, featureIndex, collector, false);
}

function validateGeometry(
  geometry: GeoJsonRecord,
  featureIndex: number | undefined,
  collector: IssueCollector,
  insideCollection: boolean
): void {
  const type = geometry.type;

  if (type === "GeometryCollection") {
    if (insideCollection) {
      collector.add({
        severity: "error",
        message: describe(featureIndex, "has a nested GeometryCollection, which isn't supported."),
        featureIndex,
        autoFixable: false,
      });
      return;
    }
    if (!Array.isArray(geometry.geometries)) {
      collector.add({
        severity: "error",
        message: describe(featureIndex, 'GeometryCollection is missing a "geometries" array.'),
        featureIndex,
        autoFixable: false,
      });
      return;
    }
    for (const child of geometry.geometries) {
      const childRecord = asRecord(child);
      if (!childRecord) {
        collector.add({
          severity: "error",
          message: describe(featureIndex, "contains a geometry that isn't an object."),
          featureIndex,
          autoFixable: false,
        });
        continue;
      }
      validateGeometry(childRecord, featureIndex, collector, true);
    }
    return;
  }

  if (typeof type !== "string" || !SIMPLE_GEOMETRY_TYPES.has(type)) {
    collector.add({
      severity: "error",
      message: describe(featureIndex, `has an unsupported geometry type: ${JSON.stringify(type)}.`),
      featureIndex,
      autoFixable: false,
    });
    return;
  }

  const coordinates = geometry.coordinates;
  switch (type) {
    case "Point":
      if (!isPosition(coordinates)) {
        collector.add(coordError(featureIndex, "Point coordinates must be a [lon, lat] position."));
      } else {
        checkRange(coordinates, featureIndex, collector);
      }
      break;
    case "MultiPoint":
    case "LineString": {
      if (!Array.isArray(coordinates) || !coordinates.every(isPosition)) {
        collector.add(coordError(featureIndex, `${type} coordinates must be an array of positions.`));
        break;
      }
      if (type === "LineString" && coordinates.length < 2) {
        collector.add(coordError(featureIndex, "LineString needs at least 2 positions."));
      }
      for (const position of coordinates) checkRange(position, featureIndex, collector);
      break;
    }
    case "MultiLineString":
    case "Polygon": {
      if (!Array.isArray(coordinates) || !coordinates.every((line: unknown) => Array.isArray(line))) {
        collector.add(coordError(featureIndex, `${type} coordinates must be an array of position arrays.`));
        break;
      }
      for (const line of coordinates as unknown[][]) {
        if (!line.every(isPosition)) {
          collector.add(coordError(featureIndex, `${type} contains a position array with invalid positions.`));
          continue;
        }
        for (const position of line) checkRange(position, featureIndex, collector);
        if (type === "Polygon") validateRing(line as number[][], featureIndex, collector);
      }
      break;
    }
    case "MultiPolygon": {
      if (!Array.isArray(coordinates)) {
        collector.add(coordError(featureIndex, "MultiPolygon coordinates must be an array of polygons."));
        break;
      }
      for (const polygon of coordinates as unknown[]) {
        if (!Array.isArray(polygon)) {
          collector.add(coordError(featureIndex, "MultiPolygon contains a polygon that isn't an array of rings."));
          continue;
        }
        for (const ring of polygon as unknown[]) {
          if (!Array.isArray(ring) || !ring.every(isPosition)) {
            collector.add(coordError(featureIndex, "MultiPolygon contains a ring with invalid positions."));
            continue;
          }
          for (const position of ring as number[][]) checkRange(position, featureIndex, collector);
          validateRing(ring as number[][], featureIndex, collector);
        }
      }
      break;
    }
  }
}

function validateRing(ring: number[][], featureIndex: number | undefined, collector: IssueCollector): void {
  if (ring.length < 4) {
    collector.add(coordError(featureIndex, "A polygon ring needs at least 4 positions (3 distinct plus the closing one)."));
    return;
  }
  if (!positionsEqual(ring[0], ring[ring.length - 1])) {
    collector.add({
      severity: "warning",
      message: describe(featureIndex, "has a polygon ring that isn't closed (first and last positions differ)."),
      featureIndex,
      autoFixable: true,
    });
  }
}

function checkRange(position: number[], featureIndex: number | undefined, collector: IssueCollector): void {
  const [lon, lat] = position;
  if (lon >= -180 && lon <= 180 && lat >= -90 && lat <= 90) return;
  collector.addRangeWarning({
    severity: "warning",
    message: describe(featureIndex, `has a coordinate out of range: [${lon}, ${lat}].`),
    featureIndex,
    autoFixable: false,
  });
}

function coordError(featureIndex: number | undefined, message: string): ValidationIssue {
  return { severity: "error", message: describe(featureIndex, message), featureIndex, autoFixable: false };
}

function describe(featureIndex: number | undefined, message: string): string {
  return featureIndex === undefined ? `The geometry ${message}` : `Feature ${featureIndex} ${message}`;
}

function positionsEqual(a: number[], b: number[]): boolean {
  return a[0] === b[0] && a[1] === b[1];
}

/** Applies only the safe, unambiguous fixes `validateGeoJson` flagged as `autoFixable` — never touches anything else. Operates on a deep clone; the input is never mutated. */
export function repairGeoJson(root: unknown): RepairOutcome {
  const record = asRecord(root);
  if (!record) {
    throw new ProcessingError("MALFORMED_FILE", "This file's contents aren't a GeoJSON object.");
  }
  const clone = structuredClone(record) as GeoJsonRecord;
  const extracted = extractFeatureList(clone);
  if (!extracted) {
    throw new ProcessingError("MALFORMED_FILE", "Unrecognized GeoJSON type — nothing to repair.");
  }

  let closedRingCount = 0;
  let addedPropertiesCount = 0;

  for (const feature of extracted.features) {
    const featureRecord = asRecord(feature);
    if (!featureRecord) continue;

    if (!extracted.isBareGeometry && !("properties" in featureRecord)) {
      featureRecord.properties = null;
      addedPropertiesCount += 1;
    }

    const geometry = asRecord(featureRecord.geometry);
    if (geometry) closedRingCount += closeUnclosedRings(geometry);
  }

  const changes: string[] = [];
  if (closedRingCount > 0) {
    changes.push(`Closed ${closedRingCount} unclosed polygon ring${closedRingCount === 1 ? "" : "s"}.`);
  }
  if (addedPropertiesCount > 0) {
    changes.push(
      `Added a missing "properties": null to ${addedPropertiesCount} feature${addedPropertiesCount === 1 ? "" : "s"}.`
    );
  }

  return { geojson: clone, changes };
}

function closeUnclosedRings(geometry: GeoJsonRecord): number {
  if (geometry.type === "Polygon" && Array.isArray(geometry.coordinates)) {
    return closeRingsIn(geometry.coordinates as unknown[]);
  }
  if (geometry.type === "MultiPolygon" && Array.isArray(geometry.coordinates)) {
    let fixed = 0;
    for (const polygon of geometry.coordinates as unknown[]) {
      if (Array.isArray(polygon)) fixed += closeRingsIn(polygon);
    }
    return fixed;
  }
  if (geometry.type === "GeometryCollection" && Array.isArray(geometry.geometries)) {
    let fixed = 0;
    for (const child of geometry.geometries as unknown[]) {
      const childRecord = asRecord(child);
      if (childRecord) fixed += closeUnclosedRings(childRecord);
    }
    return fixed;
  }
  return 0;
}

function closeRingsIn(rings: unknown[]): number {
  let fixed = 0;
  for (const ring of rings) {
    if (!Array.isArray(ring) || ring.length < 1) continue;
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (isPosition(first) && isPosition(last) && !positionsEqual(first as number[], last as number[])) {
      ring.push([...(first as number[])]);
      fixed += 1;
    }
  }
  return fixed;
}

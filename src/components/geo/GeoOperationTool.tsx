"use client";

import { useEffect, useState } from "react";
import { ErrorPanel } from "@/components/tools/ErrorPanel";
import { DownloadResult } from "@/components/tools/DownloadResult";
import { LazyGeoMap } from "@/components/geo/LazyGeoMap";
import { deriveOutputFilename } from "@/lib/format/deriveOutputFilename";
import { ProcessingError, type ProcessingErrorCode } from "@/lib/errors/ProcessingError";
import {
  bufferGeoJson,
  boundingBoxGeoJson,
  centroidGeoJson,
  convexHullGeoJson,
  dissolveGeoJson,
  listPropertyKeys,
  mergeGeoJson,
  splitMultiGeometry,
  type BufferUnit,
  type GeometryOpOutcome,
} from "@/engines/geospatial";
import { useGeoWorkspace } from "./GeoWorkspace";

/**
 * The seven "load a file, derive new geometry from it, download the result"
 * operations, as one parameterized component rather than seven near-identical
 * ones — the same shape `GeoConverterTool` (`kind`) and `StructuredTextTool`
 * (`action`) already use.
 *
 * They genuinely are the same flow: drop a file → optionally set one or two
 * options → run → preview on the map → download. Only Buffer (distance +
 * unit) and Dissolve (optional group-by attribute) contribute any controls at
 * all, so the alternative would have been five components with an empty
 * options slot and two with a small one.
 *
 * CRS transformation deliberately does *not* live here: it needs a source and
 * target picker with search and auto-detection, which is a different enough
 * interaction to warrant `CrsConverterTool`.
 */
export type GeoOperation =
  | "buffer"
  | "dissolve"
  | "merge"
  | "split-multi"
  | "centroid"
  | "bounding-box"
  | "convex-hull";

interface OperationSpec {
  /** Button + heading label. */
  label: string;
  /** One-line explanation shown above the controls. */
  description: string;
  /** Suffix for the downloaded file, e.g. `roads-buffer.geojson`. */
  outputSuffix: string;
  run: (geojson: unknown, options: OperationOptions) => Promise<GeometryOpOutcome>;
  needsDistance?: boolean;
  needsProperty?: boolean;
}

interface OperationOptions {
  distance: number;
  unit: BufferUnit;
  property: string;
}

const OPERATIONS: Record<GeoOperation, OperationSpec> = {
  buffer: {
    label: "Buffer",
    description:
      "Grow (or shrink) every feature by a fixed distance. Points and lines become polygons; a negative distance erodes polygons inward.",
    outputSuffix: "buffer",
    needsDistance: true,
    run: (geojson, options) => bufferGeoJson(geojson, options.distance, options.unit),
  },
  dissolve: {
    label: "Dissolve",
    description:
      "Merge touching or overlapping polygons into single shapes. Optionally group by an attribute so only polygons sharing a value combine.",
    outputSuffix: "dissolved",
    needsProperty: true,
    run: (geojson, options) => dissolveGeoJson(geojson, options.property || undefined),
  },
  merge: {
    label: "Merge Features",
    description:
      "Combine every feature into one. Polygons are geometrically unioned; mixed geometry types become a single GeometryCollection.",
    outputSuffix: "merged",
    run: (geojson) => mergeGeoJson(geojson),
  },
  "split-multi": {
    label: "Split Multi Geometry",
    description:
      "Explode multi-part geometries into one feature per part — MultiPolygon to Polygon, MultiLineString to LineString, MultiPoint to Point. Each part keeps its source attributes.",
    outputSuffix: "split",
    run: (geojson) => splitMultiGeometry(geojson),
  },
  centroid: {
    label: "Centroid",
    description: "Compute the centre point of every feature, keeping that feature's attributes on the point.",
    outputSuffix: "centroids",
    run: (geojson) => centroidGeoJson(geojson),
  },
  "bounding-box": {
    label: "Bounding Box",
    description: "Compute the rectangular extent covering the whole dataset.",
    outputSuffix: "bbox",
    run: (geojson) => boundingBoxGeoJson(geojson),
  },
  "convex-hull": {
    label: "Convex Hull",
    description: "Compute the smallest convex polygon enclosing every point in the dataset.",
    outputSuffix: "hull",
    run: (geojson) => convexHullGeoJson(geojson),
  },
};

const BUFFER_UNITS: { value: BufferUnit; label: string }[] = [
  { value: "meters", label: "Meters" },
  { value: "kilometers", label: "Kilometers" },
  { value: "feet", label: "Feet" },
  { value: "miles", label: "Miles" },
];

interface ToolError {
  message: string;
  code?: ProcessingErrorCode;
}

function errorFrom(cause: unknown, fallbackMessage: string): ToolError {
  if (cause instanceof ProcessingError) return { message: cause.message, code: cause.code };
  return { message: fallbackMessage };
}

export function GeoOperationTool({ operation }: { operation: GeoOperation }) {
  const spec = OPERATIONS[operation];
  const { file, geojson, bbox } = useGeoWorkspace();

  const [propertyKeys, setPropertyKeys] = useState<string[]>([]);
  const [result, setResult] = useState<GeometryOpOutcome | null>(null);
  const [error, setError] = useState<ToolError | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const [distance, setDistance] = useState(100);
  const [unit, setUnit] = useState<BufferUnit>("meters");
  const [property, setProperty] = useState("");

  // A newly-loaded file invalidates the previous run's result, and Dissolve's
  // attribute list has to come from the new file rather than the old one.
  useEffect(() => {
    if (!geojson || !spec.needsProperty) return;
    let cancelled = false;
    listPropertyKeys(geojson)
      .then((keys) => {
        if (!cancelled) setPropertyKeys(keys);
      })
      .catch(() => {
        if (!cancelled) setPropertyKeys([]);
      });
    return () => {
      cancelled = true;
    };
  }, [geojson, spec.needsProperty]);

  async function handleRun() {
    if (!geojson) return;
    setIsRunning(true);
    setResult(null);
    setError(null);
    try {
      setResult(await spec.run(geojson, { distance, unit, property }));
    } catch (cause) {
      setError(errorFrom(cause, `Could not ${spec.label.toLowerCase()} this data.`));
    } finally {
      setIsRunning(false);
    }
  }

  // The workspace above renders the drop zone and any load error; this tool
  // only appears once there is something to operate on.
  if (!geojson) return null;

  return (
    <div className="flex flex-col gap-4">
      {error && <ErrorPanel message={error.message} code={error.code} />}

      <fieldset className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4 text-sm dark:border-gray-800">
        <legend className="px-1 font-medium">{spec.label}</legend>
        <p className="text-gray-600 dark:text-gray-300">{spec.description}</p>

        {spec.needsDistance && (
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1">
              <span>Distance (negative shrinks)</span>
              <input
                type="number"
                step="any"
                value={distance}
                onChange={(event) => setDistance(Number(event.target.value))}
                className="w-40 rounded-md border border-gray-300 px-2 py-1 dark:border-gray-700 dark:bg-gray-900"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span>Units</span>
              <select
                value={unit}
                onChange={(event) => setUnit(event.target.value as BufferUnit)}
                className="rounded-md border border-gray-300 px-2 py-1 dark:border-gray-700 dark:bg-gray-900"
              >
                {BUFFER_UNITS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        {spec.needsProperty && (
          <label className="flex flex-col gap-1">
            <span>Dissolve by attribute (optional)</span>
            <select
              value={property}
              onChange={(event) => setProperty(event.target.value)}
              className="w-64 rounded-md border border-gray-300 px-2 py-1 dark:border-gray-700 dark:bg-gray-900"
            >
              <option value="">Dissolve everything touching</option>
              {propertyKeys.map((key) => (
                <option key={key} value={key}>
                  {key}
                </option>
              ))}
            </select>
          </label>
        )}

        <button
          type="button"
          onClick={() => void handleRun()}
          disabled={isRunning}
          className="inline-flex w-fit items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {isRunning ? `${spec.label}…` : spec.label}
        </button>
      </fieldset>

      <LazyGeoMap geojson={result?.geojson ?? geojson} bbox={bbox} />

      {result && file && (
        <div className="flex flex-col gap-3 rounded-lg border border-gray-200 p-4 dark:border-gray-800">
          <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-gray-500">Features in</dt>
              <dd className="text-lg font-semibold">{result.inputFeatureCount.toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Features out</dt>
              <dd className="text-lg font-semibold">{result.outputFeatureCount.toLocaleString()}</dd>
            </div>
          </div>

          {result.warnings.length > 0 && (
            <ul className="flex flex-col gap-1 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
              {result.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          )}

          <DownloadResult
            filename={deriveOutputFilename(file.name, "geojson").replace(
              /\.geojson$/,
              `-${spec.outputSuffix}.geojson`
            )}
            blob={new Blob([JSON.stringify(result.geojson, null, 2)], { type: "application/geo+json" })}
            label={`Download ${spec.label.toLowerCase()} result`}
          />
        </div>
      )}
    </div>
  );
}

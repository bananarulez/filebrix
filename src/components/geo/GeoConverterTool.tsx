"use client";

import { useEffect, useState } from "react";
import { ProcessingStatus } from "@/components/tools/ProcessingStatus";
import { ErrorPanel } from "@/components/tools/ErrorPanel";
import { DownloadResult } from "@/components/tools/DownloadResult";
import { formatBytes } from "@/lib/format/bytes";
import { deriveOutputFilename } from "@/lib/format/deriveOutputFilename";
import { ProcessingError, type ProcessingErrorCode } from "@/lib/errors/ProcessingError";
import { geoJsonToCsv, parseGeoJsonFile } from "@/engines/geospatial";
import { useGeoWorkspace } from "./GeoWorkspace";

const LARGE_FILE_THRESHOLD_BYTES = 20 * 1024 * 1024;

export type GeoConversionKind =
  | "kml-to-geojson"
  | "geojson-to-kml"
  | "gpx-to-geojson"
  | "gpx-to-kml"
  | "geojson-to-csv";

interface ConversionConfig {
  sourceLabel: string;
  accept: string;
  outputExtension: string;
  convert: (file: File) => Promise<{ blob: Blob; warnings?: string[] }>;
}

function geoJsonBlob(geojson: unknown): Blob {
  return new Blob([JSON.stringify(geojson, null, 2)], { type: "application/geo+json" });
}

const CONFIGS: Record<GeoConversionKind, ConversionConfig> = {
  "kml-to-geojson": {
    sourceLabel: "a .kml",
    accept: ".kml",
    outputExtension: "geojson",
    convert: async (file) => {
      const { kmlTextToGeoJson } = await import("@/engines/geospatial/xml/kml");
      const geojson = await kmlTextToGeoJson(await file.text());
      return { blob: geoJsonBlob(geojson) };
    },
  },
  "geojson-to-kml": {
    sourceLabel: "a .geojson or .json",
    accept: ".geojson,.json",
    outputExtension: "kml",
    convert: async (file) => {
      const [geojson, { geoJsonToKmlText }] = await Promise.all([
        parseGeoJsonFile(file),
        import("@/engines/geospatial/xml/kml"),
      ]);
      const kml = geoJsonToKmlText(geojson);
      return { blob: new Blob([kml], { type: "application/vnd.google-earth.kml+xml" }) };
    },
  },
  "gpx-to-geojson": {
    sourceLabel: "a .gpx",
    accept: ".gpx",
    outputExtension: "geojson",
    convert: async (file) => {
      const { gpxTextToGeoJson } = await import("@/engines/geospatial/xml/gpx");
      const geojson = await gpxTextToGeoJson(await file.text());
      return { blob: geoJsonBlob(geojson) };
    },
  },
  "gpx-to-kml": {
    sourceLabel: "a .gpx",
    accept: ".gpx",
    outputExtension: "kml",
    convert: async (file) => {
      const [{ gpxTextToGeoJson }, { geoJsonToKmlText }] = await Promise.all([
        import("@/engines/geospatial/xml/gpx"),
        import("@/engines/geospatial/xml/kml"),
      ]);
      const geojson = await gpxTextToGeoJson(await file.text());
      const kml = geoJsonToKmlText(geojson);
      return { blob: new Blob([kml], { type: "application/vnd.google-earth.kml+xml" }) };
    },
  },
  "geojson-to-csv": {
    sourceLabel: "a .geojson or .json",
    accept: ".geojson,.json",
    outputExtension: "csv",
    convert: async (file) => {
      const geojson = await parseGeoJsonFile(file);
      return geoJsonToCsv(geojson);
    },
  },
};

interface ToolError {
  message: string;
  code?: ProcessingErrorCode;
}

function errorFrom(cause: unknown, fallbackMessage: string): ToolError {
  if (cause instanceof ProcessingError) return { message: cause.message, code: cause.code };
  return { message: fallbackMessage };
}

/**
 * Powers every simple drop-file → convert → download geo tool (KML↔GeoJSON,
 * GPX→GeoJSON, GPX→KML, GeoJSON→CSV) — only `kind` differs per tool page,
 * a `CONFIGS` record keyed by source/target format rather than a function
 * prop (functions can't cross the Server->Client Component boundary a page
 * renders across). CSV→GeoJSON needs an extra column-picking step and gets
 * its own component instead.
 */
export function GeoConverterTool({ kind }: { kind: GeoConversionKind }) {
  const config = CONFIGS[kind];
  const { file } = useGeoWorkspace();
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<ToolError | null>(null);

  /**
   * Converts as soon as a file is loaded, matching the previous behaviour
   * (the old drop zone converted on drop). These converters read the raw
   * `File` rather than the workspace's normalized GeoJSON, because their
   * whole job is a format-to-format translation — going through the
   * normalized form would lose the source document's own structure.
   */
  // Derived rather than stored: see fix note in GeoWorkspace's documentKey.
  const isConverting = !resultBlob && !error;

  useEffect(() => {
    if (!file) return;

    let cancelled = false;
    config
      .convert(file)
      .then(({ blob, warnings: conversionWarnings }) => {
        if (cancelled) return;
        setResultBlob(blob);
        setWarnings(conversionWarnings ?? []);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(errorFrom(cause, "Could not convert this file."));
      })
    return () => {
      cancelled = true;
    };
  }, [file, config]);

  if (!file) return null;

  return (
    <div className="flex flex-col gap-4">
      {file.size > LARGE_FILE_THRESHOLD_BYTES && !error && (
        <p className="text-sm text-amber-700 dark:text-amber-400">
          Large file detected — {formatBytes(file.size)}. This may take a moment to process locally.
        </p>
      )}

      {isConverting && <ProcessingStatus state="converting" />}
      {error && <ErrorPanel message={error.message} code={error.code} />}

      {resultBlob && (
        <div className="flex flex-col gap-3">
          {warnings.length > 0 && (
            <ul className="flex flex-col gap-1 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          )}
          <DownloadResult
            filename={deriveOutputFilename(file.name, config.outputExtension)}
            blob={resultBlob}
            label={`Download .${config.outputExtension}`}
          />
        </div>
      )}
    </div>
  );
}
